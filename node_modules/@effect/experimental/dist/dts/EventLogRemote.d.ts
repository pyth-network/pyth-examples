/**
 * @since 1.0.0
 */
import * as MsgPack from "@effect/platform/MsgPack";
import * as Socket from "@effect/platform/Socket";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Mailbox from "effect/Mailbox";
import * as Schema from "effect/Schema";
import * as Scope from "effect/Scope";
import type { Entry } from "./EventJournal.js";
import { RemoteEntry, RemoteId } from "./EventJournal.js";
import type { Identity } from "./EventLog.js";
import { EventLog } from "./EventLog.js";
import { EventLogEncryption } from "./EventLogEncryption.js";
/**
 * @since 1.0.0
 * @category models
 */
export interface EventLogRemote {
    readonly id: RemoteId;
    readonly changes: (identity: typeof Identity.Service, startSequence: number) => Effect.Effect<Mailbox.ReadonlyMailbox<RemoteEntry>, never, Scope.Scope>;
    readonly write: (identity: typeof Identity.Service, entries: ReadonlyArray<Entry>) => Effect.Effect<void>;
}
declare const Hello_base: Schema.TaggedClass<Hello, "Hello", {
    readonly _tag: Schema.tag<"Hello">;
} & {
    remoteId: Schema.brand<typeof Schema.Uint8ArrayFromSelf, typeof import("./EventJournal.js").RemoteIdTypeId>;
}>;
/**
 * @since 1.0.0
 * @category protocol
 */
export declare class Hello extends Hello_base {
}
declare const ChunkedMessage_base: Schema.TaggedClass<ChunkedMessage, "ChunkedMessage", {
    readonly _tag: Schema.tag<"ChunkedMessage">;
} & {
    id: typeof Schema.Number;
    part: Schema.Tuple2<typeof Schema.Number, typeof Schema.Number>;
    data: typeof Schema.Uint8ArrayFromSelf;
}>;
/**
 * @since 1.0.0
 * @category protocol
 */
export declare class ChunkedMessage extends ChunkedMessage_base {
    /**
     * @since 1.0.0
     */
    static split(id: number, data: Uint8Array): ReadonlyArray<ChunkedMessage>;
    /**
     * @since 1.0.0
     */
    static join(map: Map<number, {
        readonly parts: Array<Uint8Array>;
        count: number;
        bytes: number;
    }>, part: ChunkedMessage): Uint8Array | undefined;
}
declare const WriteEntries_base: Schema.TaggedClass<WriteEntries, "WriteEntries", {
    readonly _tag: Schema.tag<"WriteEntries">;
} & {
    publicKey: typeof Schema.String;
    id: typeof Schema.Number;
    iv: typeof Schema.Uint8ArrayFromSelf;
    encryptedEntries: Schema.Array$<Schema.Struct<{
        entryId: Schema.brand<typeof Schema.Uint8ArrayFromSelf, typeof import("./EventJournal.js").EntryIdTypeId>;
        encryptedEntry: typeof Schema.Uint8ArrayFromSelf;
    }>>;
}>;
/**
 * @since 1.0.0
 * @category protocol
 */
export declare class WriteEntries extends WriteEntries_base {
}
declare const Ack_base: Schema.TaggedClass<Ack, "Ack", {
    readonly _tag: Schema.tag<"Ack">;
} & {
    id: typeof Schema.Number;
    sequenceNumbers: Schema.Array$<typeof Schema.Number>;
}>;
/**
 * @since 1.0.0
 * @category protocol
 */
export declare class Ack extends Ack_base {
}
declare const RequestChanges_base: Schema.TaggedClass<RequestChanges, "RequestChanges", {
    readonly _tag: Schema.tag<"RequestChanges">;
} & {
    publicKey: typeof Schema.String;
    startSequence: typeof Schema.Number;
}>;
/**
 * @since 1.0.0
 * @category protocol
 */
export declare class RequestChanges extends RequestChanges_base {
}
declare const Changes_base: Schema.TaggedClass<Changes, "Changes", {
    readonly _tag: Schema.tag<"Changes">;
} & {
    publicKey: typeof Schema.String;
    entries: Schema.Array$<Schema.Struct<{
        sequence: typeof Schema.Number;
        iv: typeof Schema.Uint8ArrayFromSelf;
        entryId: Schema.brand<typeof Schema.Uint8ArrayFromSelf, typeof import("./EventJournal.js").EntryIdTypeId>;
        encryptedEntry: typeof Schema.Uint8ArrayFromSelf;
    }>>;
}>;
/**
 * @since 1.0.0
 * @category protocol
 */
