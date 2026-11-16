/**
 * src/gateway/paymentService.ts
 *
 * IntegralPayments — core payment orchestration service.
 *
 * This is the main facade consumed by the ERP/CRM plugin modules
 * (Dolibarr, Odoo, Tryton).  It coordinates the Pyth oracle client
 * and the Cardano transaction builder into a single, clean API:
 *
 *   service.createPaymentRequest(...)  → builds + submits the lock tx
 *   service.settlePayment(...)         → fetches price + builds + submits collect tx
 *   service.getPaymentStatus(...)      → queries the chain for UTxO state
 *   service.estimateLovelace(...)      → quotes the current price without transacting
 *   service.startPriceStream(...)      → opens an SSE price feed for the UI
 *
 * The service owns the Lucid instance and is responsible for wallet
 * management.  ERP modules interact exclusively through this interface
 * and never touch Lucid or the Pyth client directly.
 *
 * Dependencies:
 *   @lucid-evolution/lucid  v0.4.x
 *   @pythnetwork/hermes-client  latest
 */

import {
  Blockfrost,
  Lucid,
  type UTxO,
} from "@lucid-evolution/lucid";
import { PythClient, PythClientError } from "../oracle/pythClient.js";
import { CardanoTransactionBuilder } from "../cardano/transaction.js";
import type {
  CollectResult,
  GatewayConfig,
  LockResult,
  PaymentDatum,
  PaymentRequest,
  PaymentStatus,
  ResolvedPrice,
  SupportedFeed,
} from "../types.js";
import { FEED_IDS } from "../config.js";

// ---------------------------------------------------------------------------
// PaymentService
// ---------------------------------------------------------------------------

export class PaymentService {
  private readonly config: GatewayConfig;
  private readonly pythClient: PythClient;
  private lucid!: Lucid;
  private txBuilder!: CardanoTransactionBuilder;

  /** In-memory payment request store.  Replace with a database in production. */
  private readonly requests = new Map<string, PaymentRequest>();

  private constructor(config: GatewayConfig, pythClient: PythClient) {
    this.config = config;
    this.pythClient = pythClient;
  }

  // -------------------------------------------------------------------------
  // Factory (async construction)
  // -------------------------------------------------------------------------

  /**
   * Create and fully initialise a `PaymentService`.
   *
   * Must be called once before any other method.  Establishes the Lucid
   * instance connected to Blockfrost and validates the configuration.
   *
   * @param config  Loaded gateway configuration
   * @param seed    BIP-39 mnemonic for the service wallet
   *                (generates the address that pays transaction fees and
   *                 creates the lock UTxOs on behalf of the ERP)
   */
  static async create(
    config: GatewayConfig,
    seed: string,
  ): Promise<PaymentService> {
    const pythClient = new PythClient(config);
    const service = new PaymentService(config, pythClient);
    await service.init(seed);
    return service;
  }

  private async init(seed: string): Promise<void> {
    this.lucid = await Lucid(
      new Blockfrost(this.config.blockfrostUrl, this.config.blockfrostApiKey),
      this.config.network,
    );
    this.lucid.selectWallet.fromSeed(seed);
    this.txBuilder = new CardanoTransactionBuilder(
      this.lucid,
      this.config,
      this.pythClient,
    );

    console.log(
      `[PaymentService] Initialised on ${this.config.network}. ` +
        `Validator address: ${this.txBuilder.getValidatorAddress()}`,
    );
  }

  // -------------------------------------------------------------------------
  // Core payment operations
  // -------------------------------------------------------------------------

