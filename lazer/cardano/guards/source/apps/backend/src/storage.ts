import { DatabaseSync } from "node:sqlite";
import type { ExecutionIntent, ExecutionResult, OracleSnapshot } from "@anaconda/core";

export interface AuditEvent {
  eventId: string;
  category: "snapshot" | "intent" | "execution" | "rejection";
  payload: Record<string, unknown>;
  createdAtUs: number;
}

export class AuditStore {
  private readonly db: DatabaseSync;

  constructor(location = ":memory:") {
    this.db = new DatabaseSync(location);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS snapshots (
        snapshot_id TEXT PRIMARY KEY,
        asset_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        observed_at_us INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS intents (
        intent_id TEXT PRIMARY KEY,
        vault_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at_us INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS executions (
        tx_hash TEXT PRIMARY KEY,
        intent_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        executed_at_us INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS audit_events (
        event_id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at_us INTEGER NOT NULL
      );
    `);
  }

  recordSnapshot(snapshot: OracleSnapshot) {
    this.db
      .prepare(`
        INSERT OR REPLACE INTO snapshots (snapshot_id, asset_id, payload, observed_at_us)
        VALUES (?, ?, ?, ?)
      `)
      .run(
        snapshot.snapshotId,
        snapshot.assetId,
        JSON.stringify(snapshot),
        snapshot.observedAtUs,
      );
  }

  recordIntent(intent: ExecutionIntent) {
    this.db
      .prepare(`
        INSERT OR REPLACE INTO intents (intent_id, vault_id, payload, created_at_us)
        VALUES (?, ?, ?, ?)
      `)
      .run(intent.intentId, intent.vaultId, JSON.stringify(intent), intent.createdAtUs);
  }

  recordExecution(result: ExecutionResult) {
    this.db
      .prepare(`
        INSERT OR REPLACE INTO executions (tx_hash, intent_id, payload, executed_at_us)
        VALUES (?, ?, ?, ?)
      `)
      .run(result.txHash, result.intentId, JSON.stringify(result), result.executedAtUs);
  }

  recordEvent(event: AuditEvent) {
    this.db
      .prepare(`
        INSERT OR REPLACE INTO audit_events (event_id, category, payload, created_at_us)
        VALUES (?, ?, ?, ?)
      `)
      .run(
        event.eventId,
        event.category,
        JSON.stringify(event.payload),
        event.createdAtUs,
      );
  }

  listEvents(): AuditEvent[] {
    const rows = this.db
      .prepare(
        `SELECT event_id, category, payload, created_at_us FROM audit_events ORDER BY created_at_us, event_id`,
      )
      .all() as Array<{
      event_id: string;
      category: AuditEvent["category"];
      payload: string;
      created_at_us: number;
    }>;

    return rows.map((row) => ({
      eventId: row.event_id,
      category: row.category,
      payload: JSON.parse(row.payload) as Record<string, unknown>,
      createdAtUs: row.created_at_us,
    }));
  }

  counts() {
    const [snapshots] = this.db
      .prepare(`SELECT COUNT(*) AS count FROM snapshots`)
      .all() as Array<{ count: number }>;
    const [intents] = this.db
      .prepare(`SELECT COUNT(*) AS count FROM intents`)
      .all() as Array<{ count: number }>;
    const [executions] = this.db
      .prepare(`SELECT COUNT(*) AS count FROM executions`)
      .all() as Array<{ count: number }>;
    const [events] = this.db
      .prepare(`SELECT COUNT(*) AS count FROM audit_events`)
      .all() as Array<{ count: number }>;

    return {
      snapshots: snapshots?.count ?? 0,
      intents: intents?.count ?? 0,
      executions: executions?.count ?? 0,
      events: events?.count ?? 0,
    };
  }
}
