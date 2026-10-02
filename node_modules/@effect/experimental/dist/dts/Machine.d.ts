import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FiberRef from "effect/FiberRef";
import type * as ParseResult from "effect/ParseResult";
import type { Pipeable } from "effect/Pipeable";
import type { Request } from "effect/Request";
import type * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";
import type * as Scope from "effect/Scope";
import * as Subscribable from "effect/Subscribable";
import * as Procedure from "./Machine/Procedure.js";
import type { ProcedureList } from "./Machine/ProcedureList.js";
import type { SerializableProcedureList } from "./Machine/SerializableProcedureList.js";
/**
 * @since 1.0.0
 * @category procedures
 */
export * as procedures from "./Machine/ProcedureList.js";
/**
 * @since 1.0.0
 * @category procedures
 */
export * as serializable from "./Machine/SerializableProcedureList.js";
export { 
/**
 * @since 1.0.0
 * @category symbols
 */
NoReply } from "./Machine/Procedure.js";
/**
 * @since 1.0.0
 * @category type ids
 */
export declare const TypeId: unique symbol;
/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId;
/**
 * @since 1.0.0
 * @category models
 */
export interface Machine<State, Public extends Procedure.TaggedRequest.Any, Private extends Procedure.TaggedRequest.Any, Input, InitErr, R> extends Pipeable {
    readonly [TypeId]: TypeId;
    readonly initialize: Machine.Initialize<Input, State, Public, Private, R, InitErr, R>;
    readonly retryPolicy: Schedule.Schedule<unknown, InitErr | MachineDefect, R> | undefined;
}
/**
 * @since 1.0.0
 * @category type ids
 */
export declare const SerializableTypeId: unique symbol;
/**
 * @since 1.0.0
 * @category type ids
 */
export type SerializableTypeId = typeof SerializableTypeId;
/**
 * @since 1.0.0
 * @category models
 */
export interface SerializableMachine<State, Public extends Schema.TaggedRequest.All, Private extends Schema.TaggedRequest.All, Input, InitErr, R, SR> extends Machine<State, Public, Private, Input, InitErr, R> {
    readonly [SerializableTypeId]: SerializableTypeId;
    readonly schemaInput: Schema.Schema<Input, unknown, SR>;
    readonly schemaState: Schema.Schema<State, unknown, SR>;
}
/**
 * @since 1.0.0
 * @category type ids
 */
export declare const ActorTypeId: unique symbol;
/**
 * @since 1.0.0
 * @category type ids
 */
export type ActorTypeId = typeof ActorTypeId;
declare const MachineDefect_base: Schema.TaggedErrorClass<MachineDefect, "MachineDefect", {
    readonly _tag: Schema.tag<"MachineDefect">;
} & {
    cause: typeof Schema.Defect;
}>;
/**
 * @since 1.0.0
 * @category errors
 */
export declare class MachineDefect extends MachineDefect_base {
    /**
     * @since 1.0.0
     */
    static wrap<A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, MachineDefect, R>;
}
declare const MachineContext_base: Context.TagClass<MachineContext, "@effect/experimental/Machine/Context", Procedure.Procedure.BaseContext>;
/**
 * @since 1.0.0
 * @category tags
 */