  /**
   * Create a new payment request for an ERP invoice.
   *
   * 1. Generates a unique `paymentId` from the ERP invoice reference.
   * 2. Locks a UTxO at the validator address with the invoice datum.
   * 3. Stores the request in the in-memory registry.
   * 4. Returns the lock transaction hash and UTxO reference.
   *
   * The ERP module should persist the returned `utxoRef` alongside the
   * invoice record so the payment can be settled or queried later.
   *
   * @param invoiceRef       ERP invoice reference (used to generate paymentId)
   * @param merchantAddress  Bech32 merchant wallet address
   * @param invoiceUsdCents  Invoice total in US-cent integer units
   * @param acceptedFeed     Pyth feed name for the accepted cryptocurrency
   * @param customerAddress  Bech32 customer wallet address
   */
  async createPaymentRequest(
    invoiceRef: string,
    merchantAddress: string,
    invoiceUsdCents: number,
    acceptedFeed: SupportedFeed,
    customerAddress: string,
  ): Promise<{ request: PaymentRequest; lockResult: LockResult }> {
    // Derive paymentId from ERP invoice ref + timestamp for uniqueness
    const paymentId = this.derivePaymentId(invoiceRef);

    // Resolve the customer's verification key hash from their address
    const customerPkh = this.lucid.utils
      .getAddressDetails(customerAddress)
      .paymentCredential?.hash ?? "";
    if (!customerPkh) {
      throw new PaymentServiceError(
        `Could not extract PKH from customer address: ${customerAddress}`,
        "INVALID_ADDRESS",
      );
    }

    const datum: PaymentDatum = {
      paymentId,
      merchantAddress,
      invoiceUsdCents,
      acceptedFeedId: FEED_IDS[acceptedFeed],
      customerPkh,
      createdAt: Math.floor(Date.now() / 1000),
    };

    let lockResult: LockResult;
    try {
      lockResult = await this.txBuilder.buildLockTx(datum);
    } catch (err) {
      throw new PaymentServiceError(
        `Failed to submit lock transaction: ${String(err)}`,
        "LOCK_TX_FAILED",
      );
    }

    const request: PaymentRequest = {
      datum,
      utxoRef: lockResult.utxoRef,
      status: "locked",
      updatedAt: new Date().toISOString(),
    };
    this.requests.set(paymentId, request);

    return { request, lockResult };
  }

  /**
   * Settle a payment request by spending the locked UTxO.
   *
   * This is called once the customer has initiated payment via their
   * Cardano wallet.  The service:
   *   1. Looks up the locked UTxO on-chain.
   *   2. Fetches a fresh Pyth price proof.
   *   3. Builds and submits the collect transaction.
   *   4. Updates the request status to "settling".
   *
   * The ERP module should poll `getPaymentStatus` until the status
   * transitions to "settled".
   *
   * @param paymentId     The paymentId from the original request
   * @param customerSeed  BIP-39 mnemonic of the customer's wallet
   *                      (used to add the required extra signatory)
   */
  async settlePayment(
    paymentId: string,
    customerSeed: string,
  ): Promise<CollectResult> {
    const request = this.requests.get(paymentId);
    if (!request) {
      throw new PaymentServiceError(
        `Payment request not found: ${paymentId}`,
        "NOT_FOUND",
      );
    }
    if (request.status !== "locked") {
      throw new PaymentServiceError(
        `Cannot settle a payment in status "${request.status}"`,
        "INVALID_STATUS",
      );
    }

    // Switch to the customer's wallet for signing
    this.lucid.selectWallet.fromSeed(customerSeed);

    // Find the UTxO on-chain
    const utxo = await this.txBuilder.findPaymentUtxo(paymentId);
    if (!utxo) {
      this.updateStatus(paymentId, "expired");
      throw new PaymentServiceError(
        `UTxO for payment ${paymentId} not found on-chain — may have expired`,
        "UTXO_NOT_FOUND",
      );
    }

    let collectResult: CollectResult;
    try {
      collectResult = await this.txBuilder.buildCollectTx(
        utxo,
        request.datum,
      );
    } catch (err) {
      if (err instanceof PythClientError) {
        throw new PaymentServiceError(
          `Oracle error during settlement: ${err.message}`,
          "ORACLE_ERROR",
        );
      }
      this.updateStatus(paymentId, "failed");
      throw new PaymentServiceError(
        `Collect transaction failed: ${String(err)}`,
        "COLLECT_TX_FAILED",
      );
    }

    this.updateStatus(paymentId, "settling");
    return collectResult;
  }

  /**
   * Confirm a settled payment after on-chain confirmation.
   *
   * Call this once the ERP module has verified the collect transaction
   * is included in a block (e.g. via a Blockfrost webhook or polling).
   */
  confirmSettlement(paymentId: string): void {
    this.updateStatus(paymentId, "settled");
    console.log(`[PaymentService] Payment ${paymentId} confirmed as settled.`);
  }

  // -------------------------------------------------------------------------
  // Price estimation
  // -------------------------------------------------------------------------

