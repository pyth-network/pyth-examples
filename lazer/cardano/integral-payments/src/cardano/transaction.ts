/**
 * src/cardano/transaction.ts
 *
 * Cardano transaction builder for IntegralPayments.
 *
 * Exposes two public functions:
 *  - `buildLockTx`    — creates the payment-request UTxO at the validator
 *  - `buildCollectTx` — settles an invoice by spending the validator UTxO
 *
 * Both functions return a signed `TxSigned` object ready to be submitted
 * to the Cardano network.  Submission is handled by `paymentService.ts`.
 *
 * This module is intentionally stateless: it receives all required context
 * (lucid instance, validator, UTxO references, price proof) as parameters
 * and produces a deterministic transaction for any given input set.
 *
 * Dependencies:
 *   @lucid-evolution/lucid  v0.4.x
 */

import {
  type Lucid,
  type SpendingValidator,
  type UTxO,
  Data,
  Constr,
  toHex,
  fromHex,
} from "@lucid-evolution/lucid";
import type {
  CollectResult,
  GatewayConfig,
  LockResult,
  PaymentDatum,
  PaymentRedeemer,
  ResolvedPrice,
} from "../types.js";
import { PythClient } from "../oracle/pythClient.js";

// ---------------------------------------------------------------------------
// Plutus Data schemas
// Mirrors the on-chain Aiken types using Lucid's `Data` encoding.
//
// Cardano/Plutus Data encoding rules for Aiken records:
//   - A record type is encoded as Constr(0, [...fields in declaration order])
//   - ByteArray -> hex string in Lucid
//   - Int       -> BigInt in Lucid
//   - Bool      -> Constr(1,[]) for True, Constr(0,[]) for False
//   - Address   -> Constr(0, [Constr(0,[pkh]), Constr(1,[Constr(0,[Constr(0,[pkh])])])]) for
//                  a base address with staking credential, or simplified for enterprise
// ---------------------------------------------------------------------------

/**
 * Encode a `PaymentDatum` into Plutus Data (Constr 0).
 *
 * Field order must exactly match the Aiken type declaration:
 *   payment_id, merchant_address, invoice_usd_cents,
 *   accepted_feed_id, customer_pkh, created_at
 */
function encodeDatum(datum: PaymentDatum): string {
  // Encode merchant address as a Cardano payment credential.
  // For an enterprise address (no staking), the Plutus encoding is:
  //   Address { payment_credential: VerificationKey(pkh), staking_credential: None }
  // = Constr(0, [Constr(0, [pkh_bytes]), Constr(1, [])]) — None = Constr(1,[])
  const merchantPkh = addressToPkh(datum.merchantAddress);
  const merchantAddressData = new Constr(0, [
    new Constr(0, [merchantPkh]),   // VerificationKey credential
    new Constr(1, []),               // staking_credential = None
  ]);

  return Data.to(
    new Constr(0, [
      datum.paymentId,              // ByteArray
      merchantAddressData,          // Address
      BigInt(datum.invoiceUsdCents),// Int
      datum.acceptedFeedId,         // ByteArray
      datum.customerPkh,            // VerificationKeyHash (ByteArray)
      BigInt(datum.createdAt),      // Int
    ]),
  );
}

/**
 * Encode a `PaymentRedeemer` into Plutus Data (Constr 0).
 *
 * Field order must exactly match the Aiken type:
 *   proof: PriceProof, now_seconds: Int
 *
 * PriceProof field order:
 *   feed_id, price, conf, exponent, publish_time, signature, signer_key
 */
function encodeRedeemer(redeemer: PaymentRedeemer): string {
  const p = redeemer.proof;

  const proofData = new Constr(0, [
    p.feedId,                      // ByteArray
    p.price,                       // Int (bigint)
    p.conf,                        // Int (bigint)
    BigInt(p.exponent),            // Int
    BigInt(p.publishTime),         // Int
    p.signature,                   // ByteArray
    p.signerKey,                   // ByteArray
  ]);

  return Data.to(
    new Constr(0, [
      proofData,                   // PriceProof
      BigInt(redeemer.nowSeconds), // Int
    ]),
  );
}

// ---------------------------------------------------------------------------
// Address utilities
// ---------------------------------------------------------------------------

/**
 * Extract the payment key hash (hex) from a bech32 Cardano address.
 * Lucid provides `lucid.utils.getAddressDetails` for this purpose.
 */
