/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect";
import type * as Types from "effect/Types";
import * as Procedure from "./Procedure.js";
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
export interface ProcedureList<State, Public extends Procedure.TaggedRequest.Any, Private extends Procedure.TaggedRequest.Any, R> extends Effect.Effect<ProcedureList<State, Public, Private, R>> {
    readonly [TypeId]: TypeId;
    readonly initialState: State;
    readonly public: ReadonlyArray<Procedure.Procedure<Public, State, R>>;
    readonly private: ReadonlyArray<Procedure.Procedure<Private, State, R>>;
    readonly identifier: string;
}
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const make: <State>(initialState: State, options?: {
    readonly identifier?: string;
}) => ProcedureList<State, never, never, never>;
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const addProcedure: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    <Req extends Procedure.TaggedRequest.Any, State, R2>(procedure: Procedure.Procedure<Req, State, R2>): <Public extends Procedure.TaggedRequest.Any, Private extends Procedure.TaggedRequest.Any, R>(self: ProcedureList<State, Public, Private, R>) => ProcedureList<State, Req | Public, Private, R | R2>;
    /**
     * @since 1.0.0
     * @category combinators
     */
    <State, Public extends Procedure.TaggedRequest.Any, Private extends Procedure.TaggedRequest.Any, R, Req extends Procedure.TaggedRequest.Any, R2>(self: ProcedureList<State, Public, Private, R>, procedure: Procedure.Procedure<Req, State, R2>): ProcedureList<State, Req | Public, Private, R | R2>;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const addProcedurePrivate: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    <Req extends Procedure.TaggedRequest.Any, State, R2>(procedure: Procedure.Procedure<Req, State, R2>): <Public extends Procedure.TaggedRequest.Any, Private extends Procedure.TaggedRequest.Any, R>(self: ProcedureList<State, Public, Private, R>) => ProcedureList<State, Public, Private | Req, R | R2>;
    /**
     * @since 1.0.0
     * @category combinators
     */
    <State, Public extends Procedure.TaggedRequest.Any, Private extends Procedure.TaggedRequest.Any, R, Req extends Procedure.TaggedRequest.Any, R2>(self: ProcedureList<State, Public, Private, R>, procedure: Procedure.Procedure<Req, State, R2>): ProcedureList<State, Public, Private | Req, R | R2>;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const add: <Req extends Procedure.TaggedRequest.Any>() => {
    <State, Public extends Procedure.TaggedRequest.Any, Private extends Procedure.TaggedRequest.Any, R2>(tag: Req["_tag"], handler: Procedure.Handler<Req, Types.NoInfer<State>, Types.NoInfer<Public> | Types.NoInfer<Private>, R2>): <R>(self: ProcedureList<State, Public, Private, R>) => ProcedureList<State, Req | Public, Private, R | R2>;
    <State, Public_1 extends Procedure.TaggedRequest.Any, Private_1 extends Procedure.TaggedRequest.Any, R, R2_1>(self: ProcedureList<State, Public_1, Private_1, R>, tag: Req["_tag"], handler: Procedure.Handler<Req, Types.NoInfer<State>, Types.NoInfer<Public_1> | Types.NoInfer<Private_1>, R2_1>): ProcedureList<State, Req | Public_1, Private_1, R | R2_1>;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const addPrivate: <Req extends Procedure.TaggedRequest.Any>() => {
    <State, Public extends Procedure.TaggedRequest.Any, Private extends Procedure.TaggedRequest.Any, R2>(tag: Req["_tag"], handler: Procedure.Handler<Req, Types.NoInfer<State>, Types.NoInfer<Public> | Types.NoInfer<Private>, R2>): <R>(self: ProcedureList<State, Public, Private, R>) => ProcedureList<State, Public, Private | Req, R | R2>;
    <State, Public_1 extends Procedure.TaggedRequest.Any, Private_1 extends Procedure.TaggedRequest.Any, R, R2_1>(self: ProcedureList<State, Public_1, Private_1, R>, tag: Req["_tag"], handler: Procedure.Handler<Req, Types.NoInfer<State>, Types.NoInfer<Public_1> | Types.NoInfer<Private_1>, R2_1>): ProcedureList<State, Public_1, Private_1 | Req, R | R2_1>;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const withInitialState: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    <State>(initialState: Types.NoInfer<State>): <Public extends Procedure.TaggedRequest.Any, Private extends Procedure.TaggedRequest.Any, R>(self: ProcedureList<State, Public, Private, R>) => ProcedureList<State, Public, Private, R>;
    /**
     * @since 1.0.0
     * @category combinators
     */
    <State, Public extends Procedure.TaggedRequest.Any, Private extends Procedure.TaggedRequest.Any, R>(self: ProcedureList<State, Public, Private, R>, initialState: Types.NoInfer<State>): ProcedureList<State, Public, Private, R>;
};
//# sourceMappingURL=ProcedureList.d.ts.map