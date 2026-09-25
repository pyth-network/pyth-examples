export interface CdpInfo {
  nftName: string;
  owner: string;
  collateralLovelace: number;
  debtPusd: number;
  ltv: number;
}

export interface PriceInfo {
  adaUsd: number;
  timestamp: string;
  policyId: string;
}

export interface OpenCdpRequest {
  collateralAda: number;
  borrowPusd: number;
  ownerAddress: string;
}

export interface BorrowRequest {
  nftName: string;
  amount: number;
  ownerAddress: string;
}

export interface RepayRequest {
  nftName: string;
  amount: number;
  ownerAddress: string;
}

export interface CloseRequest {
  nftName: string;
  ownerAddress: string;
}

export interface LiquidateRequest {
  nftName: string;
  liquidatorAddress: string;
}

export interface TxResponse {
  txCborHex: string;
}

export interface SubmitTxRequest {
  txCborHex: string;
  witnessCborHex: string;
}

export interface SubmitTxResponse {
  txHash: string;
}
