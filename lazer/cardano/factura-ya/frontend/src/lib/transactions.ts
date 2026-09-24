/**
 * Transaction config and deploy addresses for Factura Ya on PreProd.
 *
 * ARCHITECTURE NOTE:
 * Lucid Evolution (the Cardano tx builder) cannot run inside Vite due to
 * incompatible WASM/ESM dependencies (libsodium-wrappers-sumo ships a broken
 * ESM build that references a missing .mjs file). We tried:
 * - vite-plugin-wasm + top-level-await (libsodium ESM import fails)
 * - Alias rewrites to CJS build (Vite package export resolver blocks it)
 * - Including Lucid in optimizeDeps (lodash CJS/ESM mismatch, safe-buffer crash)
 * - CDN via unpkg (no ESM build published)
 * - esbuild bundle for browser (WASM imports + libsodium + Node builtins fail)
 *
 * SOLUTION: All tx construction runs on a Node server (deploy-server.ts on :3002)
 * that can use Lucid natively. The frontend opens standalone HTML pages served
 * by that server, which connect the CIP-30 wallet directly for signing.
 *
 * FOR PRODUCTION: Use MeshJS (browser-native Cardano tx builder) or wait for
 * Lucid Evolution to fix their ESM/WASM packaging. Alternatively, use a
 * backend-signs architecture with a custodial key.
 */

export const PYTH_PREPROD_POLICY_ID =
  "d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6";

export const ADA_USD_FEED_ID = 16;

export const DEPLOY = {
  escrow: {
    scriptHash: "cb8368c843c59ac8d700cf647592c24b74fcca575fd8f42ff0793254",
    address: "addr_test1wr9cx6xgg0ze4jxhqr8kgavjcf9hflx22a0a3ap07puny4q8hvkmg",
  },
  invoiceMint: {
    policyId: "84ca1e20b09e708b3524552f29b0cba717a2e656638bc500aff5a2ec",
  },
  marketplace: {
    scriptHash: "25d3e51a21372a2aab450ef80897ccc777d52ebceeb0614a72ea975a",
    address: "addr_test1wqja8eg6yymj524tg580szyhenrh04fwhnhtqc22wt4fwkswthdae",
  },
};

const TX_SERVER = "http://localhost:3002";

export interface TxResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface InvoiceRegistration {
  amountUsd: number;
  dueDateDays: number;
  debtorName: string;
  debtorContact: string;
  sellerAddress: string;
}

/**
 * Register an invoice — opens the tx server page for wallet signing.
 */
export function registerInvoice(params: InvoiceRegistration): void {
  const qs = new URLSearchParams({
    amount: String(params.amountUsd),
    days: String(params.dueDateDays),
    debtor: params.debtorName,
    contact: params.debtorContact,
  });
  window.open(`${TX_SERVER}/register?${qs}`, "_blank");
}
