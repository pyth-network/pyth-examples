import type { RepositoryMode, SolarSnapshotRecord } from "@packages/shared-types";
export interface SolarSnapshotRepository { readonly mode: RepositoryMode; ensureReady(): Promise<void>; create(snapshot: SolarSnapshotRecord): Promise<SolarSnapshotRecord>; list(limit: number): Promise<SolarSnapshotRecord[]>; getById(snapshotId: string): Promise<SolarSnapshotRecord | null>; }
