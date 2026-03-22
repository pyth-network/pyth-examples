import type { CommodityAuditEvent } from "@packages/shared-types";

export function auditEvent(
  stage: string,
  status: CommodityAuditEvent["status"],
  detail: string,
  data?: Record<string, unknown>
): CommodityAuditEvent {
  return {
    at: new Date().toISOString(),
    stage,
    status,
    detail,
    data
  };
}
