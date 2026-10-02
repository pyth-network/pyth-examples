/**
 * @since 1.0.0
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import { Entry, RemoteEntry } from "./EventJournal.js";
import type { Identity } from "./EventLog.js";
/**
 * @since 1.0.0
 * @category models
 */
export declare const EncryptedEntry: Schema.Struct<{
    entryId: Schema.brand<typeof Schema.Uint8ArrayFromSelf, typeof import("./EventJournal.js").EntryIdTypeId>;
    encryptedEntry: typeof Schema.Uint8ArrayFromSelf;
}>;
/**
 * @since 1.0.0
 * @category models
 */
export interface EncryptedRemoteEntry extends Schema.Schema.Type<typeof EncryptedRemoteEntry> {
}
/**
 * @since 1.0.0
 * @category models
 */
export declare const EncryptedRemoteEntry: Schema.Struct<{
    sequence: typeof Schema.Number;
    iv: typeof Schema.Uint8ArrayFromSelf;
    entryId: Schema.brand<typeof Schema.Uint8ArrayFromSelf, typeof import("./EventJournal.js").EntryIdTypeId>;
    encryptedEntry: typeof Schema.Uint8ArrayFromSelf;
}>;
declare const EventLogEncryption_base: Context.TagClass<EventLogEncryption, "@effect/experimental/EventLogEncryption", {
    readonly encrypt: (identity: typeof Identity.Service, entries: ReadonlyArray<Entry>) => Effect.Effect<{
        readonly iv: Uint8Array;
        readonly encryptedEntries: ReadonlyArray<Uint8Array>;
    }>;
    readonly decrypt: (identity: typeof Identity.Service, entries: ReadonlyArray<EncryptedRemoteEntry>) => Effect.Effect<Array<RemoteEntry>>;
    readonly sha256String: (data: Uint8Array) => Effect.Effect<string>;
    readonly sha256: (data: Uint8Array) => Effect.Effect<Uint8Array>;
}>;
/**
 * @since 1.0.0
 * @category encrytion
 */
export declare class EventLogEncryption extends EventLogEncryption_base {
}
/**
 * @since 1.0.0
 * @category encrytion
 */
export declare const makeEncryptionSubtle: (crypto: Crypto) => Effect.Effect<typeof EventLogEncryption.Service>;
/**
 * @since 1.0.0
 * @category encrytion
 */
export declare const layerSubtle: Layer.Layer<EventLogEncryption>;
export {};
//# sourceMappingURL=EventLogEncryption.d.ts.map