  /**
   * Estimate how many lovelace a given USD invoice would cost right now.
   *
   * Does NOT submit any transaction.  Use this to display the crypto
   * equivalent on the ERP invoice before the customer confirms.
   *
   * @param invoiceUsdCents  Invoice total in US-cent integer units
   * @param feed             Pyth feed for the target cryptocurrency
   * @returns                Estimated lovelace amount and the price snapshot
   */
  async estimateLovelace(
    invoiceUsdCents: number,
    feed: SupportedFeed,
  ): Promise<{ lovelace: bigint; price: ResolvedPrice }> {
    const price = await this.pythClient.getLatestPrice(feed);
    const lovelace = this.pythClient.computeRequiredLovelace(
      price,
      invoiceUsdCents,
    );
    return { lovelace, price };
  }

  /**
   * Return all prices currently held in the oracle cache.
   * Useful for displaying a live price ticker in the ERP UI.
   */
  async getAllPrices(): Promise<Map<string, ResolvedPrice>> {
    return this.pythClient.refreshAllFeeds();
  }

  // -------------------------------------------------------------------------
  // Streaming
  // -------------------------------------------------------------------------

  /**
   * Open an SSE connection to Hermes and push live price updates to `onUpdate`.
   * Call `stopPriceStream()` when the ERP UI session closes.
   */
  async startPriceStream(
    feeds: SupportedFeed[],
    onUpdate: (price: ResolvedPrice) => void,
  ): Promise<void> {
    await this.pythClient.startStream(feeds, onUpdate);
  }

  stopPriceStream(): void {
    this.pythClient.stopStream();
  }

  // -------------------------------------------------------------------------
  // Status query
  // -------------------------------------------------------------------------

  getPaymentRequest(paymentId: string): PaymentRequest | undefined {
    return this.requests.get(paymentId);
  }

  /**
   * Query the on-chain state of a payment request.
   *
   * - If the UTxO is still present at the validator → "locked"
   * - If the UTxO is gone and we have a collect tx hash  → "settled"
   * - If enough time has passed without settlement       → "expired"
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    const request = this.requests.get(paymentId);
    if (!request) return "failed";

    // If already in a terminal state, don't re-query
    if (["settled", "failed", "expired"].includes(request.status)) {
      return request.status;
    }

    const utxo = await this.txBuilder.findPaymentUtxo(paymentId);
    if (!utxo) {
      // UTxO is gone — either settled or expired
      const ageMinutes =
        (Date.now() / 1000 - request.datum.createdAt) / 60;
      const newStatus: PaymentStatus = ageMinutes > 30 ? "expired" : "settled";
      this.updateStatus(paymentId, newStatus);
      return newStatus;
    }

    return "locked";
  }

  /**
   * Return all payment requests along with their current status.
   * Used by ERP modules to populate the payments dashboard.
   */
  getAllRequests(): PaymentRequest[] {
    return Array.from(this.requests.values());
  }

  // -------------------------------------------------------------------------
  // Wallet management
  // -------------------------------------------------------------------------

  /**
   * Return the service wallet's bech32 address.
   * Needed by the ERP module to display a receiving address for the
   * lock-transaction ADA deposit.
   */
  async getServiceWalletAddress(): Promise<string> {
    return this.lucid.wallet().address();
  }

  /**
   * Return the validator address where payment UTxOs are locked.
   */
  getValidatorAddress(): string {
    return this.txBuilder.getValidatorAddress();
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Derive a deterministic 32-byte payment id from an ERP invoice reference.
   * Uses a simple hex encoding; replace with a proper hash (e.g. Blake2b-256)
   * in production so that the payment id is a fixed 32 bytes regardless of
   * invoice ref length.
   */
  private derivePaymentId(invoiceRef: string): string {
    return Buffer.from(invoiceRef, "utf8").toString("hex").padEnd(64, "0").slice(0, 64);
  }

  private updateStatus(paymentId: string, status: PaymentStatus): void {
    const req = this.requests.get(paymentId);
    if (req) {
      req.status = status;
      req.updatedAt = new Date().toISOString();
    }
  }
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export type PaymentServiceErrorCode =
  | "INVALID_ADDRESS"
  | "LOCK_TX_FAILED"
  | "COLLECT_TX_FAILED"
  | "NOT_FOUND"
  | "INVALID_STATUS"
  | "UTXO_NOT_FOUND"
  | "ORACLE_ERROR"
  | "INIT_FAILED";

export class PaymentServiceError extends Error {
  constructor(
    message: string,
    public readonly code: PaymentServiceErrorCode,
  ) {
    super(message);
    this.name = "PaymentServiceError";
  }
}
