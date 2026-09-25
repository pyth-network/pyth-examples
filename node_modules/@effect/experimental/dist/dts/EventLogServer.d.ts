/**
 * @since 1.0.0
 */
import type * as HttpServerError from "@effect/platform/HttpServerError";
import * as HttpServerRequest from "@effect/platform/HttpServerRequest";
import * as HttpServerResponse from "@effect/platform/HttpServerResponse";
import * as MsgPack from "@effect/platform/MsgPack";
import type * as Socket from "@effect/platform/Socket";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Mailbox from "effect/Mailbox";
import * as Schema from "effect/Schema";
import type * as Scope from "effect/Scope";
import type { RemoteId } from "./EventJournal.js";
import { EncryptedRemoteEntry } from "./EventLogEncryption.js";
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const makeHandler: Effect.Effect<(socket: Socket.Socket) => Effect.Effect<void, Socket.SocketError, Scope.Scope>, never, Storage>;
/**
 * @since 1.0.0
 * @category websockets
 */
export declare const makeHandlerHttp: Effect.Effect<Effect.Effect<HttpServerResponse.HttpServerResponse, HttpServerError.RequestError | Socket.SocketError, HttpServerRequest.HttpServerRequest | Scope.Scope>, never, Storage>;
declare const PersistedEntry_base: Schema.Class<PersistedEntry, {
    entryId: Schema.brand<typeof Schema.Uint8ArrayFromSelf, typeof import("./EventJournal.js").EntryIdTypeId>;
    iv: typeof Schema.Uint8ArrayFromSelf;
    encryptedEntry: typeof Schema.Uint8ArrayFromSelf;
}, Schema.Struct.Encoded<{
    entryId: Schema.brand<typeof Schema.Uint8ArrayFromSelf, typeof import("./EventJournal.js").EntryIdTypeId>;
    iv: typeof Schema.Uint8ArrayFromSelf;
    encryptedEntry: typeof Schema.Uint8ArrayFromSelf;
}>, never, {
    readonly entryId: Uint8Array<ArrayBufferLike> & import("effect/Brand").Brand<typeof import("./EventJournal.js").EntryIdTypeId>;
} & {
    readonly encryptedEntry: Uint8Array<ArrayBufferLike>;
} & {
    readonly iv: Uint8Array<ArrayBufferLike>;
}, {}, {}>;
/**
 * @since 1.0.0
 * @category storage
 */
export declare class PersistedEntry extends PersistedEntry_base {
    /**
     * @since 1.0.0
     */
    static fromMsgPack: MsgPack.schema<typeof PersistedEntry>;
    /**
     * @since 1.0.0
     */
    static encode: (a: PersistedEntry, overrideOptions?: import("effect/SchemaAST").ParseOptions) => Uint8Array<ArrayBufferLike>;
    /**
     * @since 1.0.0
     */
    get entryIdString(): string;
}
declare const Storage_base: Context.TagClass<Storage, "@effect/experimental/EventLogServer/Storage", {
    readonly getId: Effect.Effect<RemoteId>;
    readonly write: (publicKey: string, entries: ReadonlyArray<PersistedEntry>) => Effect.Effect<ReadonlyArray<EncryptedRemoteEntry>>;
    readonly entries: (publicKey: string, startSequence: number) => Effect.Effect<ReadonlyArray<EncryptedRemoteEntry>>;
    readonly changes: (publicKey: string, startSequence: number) => Effect.Effect<Mailbox.ReadonlyMailbox<EncryptedRemoteEntry>, never, Scope.Scope>;
}>;
/**
 * @since 1.0.0
 * @category storage
 */
export declare class Storage extends Storage_base {
}
/**
 * @since 1.0.0
 * @category storage
 */
export declare const makeStorageMemory: Effect.Effect<typeof Storage.Service, never, Scope.Scope>;
/**
 * @since 1.0.0
 * @category storage
 */
export declare const layerStorageMemory: Layer.Layer<Storage>;
export {};
//# sourceMappingURL=EventLogServer.d.ts.map