export declare class Changes extends Changes_base {
}
declare const StopChanges_base: Schema.TaggedClass<StopChanges, "StopChanges", {
    readonly _tag: Schema.tag<"StopChanges">;
} & {
    publicKey: typeof Schema.String;
}>;
/**
 * @since 1.0.0
 * @category protocol
 */
export declare class StopChanges extends StopChanges_base {
}
declare const Ping_base: Schema.TaggedClass<Ping, "Ping", {
    readonly _tag: Schema.tag<"Ping">;
} & {
    id: typeof Schema.Number;
}>;
/**
 * @since 1.0.0
 * @category protocol
 */
export declare class Ping extends Ping_base {
}
declare const Pong_base: Schema.TaggedClass<Pong, "Pong", {
    readonly _tag: Schema.tag<"Pong">;
} & {
    id: typeof Schema.Number;
}>;
/**
 * @since 1.0.0
 * @category protocol
 */
export declare class Pong extends Pong_base {
}
/**
 * @since 1.0.0
 * @category protocol
 */
export declare const ProtocolRequest: Schema.Union<[typeof WriteEntries, typeof RequestChanges, typeof StopChanges, typeof ChunkedMessage, typeof Ping]>;
/**
 * @since 1.0.0
 * @category protocol
 */
export declare const ProtocolRequestMsgPack: MsgPack.schema<Schema.Union<[typeof WriteEntries, typeof RequestChanges, typeof StopChanges, typeof ChunkedMessage, typeof Ping]>>;
/**
 * @since 1.0.0
 * @category protocol
 */
export declare const decodeRequest: (i: Uint8Array<ArrayBufferLike>, overrideOptions?: import("effect/SchemaAST").ParseOptions) => ChunkedMessage | WriteEntries | RequestChanges | StopChanges | Ping;
/**
 * @since 1.0.0
 * @category protocol
 */
export declare const encodeRequest: (a: ChunkedMessage | WriteEntries | RequestChanges | StopChanges | Ping, overrideOptions?: import("effect/SchemaAST").ParseOptions) => Uint8Array<ArrayBufferLike>;
/**
 * @since 1.0.0
 * @category protocol
 */
export declare const ProtocolResponse: Schema.Union<[typeof Hello, typeof Ack, typeof Changes, typeof ChunkedMessage, typeof Pong]>;
/**
 * @since 1.0.0
 * @category protocol
 */
export declare const ProtocolResponseMsgPack: MsgPack.schema<Schema.Union<[typeof Hello, typeof Ack, typeof Changes, typeof ChunkedMessage, typeof Pong]>>;
/**
 * @since 1.0.0
 * @category protocol
 */
export declare const decodeResponse: (i: Uint8Array<ArrayBufferLike>, overrideOptions?: import("effect/SchemaAST").ParseOptions) => Hello | ChunkedMessage | Ack | Changes | Pong;
/**
 * @since 1.0.0
 * @category protocol
 */
export declare const encodeResponse: (a: Hello | ChunkedMessage | Ack | Changes | Pong, overrideOptions?: import("effect/SchemaAST").ParseOptions) => Uint8Array<ArrayBufferLike>;
declare const RemoteAdditions_base: Schema.TaggedClass<RemoteAdditions, "RemoveAdditions", {
    readonly _tag: Schema.tag<"RemoveAdditions">;
} & {
    entries: Schema.Array$<typeof RemoteEntry>;
}>;
/**
 * @since 1.0.0
 * @category change
 */
export declare class RemoteAdditions extends RemoteAdditions_base {
}
/**
 * @since 1.0.0
 * @category construtors
 */
export declare const fromSocket: (options?: {
    readonly disablePing?: boolean;
}) => Effect.Effect<void, never, Scope.Scope | EventLog | EventLogEncryption | Socket.Socket>;
/**
 * @since 1.0.0
 * @category construtors
 */
export declare const fromWebSocket: (url: string, options?: {
    readonly disablePing?: boolean;
}) => Effect.Effect<void, never, Scope.Scope | EventLogEncryption | EventLog | Socket.WebSocketConstructor>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerWebSocket: (url: string, options?: {
    readonly disablePing?: boolean;
}) => Layer.Layer<never, never, Socket.WebSocketConstructor | EventLog | EventLogEncryption>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerWebSocketBrowser: (url: string, options?: {
    readonly disablePing?: boolean;
}) => Layer.Layer<never, never, EventLog>;
export {};
//# sourceMappingURL=EventLogRemote.d.ts.map