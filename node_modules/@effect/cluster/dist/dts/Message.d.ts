/**
 * @since 1.0.0
 */
import * as Rpc from "@effect/rpc/Rpc";
import type { Context } from "effect/Context";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import type { PersistenceError } from "./ClusterError.js";
import { MalformedMessage } from "./ClusterError.js";
import type { EntityAddress } from "./EntityAddress.js";
import * as Envelope from "./Envelope.js";
import type * as Reply from "./Reply.js";
import type { Snowflake } from "./Snowflake.js";
/**
 * @since 1.0.0
 * @category incoming
 */
export type Incoming<R extends Rpc.Any> = IncomingRequest<R> | IncomingEnvelope;
/**
 * @since 1.0.0
 * @category incoming
 */
export type IncomingLocal<R extends Rpc.Any> = IncomingRequestLocal<R> | IncomingEnvelope;
/**
 * @since 1.0.0
 * @category incoming
 */
export declare const incomingLocalFromOutgoing: <R extends Rpc.Any>(self: Outgoing<R>) => IncomingLocal<R>;
declare const IncomingRequest_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => Readonly<A> & {
    readonly _tag: "IncomingRequest";
};
/**
 * @since 1.0.0
 * @category incoming
 */
export declare class IncomingRequest<R extends Rpc.Any> extends IncomingRequest_base<{
    readonly envelope: Envelope.Request.PartialEncoded;
    readonly lastSentReply: Option.Option<Reply.ReplyEncoded<R>>;
    readonly respond: (reply: Reply.ReplyWithContext<R>) => Effect.Effect<void, MalformedMessage | PersistenceError>;
}> {
}
declare const IncomingRequestLocal_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => Readonly<A> & {
    readonly _tag: "IncomingRequestLocal";
};
/**
 * @since 1.0.0
 * @category outgoing
 */
export declare class IncomingRequestLocal<R extends Rpc.Any> extends IncomingRequestLocal_base<{
    readonly envelope: Envelope.Request<R>;
    readonly lastSentReply: Option.Option<Reply.Reply<R>>;
    readonly respond: (reply: Reply.Reply<R>) => Effect.Effect<void, MalformedMessage | PersistenceError>;
}> {
}
declare const IncomingEnvelope_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => Readonly<A> & {
    readonly _tag: "IncomingEnvelope";
};
/**
 * @since 1.0.0
 * @category incoming
 */
export declare class IncomingEnvelope extends IncomingEnvelope_base<{
    readonly _tag: "IncomingEnvelope";
    readonly envelope: Envelope.AckChunk | Envelope.Interrupt;
}> {
}
/**
 * @since 1.0.0
 * @category outgoing
 */
export type Outgoing<R extends Rpc.Any> = OutgoingRequest<R> | OutgoingEnvelope;
declare const OutgoingRequest_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => Readonly<A> & {
    readonly _tag: "OutgoingRequest";
};
/**
 * @since 1.0.0
 * @category outgoing
 */
export declare class OutgoingRequest<R extends Rpc.Any> extends OutgoingRequest_base<{
    readonly envelope: Envelope.Request<R>;
    readonly context: Context<Rpc.Context<R>>;
    readonly lastReceivedReply: Option.Option<Reply.Reply<R>>;
    readonly rpc: R;
    readonly respond: (reply: Reply.Reply<R>) => Effect.Effect<void>;
}> {
    /**
     * @since 1.0.0
     */
    encodedCache?: Envelope.Request.PartialEncoded;
}
declare const OutgoingEnvelope_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => Readonly<A> & {
    readonly _tag: "OutgoingEnvelope";
};
/**
 * @since 1.0.0
 * @category outgoing
 */
export declare class OutgoingEnvelope extends OutgoingEnvelope_base<{
    readonly envelope: Envelope.AckChunk | Envelope.Interrupt;
    readonly rpc: Rpc.AnyWithProps;
}> {
    /**
     * @since 1.0.0
     */
    static interrupt(options: {
        readonly address: EntityAddress;
        readonly id: Snowflake;
        readonly requestId: Snowflake;
    }): OutgoingEnvelope;
}
/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export declare const serialize: <Rpc extends Rpc.Any>(message: Outgoing<Rpc>) => Effect.Effect<Envelope.Envelope.PartialEncoded, MalformedMessage>;
/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export declare const serializeEnvelope: <Rpc extends Rpc.Any>(message: Outgoing<Rpc>) => Effect.Effect<Envelope.Envelope.Encoded, MalformedMessage>;
/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export declare const serializeRequest: <Rpc extends Rpc.Any>(self: OutgoingRequest<Rpc>) => Effect.Effect<Envelope.Request.PartialEncoded, MalformedMessage>;
/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export declare const deserializeLocal: <Rpc extends Rpc.Any>(self: Outgoing<Rpc>, encoded: Envelope.Envelope.PartialEncoded) => Effect.Effect<IncomingLocal<Rpc>, MalformedMessage>;
export {};
//# sourceMappingURL=Message.d.ts.map