function addressToPkh(bech32Address: string): string {
  // This function is called from the transaction builder where `lucid` is
  // available.  The actual extraction is done inline in buildLockTx using
  // lucid.utils.getAddressDetails so we can access the Lucid instance.
  // This stub is here for documentation purposes.
  throw new Error(
    "addressToPkh must be called via lucid.utils.getAddressDetails",
  );
}

/** Encode address using the Lucid instance for proper network-aware parsing. */
function encodeAddress(lucid: Lucid, bech32Address: string): Constr<unknown> {
  const details = lucid.utils.getAddressDetails(bech32Address);
  const pkh = details.paymentCredential?.hash ?? "";

  const paymentCred =
    details.paymentCredential?.type === "Script"
      ? new Constr(1, [pkh]) // Script credential
      : new Constr(0, [pkh]); // VerificationKey credential

  const stakingCred =
    details.stakeCredential
      ? new Constr(0, [
          new Constr(0, [
            new Constr(0, [details.stakeCredential.hash]),
          ]),
        ])
      : new Constr(1, []); // None

  return new Constr(0, [paymentCred, stakingCred]);
}

/** Re-implementation of encodeDatum that uses the Lucid instance for address encoding. */
function encodeDatumWithLucid(lucid: Lucid, datum: PaymentDatum): string {
  const merchantAddressData = encodeAddress(lucid, datum.merchantAddress);

  return Data.to(
    new Constr(0, [
      datum.paymentId,
      merchantAddressData,
      BigInt(datum.invoiceUsdCents),
      datum.acceptedFeedId,
      datum.customerPkh,
      BigInt(datum.createdAt),
    ]),
  );
}

// ---------------------------------------------------------------------------
// Transaction builder
// ---------------------------------------------------------------------------

export class CardanoTransactionBuilder {
  private readonly lucid: Lucid;
  private readonly validator: SpendingValidator;
  private readonly validatorAddress: string;
  private readonly config: GatewayConfig;
  private readonly pythClient: PythClient;

  constructor(
    lucid: Lucid,
    config: GatewayConfig,
    pythClient: PythClient,
  ) {
    this.lucid = lucid;
    this.config = config;
    this.pythClient = pythClient;

    this.validator = {
      type: "PlutusV3",
      script: config.validatorCbor,
    };
    this.validatorAddress =
      lucid.utils.validatorToAddress(this.validator);
  }

  /** Expose the computed validator address for use by other modules. */
  getValidatorAddress(): string {
    return this.validatorAddress;
  }

  // -------------------------------------------------------------------------
  // Lock transaction
  // -------------------------------------------------------------------------

  /**
   * Build, sign, and submit a "lock" transaction that creates a payment-
   * request UTxO at the validator address.
   *
   * The UTxO carries:
   *   - An inline `PaymentDatum` recording the invoice details.
   *   - `config.minDepositLovelace` ADA to satisfy the minimum UTxO requirement.
   *
   * The merchant's service wallet signs and submits this transaction on behalf
   * of the invoice creation event from the ERP module.
   *
   * @param datum   Full payment datum for this invoice
   * @returns       LockResult containing the txHash and UTxO reference
   */
  async buildLockTx(datum: PaymentDatum): Promise<LockResult> {
    const encodedDatum = encodeDatumWithLucid(this.lucid, datum);

    const tx = await this.lucid
      .newTx()
      .pay.ToContract(
        this.validatorAddress,
        { inline: encodedDatum },
        { lovelace: this.config.minDepositLovelace },
      )
      .complete();

    const signed = await tx.sign.withWallet().complete();
    const txHash = await signed.submit();

    // The new UTxO will be at index 0 of the transaction outputs
    // (the lock output is the first explicit pay.ToContract call).
    // In production, confirm this by querying the UTxO set after submission.
    const utxoRef = `${txHash}#0`;

    console.log(`[CardanoTx] Lock tx submitted: ${txHash}`);
    return { txHash, utxoRef };
  }

  // -------------------------------------------------------------------------
  // Collect transaction
  // -------------------------------------------------------------------------

