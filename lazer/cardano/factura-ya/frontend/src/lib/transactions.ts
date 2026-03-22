/**
 * Transaction config and deploy addresses for Factura Ya on PreProd.
 *
 * Actual tx construction happens in deploy.html (standalone page)
 * using Lucid Evolution loaded from CDN.
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

export interface TxResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface InvoiceRegistration {
  amountArs: number;
  dueDateDays: number;
  debtorName: string;
  debtorContact: string;
  sellerAddress: string;
}

/**
 * Register an invoice — opens the standalone tx page.
 * Full on-chain tx construction requires Lucid which runs in deploy.html.
 */
export async function registerInvoice(
  _params: InvoiceRegistration,
  _walletApi: unknown,
): Promise<TxResult> {
  return {
    success: false,
    error: "Use the Deploy page first, then register invoices from the standalone tx page.",
  };
}
