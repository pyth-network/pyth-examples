import type {
  CdpInfo,
  PriceInfo,
  OpenCdpRequest,
  BorrowRequest,
  RepayRequest,
  CloseRequest,
  LiquidateRequest,
  TxResponse,
  SubmitTxRequest,
  SubmitTxResponse,
} from "./types";

const BASE = "/api";

async function get<T>(path: string): Promise<T> {
  console.log(`[API] GET ${path}`);
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const errText = await res.text();
    console.error(`[API] GET ${path} failed (${res.status}):`, errText);
    throw new Error(errText);
  }
  const data = await res.json();
  if (path !== "/price") console.log(`[API] GET ${path} response:`, data);
  return data;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  console.log(`[API] POST ${path}`, body);
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`[API] POST ${path} failed (${res.status}):`, errText);
    throw new Error(errText);
  }
  const data = await res.json();
  console.log(`[API] POST ${path} response:`, data);
  return data;
}

export const api = {
  getPrice: () => get<PriceInfo>("/price"),
  listCdps: () => get<CdpInfo[]>("/cdps"),
  openCdp: (req: OpenCdpRequest) => post<TxResponse>("/cdp/open", req),
  borrow: (req: BorrowRequest) => post<TxResponse>("/cdp/borrow", req),
  repay: (req: RepayRequest) => post<TxResponse>("/cdp/repay", req),
  close: (req: CloseRequest) => post<TxResponse>("/cdp/close", req),
  liquidate: (req: LiquidateRequest) =>
    post<TxResponse>("/cdp/liquidate", req),
  submitTx: (req: SubmitTxRequest) =>
    post<SubmitTxResponse>("/tx/submit", req),
};
