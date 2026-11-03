/**
 * src/tests/paymentService.test.ts
 *
 * Unit tests for src/gateway/paymentService.ts
 *
 * Uses Vitest with full mocking of Lucid Evolution and PythClient so the
 * service logic can be tested without a live Cardano node or oracle.
 *
 * Run:  npm test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  PaymentService,
  PaymentServiceError,
} from "../gateway/paymentService.js";
import type { GatewayConfig } from "../types.js";

// ---------------------------------------------------------------------------
// Test configuration
// ---------------------------------------------------------------------------

const TEST_CONFIG: GatewayConfig = {
  network: "Preprod",
  blockfrostApiKey: "preprod_test",
  blockfrostUrl: "https://cardano-preprod.blockfrost.io/api/v0",
  hermesUrl: "https://hermes.pyth.network",
  validatorCbor: "59010f010000deadbeef",
  trustedSignerKey:
    "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a",
  toleranceBps: 50,
  maxPriceAgeSeconds: 60,
  minDepositLovelace: 2_000_000n,
};

const MERCHANT_ADDRESS =
  "addr_test1qz0k5q4vscx9l5mzsn0y99kfqajlm8ljpszf0gn9rg70hfpflxlwfvj9k84y0hmhv2kxq3h9h8jkmx2kjyp4gst6pxqsxdg56n";
const CUSTOMER_ADDRESS =
  "addr_test1qr0vj9vswz3chnkfe8ywl5zq8fxzjh97emajmxcq0gxpnqhvj63jy0nq7j7x5c4ys4x3fwrjlhnkj7spf6xp0c3rjsqdnqmgq";

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

const mockBuildLockTx = vi.fn();
const mockBuildCollectTx = vi.fn();
const mockFindPaymentUtxo = vi.fn();
const mockGetValidatorAddress = vi.fn().mockReturnValue(
  "addr_test1w_validator_address",
);

vi.mock("../cardano/transaction.js", () => ({
  CardanoTransactionBuilder: vi.fn().mockImplementation(() => ({
    buildLockTx: mockBuildLockTx,
    buildCollectTx: mockBuildCollectTx,
    findPaymentUtxo: mockFindPaymentUtxo,
    getValidatorAddress: mockGetValidatorAddress,
    getValidatorUtxos: vi.fn().mockResolvedValue([]),
  })),
}));

const mockGetLatestPrice = vi.fn();
const mockComputeRequiredLovelace = vi.fn().mockReturnValue(28_571_428n);
const mockRefreshAllFeeds = vi.fn().mockResolvedValue(new Map());

vi.mock("../oracle/pythClient.js", () => ({
  PythClient: vi.fn().mockImplementation(() => ({
    getLatestPrice: mockGetLatestPrice,
    computeRequiredLovelace: mockComputeRequiredLovelace,
    refreshAllFeeds: mockRefreshAllFeeds,
    startStream: vi.fn(),
    stopStream: vi.fn(),
    applyTolerance: vi.fn((v: bigint) => v),
  })),
  PythClientError: class PythClientError extends Error {
    constructor(message: string, public code: string) { super(message); }
  },
}));

vi.mock("@lucid-evolution/lucid", () => ({
  Lucid: vi.fn().mockResolvedValue({
    selectWallet: {
      fromSeed: vi.fn(),
    },
    wallet: vi.fn().mockReturnValue({
      address: vi.fn().mockResolvedValue(CUSTOMER_ADDRESS),
    }),
    utils: {
      getAddressDetails: vi.fn().mockReturnValue({
        paymentCredential: {
          type: "Key",
          hash: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        },
      }),
      validatorToAddress: vi.fn().mockReturnValue("addr_test1w_validator_address"),
    },
  }),
  Blockfrost: vi.fn().mockImplementation(() => ({})),
}));

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("PaymentService.createPaymentRequest", () => {
  let service: PaymentService;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockBuildLockTx.mockResolvedValue({
      txHash: "abc123",
      utxoRef: "abc123#0",
    });
    service = await PaymentService.create(TEST_CONFIG, "test seed phrase here");
  });

  it("creates a payment request and returns a lock result", async () => {
    const { request, lockResult } = await service.createPaymentRequest(
      "INV-2024-001",
      MERCHANT_ADDRESS,
      1000, // $10.00
      "ADA/USD",
      CUSTOMER_ADDRESS,
    );

    expect(lockResult.txHash).toBe("abc123");
    expect(lockResult.utxoRef).toBe("abc123#0");
    expect(request.status).toBe("locked");
    expect(request.datum.invoiceUsdCents).toBe(1000);
    expect(request.datum.merchantAddress).toBe(MERCHANT_ADDRESS);
  });

  it("stores the request so it can be queried by paymentId", async () => {
    const { request } = await service.createPaymentRequest(
      "INV-2024-002",
      MERCHANT_ADDRESS,
      500,
      "ADA/USD",
      CUSTOMER_ADDRESS,
    );

    const fetched = service.getPaymentRequest(request.datum.paymentId);
    expect(fetched).toBeDefined();
    expect(fetched?.status).toBe("locked");
  });

  it("throws LOCK_TX_FAILED when the lock transaction is rejected", async () => {
    mockBuildLockTx.mockRejectedValueOnce(new Error("Insufficient UTxOs"));

    await expect(
      service.createPaymentRequest(
        "INV-2024-003",
        MERCHANT_ADDRESS,
        100,
        "ADA/USD",
        CUSTOMER_ADDRESS,
      ),
    ).rejects.toMatchObject({ code: "LOCK_TX_FAILED" });
  });
});

// ---------------------------------------------------------------------------

describe("PaymentService.settlePayment", () => {
  let service: PaymentService;
  let paymentId: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockBuildLockTx.mockResolvedValue({ txHash: "lock_tx_hash", utxoRef: "lock_tx_hash#0" });
    mockBuildCollectTx.mockResolvedValue({
      txHash: "collect_tx_hash",
      paidLovelace: 28_571_428n,
      priceUsed: { priceFloat: 0.35, ageSeconds: 5 },
    });
    mockFindPaymentUtxo.mockResolvedValue({ txHash: "lock_tx_hash", outputIndex: 0 });

    service = await PaymentService.create(TEST_CONFIG, "test seed phrase here");

    const { request } = await service.createPaymentRequest(
      "INV-SETTLE-001",
      MERCHANT_ADDRESS,
      1000,
      "ADA/USD",
      CUSTOMER_ADDRESS,
    );
    paymentId = request.datum.paymentId;
  });

  it("settles a locked payment and returns collect result", async () => {
    const result = await service.settlePayment(paymentId, "customer seed phrase");

    expect(result.txHash).toBe("collect_tx_hash");
    expect(result.paidLovelace).toBe(28_571_428n);
  });

  it("updates status to settling after successful collect tx", async () => {
    await service.settlePayment(paymentId, "customer seed phrase");
    const req = service.getPaymentRequest(paymentId);
    expect(req?.status).toBe("settling");
  });

  it("throws NOT_FOUND for an unknown paymentId", async () => {
    await expect(
      service.settlePayment("nonexistent_id", "seed"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws INVALID_STATUS when already settling", async () => {
    await service.settlePayment(paymentId, "customer seed phrase");
    // Second attempt on same request (now in "settling" state)
    await expect(
      service.settlePayment(paymentId, "customer seed phrase"),
    ).rejects.toMatchObject({ code: "INVALID_STATUS" });
  });

  it("throws UTXO_NOT_FOUND and marks expired when UTxO is gone", async () => {
    mockFindPaymentUtxo.mockResolvedValueOnce(undefined);

    await expect(
      service.settlePayment(paymentId, "customer seed phrase"),
    ).rejects.toMatchObject({ code: "UTXO_NOT_FOUND" });

    const req = service.getPaymentRequest(paymentId);
    expect(req?.status).toBe("expired");
  });
});

// ---------------------------------------------------------------------------

describe("PaymentService.estimateLovelace", () => {
  let service: PaymentService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const now = Math.floor(Date.now() / 1000);
    mockGetLatestPrice.mockResolvedValue({
      proof: { price: 35_000_000n, exponent: -8, feedId: "ada_usd", conf: 175_000n, publishTime: now - 5, signature: "", signerKey: "" },
      priceFloat: 0.35,
      confFloat: 0.00175,
      ageSeconds: 5,
    });
    mockComputeRequiredLovelace.mockReturnValue(28_571_428n);
    service = await PaymentService.create(TEST_CONFIG, "seed phrase");
  });

  it("returns lovelace estimate and price snapshot", async () => {
    const { lovelace, price } = await service.estimateLovelace(1000, "ADA/USD");
    expect(lovelace).toBe(28_571_428n);
    expect(price.priceFloat).toBeCloseTo(0.35, 2);
  });
});

// ---------------------------------------------------------------------------

describe("PaymentService.confirmSettlement", () => {
  let service: PaymentService;
  let paymentId: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockBuildLockTx.mockResolvedValue({ txHash: "tx1", utxoRef: "tx1#0" });
    mockBuildCollectTx.mockResolvedValue({ txHash: "tx2", paidLovelace: 1_000_000n, priceUsed: {} });
    mockFindPaymentUtxo.mockResolvedValue({ txHash: "tx1", outputIndex: 0 });

    service = await PaymentService.create(TEST_CONFIG, "seed");
    const { request } = await service.createPaymentRequest(
      "INV-CONFIRM-001", MERCHANT_ADDRESS, 100, "ADA/USD", CUSTOMER_ADDRESS,
    );
    paymentId = request.datum.paymentId;
    await service.settlePayment(paymentId, "customer seed");
  });

  it("transitions status to settled", () => {
    service.confirmSettlement(paymentId);
    expect(service.getPaymentRequest(paymentId)?.status).toBe("settled");
  });
});
