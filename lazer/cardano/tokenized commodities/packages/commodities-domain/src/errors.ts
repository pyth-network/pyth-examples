export type CommodityDomainErrorCode =
  | "INVALID_AGREEMENT"
  | "INVALID_ORACLE"
  | "EXPIRED_AGREEMENT"
  | "UNDERCOLLATERALIZED";

export class CommodityDomainError extends Error {
  public readonly code: CommodityDomainErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(code: CommodityDomainErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "CommodityDomainError";
    this.code = code;
    this.details = details;
  }
}