  /**
   * Build, sign, and submit a "collect" (settle) transaction that:
   *   1. Fetches the latest Pyth price for the invoice's accepted feed.
   *   2. Computes the exact lovelace amount required to cover the invoice.
   *   3. Spends the locked UTxO by providing the price proof as a redeemer.
   *   4. Sends the computed lovelace to the merchant's address.
   *   5. Returns the deposit UTxO lovelace back to the customer as change
   *      (Lucid handles change output automatically).
   *
   * The customer's wallet MUST be selected on the Lucid instance before
   * calling this function.  The transaction requires the customer's signature
   * as an extra signatory (enforced by the on-chain validator).
   *
   * @param lockedUtxo   The UTxO locked at the validator (from buildLockTx)
   * @param datum        The payment datum matching the locked UTxO
   * @returns            CollectResult with tx hash and settlement details
   */
  async buildCollectTx(
    lockedUtxo: UTxO,
    datum: PaymentDatum,
  ): Promise<CollectResult> {
    // 1. Fetch the live Pyth price proof
    const feedName = this.feedIdToName(datum.acceptedFeedId);
    const resolved = await this.pythClient.getLatestPrice(feedName as never);

    // 2. Compute the required lovelace amount
    const required = this.pythClient.computeRequiredLovelace(
      resolved,
      datum.invoiceUsdCents,
    );

    console.log(
      `[CardanoTx] Invoice ${datum.paymentId}: ` +
        `$${(datum.invoiceUsdCents / 100).toFixed(2)} USD → ` +
        `${required.toLocaleString()} lovelace ` +
        `@ ${resolved.priceFloat.toFixed(6)} ${feedName}`,
    );

    // 3. Build the redeemer
    const nowSeconds = Math.floor(Date.now() / 1000);
    const redeemer: PaymentRedeemer = {
      proof: resolved.proof,
      nowSeconds,
    };
    const encodedRedeemer = encodeRedeemer(redeemer);

    // 4. Build the transaction
    //
    //    Key requirements enforced here:
    //    - .collectFrom([lockedUtxo], redeemer)  — spends the validator UTxO
    //    - .attach.SpendingValidator(validator)   — attaches compiled script
    //    - .pay.ToAddress(merchant, lovelace)     — pays the merchant
    //    - .addSigner(customerAddress)            — adds customer as extra signatory
    //    - .validFrom(now - 30s)                  — tight validity interval
    //    - .validTo(now + 60s)                    — must confirm within 60 s
    //
    //    The validity interval is critical: the on-chain `now_seconds`
    //    redeemer field must fall within the tx's validity range so that
    //    the block-producing node's time check passes deterministically.

    const slotConfig = await this.lucid.currentSlot();
    const validFromSlot = slotConfig - 30; // 30-second back window
    const validToSlot = slotConfig + 60;   // 60-second forward window

    const tx = await this.lucid
      .newTx()
      .collectFrom([lockedUtxo], encodedRedeemer)
      .attach.SpendingValidator(this.validator)
      .pay.ToAddress(datum.merchantAddress, { lovelace: required })
      .addSigner(await this.getCustomerAddress())
      .validFrom(validFromSlot)
      .validTo(validToSlot)
      .complete();

    const signed = await tx.sign.withWallet().complete();
    const txHash = await signed.submit();

    console.log(`[CardanoTx] Collect tx submitted: ${txHash}`);

    return {
      txHash,
      paidLovelace: required,
      priceUsed: resolved,
    };
  }

  // -------------------------------------------------------------------------
  // UTxO helpers
  // -------------------------------------------------------------------------

  /**
   * Fetch all UTxOs currently locked at the validator address.
   * Used by the gateway service to scan for pending payment requests.
   */
  async getValidatorUtxos(): Promise<UTxO[]> {
    return this.lucid.utxosAt(this.validatorAddress);
  }

  /**
   * Find the locked UTxO for a specific payment id.
   *
   * @param paymentId  The hex payment id from the datum
   * @returns          The matching UTxO, or undefined if not found
   */
  async findPaymentUtxo(paymentId: string): Promise<UTxO | undefined> {
    const utxos = await this.getValidatorUtxos();
    return utxos.find((utxo) => {
      if (!utxo.datum) return false;
      try {
        // Attempt to decode and match the payment id field
        const decoded = Data.from(utxo.datum);
        if (!(decoded instanceof Constr)) return false;
        const fields = decoded.fields as unknown[];
        // Field 0 is payment_id (ByteArray = hex string in Lucid)
        return fields[0] === paymentId;
      } catch {
        return false;
      }
    });
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private feedIdToName(feedId: string): string {
    const names: Record<string, string> = {
      "2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d": "ADA/USD",
      "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43": "BTC/USD",
      "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace": "ETH/USD",
      "eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a": "USDC/USD",
    };
    const name = names[feedId];
    if (!name) throw new Error(`Unknown feed id: ${feedId}`);
    return name;
  }

  private async getCustomerAddress(): Promise<string> {
    const addr = await this.lucid.wallet().address();
    return addr;
  }
}
