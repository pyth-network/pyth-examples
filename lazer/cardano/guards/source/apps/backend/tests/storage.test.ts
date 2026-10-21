import { describe, expect, it } from "vitest";
import { buildSnapshots } from "@anaconda/core";
import { PythCollector } from "../src/collector.js";
import { AuditStore } from "../src/storage.js";

describe("audit store and collector", () => {
  it("records snapshots and returns event counts", () => {
    const store = new AuditStore();
    const collector = new PythCollector(store);
    const snapshots = buildSnapshots();

    collector.publish(snapshots.ada!);
    collector.publish(snapshots.usdm!);

    const current = collector.current();
    expect(current.ada!.snapshotId).toBe("snapshot-ada");
    expect(store.counts().snapshots).toBe(2);
    expect(store.counts().events).toBe(2);
    expect(store.listEvents()[0]?.category).toBe("snapshot");
  });

  it("overwrites the latest snapshot per asset in collector state", () => {
    const collector = new PythCollector();
    collector.publish(buildSnapshots().ada!);
    collector.publish(
      buildSnapshots({
        ada: {
          snapshotId: "snapshot-ada-2",
          observedAtUs: 2_000_000,
          feedUpdateTimestampUs: 2_000_000,
        },
      }).ada!,
    );

    expect(collector.current().ada!.snapshotId).toBe("snapshot-ada-2");
  });

  it("orders audit events deterministically when timestamps tie", () => {
    const store = new AuditStore();

    store.recordEvent({
      eventId: "event-b",
      category: "snapshot",
      payload: { order: 2 },
      createdAtUs: 1_000_000,
    });
    store.recordEvent({
      eventId: "event-a",
      category: "snapshot",
      payload: { order: 1 },
      createdAtUs: 1_000_000,
    });

    expect(store.listEvents().map((event) => event.eventId)).toEqual(["event-a", "event-b"]);
  });
});