export declare class MachineContext extends MachineContext_base {
}
/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Machine {
    /**
     * @since 1.0.0
     * @category models
     */
    type Any = Machine<any, any, any, any, any, any> | Machine<any, any, any, any, never, any> | Machine<any, never, any, any, never, any> | Machine<any, any, never, any, never, any> | Machine<any, never, never, any, never, any>;
    /**
     * @since 1.0.0
     * @category models
     */
    type Initialize<Input, State, Public extends Procedure.TaggedRequest.Any, Private extends Procedure.TaggedRequest.Any, R, E, InitR> = (input: Input, previousState?: State | undefined) => Effect.Effect<ProcedureList<State, Public, Private, R>, E, InitR>;
    /**
     * @since 1.0.0
     * @category models
     */
    type InitializeSerializable<Input, State, Public extends Schema.TaggedRequest.All, Private extends Schema.TaggedRequest.All, R, E, InitR> = (input: Input, previousState?: State | undefined) => Effect.Effect<SerializableProcedureList<State, Public, Private, R>, E, InitR>;
    /**
     * @since 1.0.0
     */
    type Public<M> = M extends Machine<infer _S, infer Public, infer _Pr, infer _I, infer _IE, infer _R> ? Public : never;
    /**
     * @since 1.0.0
     */
    type Private<M> = M extends Machine<infer _S, infer _Pu, infer Private, infer _I, infer _IE, infer _R> ? Private : never;
    /**
     * @since 1.0.0
     */
    type State<M> = M extends Machine<infer State, infer _Pu, infer _Pr, infer _I, infer _IE, infer _R> ? State : never;
    /**
     * @since 1.0.0
     */
    type InitError<M> = M extends Machine<infer _S, infer _Pu, infer _Pr, infer _I, infer InitErr, infer _R> ? InitErr : never;
    /**
     * @since 1.0.0
     */
    type Context<M> = M extends Machine<infer _S, infer _Pu, infer _Pr, infer _I, infer _IE, infer R> ? R : never;
    /**
     * @since 1.0.0
     */
    type Input<M> = M extends Machine<infer _S, infer _Pu, infer _Pr, infer Input, infer _IE, infer _R> ? Input : never;
    /**
     * @since 1.0.0
     */
    type AddContext<M, R, E = never> = M extends SerializableMachine<infer State, infer Public, infer Private, infer Input, infer InitErr, infer R2, infer SR> ? SerializableMachine<State, Public, Private, Input, InitErr | E, R | R2, SR> : M extends Machine<infer State, infer Public, infer Private, infer Input, infer InitErr, infer R2> ? Machine<State, Public, Private, Input, InitErr | E, R | R2> : never;
}
/**
 * @since 1.0.0
 * @category models
 */
export interface Actor<M extends Machine.Any> extends Subscribable.Subscribable<Machine.State<M>> {
    readonly [ActorTypeId]: ActorTypeId;
    readonly machine: M;
    readonly input: Machine.Input<M>;
    readonly send: <Req extends Machine.Public<M>>(request: Req) => Effect.Effect<Request.Success<Req>, Request.Error<Req>>;
    readonly join: Effect.Effect<never, Machine.InitError<M> | MachineDefect>;
}
/**
 * @since 1.0.0
 * @category models
 */
