import type { OracleSnapshot } from "@anaconda/core";
import { AuditStore } from "./storage.js";

export class PythCollector {
  private readonly snapshots = new Map<string, OracleSnapshot>();

  constructor(private readonly auditStore?: AuditStore) {}

  publish(snapshot: OracleSnapshot) {
    this.snapshots.set(snapshot.assetId, snapshot);
    this.auditStore?.recordSnapshot(snapshot);
    this.auditStore?.recordEvent({
      eventId: `snapshot:${snapshot.snapshotId}`,
      category: "snapshot",
      payload: {
        assetId: snapshot.assetId,
        snapshotId: snapshot.snapshotId,
        observedAtUs: snapshot.observedAtUs,
      },
      createdAtUs: snapshot.observedAtUs,
    });
  }

  current(): Record<string, OracleSnapshot> {
    return Object.fromEntries(this.snapshots.entries());
  }
}
