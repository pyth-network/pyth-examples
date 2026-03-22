/**
 * Auditoría local opcional (`data/judge_audit.json`). Los balances del pool salen de la cadena
 * (`pool_chain_state.ts`), no de acá.
 */
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const AUDIT_PATH = path.join(DATA_DIR, "judge_audit.json");
const MAX_AUDIT = 400;

export type AuditEvent = {
  ts: string;
  kind: string;
  summary: string;
  txHash?: string;
  extra?: Record<string, string | number | boolean | null>;
};

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function readAudit(limit: number): AuditEvent[] {
  ensureDir();
  if (!fs.existsSync(AUDIT_PATH)) return [];
  try {
    const arr = JSON.parse(
      fs.readFileSync(AUDIT_PATH, "utf8"),
    ) as AuditEvent[];
    return arr.slice(0, Math.min(limit, MAX_AUDIT));
  } catch {
    return [];
  }
}

export function appendAudit(
  e: Omit<AuditEvent, "ts"> & { ts?: string },
): void {
  ensureDir();
  const prev = (() => {
    if (!fs.existsSync(AUDIT_PATH)) return [] as AuditEvent[];
    try {
      return JSON.parse(fs.readFileSync(AUDIT_PATH, "utf8")) as AuditEvent[];
    } catch {
      return [];
    }
  })();
  const row: AuditEvent = {
    ts: e.ts ?? new Date().toISOString(),
    kind: e.kind,
    summary: e.summary,
    txHash: e.txHash,
    extra: e.extra,
  };
  prev.unshift(row);
  fs.writeFileSync(
    AUDIT_PATH,
    JSON.stringify(prev.slice(0, MAX_AUDIT), null, 2),
    "utf8",
  );
}