export interface SerializableActor<M extends Machine.Any> extends Actor<M> {
    readonly sendUnknown: (request: unknown) => Effect.Effect<Schema.ExitEncoded<unknown, unknown, unknown>, ParseResult.ParseError>;
}
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const make: {
    /**
     * @since 1.0.0
     * @category constructors
     */
    <State, Public extends Procedure.TaggedRequest.Any, Private extends Procedure.TaggedRequest.Any, InitErr, R>(initialize: Effect.Effect<ProcedureList<State, Public, Private, R>, InitErr, R>): Machine<State, Public, Private, void, InitErr, Exclude<R, Scope.Scope | MachineContext>>;
    /**
     * @since 1.0.0
     * @category constructors
     */
    <State, Public extends Procedure.TaggedRequest.Any, Private extends Procedure.TaggedRequest.Any, Input, InitErr, R>(initialize: Machine.Initialize<Input, State, Public, Private, R, InitErr, R>): Machine<State, Public, Private, Input, InitErr, Exclude<R, Scope.Scope | MachineContext>>;
};
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const makeWith: <State, Input = void>() => {
    <Public extends Procedure.TaggedRequest.Any, Private extends Procedure.TaggedRequest.Any, InitErr, R>(initialize: Effect.Effect<ProcedureList<State, Public, Private, R>, InitErr, R>): Machine<State, Public, Private, void, InitErr, Exclude<R, Scope.Scope | MachineContext>>;
    <Public extends Procedure.TaggedRequest.Any, Private_1 extends Procedure.TaggedRequest.Any, InitErr_1, R_1>(initialize: Machine.Initialize<Input, State, Public, Private_1, R_1, InitErr_1, R_1>): Machine<State, Public, Private_1, Input, InitErr_1, Exclude<R_1, Scope.Scope | MachineContext>>;
};
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const makeSerializable: {
    /**
     * @since 1.0.0
     * @category constructors
     */
    <State, IS, RS, Public extends Schema.TaggedRequest.All, Private extends Schema.TaggedRequest.All, InitErr, R>(options: {
        readonly state: Schema.Schema<State, IS, RS>;
        readonly input?: undefined;
    }, initialize: Effect.Effect<SerializableProcedureList<State, Public, Private, R>, InitErr, R> | Machine.InitializeSerializable<void, State, Public, Private, R, InitErr, R>): SerializableMachine<State, Public, Private, void, InitErr, Exclude<R, Scope.Scope | MachineContext>, RS>;
    /**
     * @since 1.0.0
     * @category constructors
     */
    <State, IS, RS, Input, II, RI, Public extends Schema.TaggedRequest.All, Private extends Schema.TaggedRequest.All, InitErr, R>(options: {
        readonly state: Schema.Schema<State, IS, RS>;
        readonly input: Schema.Schema<Input, II, RI>;
    }, initialize: Machine.InitializeSerializable<Input, State, Public, Private, R, InitErr, R>): SerializableMachine<State, Public, Private, Input, InitErr, Exclude<R, Scope.Scope | MachineContext>, RS | RI>;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const retry: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    <M extends Machine.Any, Out, In extends Machine.InitError<M> | MachineDefect, R>(policy: Schedule.Schedule<Out, In, R>): (self: M) => Machine.AddContext<M, R>;
    /**
     * @since 1.0.0
     * @category combinators
     */
    <M extends Machine.Any, Out, In extends Machine.InitError<M> | MachineDefect, R>(self: M, policy: Schedule.Schedule<Out, In, R>): Machine.AddContext<M, R>;
};
/**
 * @since 1.0.0
 * @category tracing
 */
export declare const currentTracingEnabled: FiberRef.FiberRef<boolean>;
/**
 * @since 1.0.0
 * @category tracing
 */
export declare const withTracingEnabled: {
    /**
     * @since 1.0.0
     * @category tracing
     */
    (enabled: boolean): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
    /**
     * @since 1.0.0
     * @category tracing
     */
    <A, E, R>(effect: Effect.Effect<A, E, R>, enabled: boolean): Effect.Effect<A, E, R>;
};
/**
 * @since 1.0.0
 * @category runtime
 */
export declare const boot: <M extends Machine.Any>(self: M, ...[input, options]: [Machine.Input<M>] extends [void] ? [input?: Machine.Input<M>, options?: {
    readonly previousState?: Machine.State<M>;
}] : [input: Machine.Input<M>, options?: {
    readonly previousState?: Machine.State<M>;
}]) => Effect.Effect<M extends {
    readonly [SerializableTypeId]: SerializableTypeId;
} ? SerializableActor<M> : Actor<M>, never, Machine.Context<M> | Scope.Scope>;
/**
 * @since 1.0.0
 * @category runtime
 */
export declare const snapshot: <State, Public extends Schema.TaggedRequest.All, Private extends Schema.TaggedRequest.All, Input, InitErr, R, SR>(self: Actor<SerializableMachine<State, Public, Private, Input, InitErr, R, SR>>) => Effect.Effect<[input: unknown, state: unknown], ParseResult.ParseError, SR>;
/**
 * @since 1.0.0
 * @category runtime
 */
export declare const restore: <State, Public extends Schema.TaggedRequest.All, Private extends Schema.TaggedRequest.All, Input, InitErr, R, SR>(self: SerializableMachine<State, Public, Private, Input, InitErr, R, SR>, snapshot: readonly [input: unknown, state: unknown]) => Effect.Effect<Actor<SerializableMachine<State, Public, Private, Input, InitErr, R, SR>>, ParseResult.ParseError, R | SR>;
//# sourceMappingURL=Machine.d.ts.map