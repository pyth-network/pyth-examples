/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect";
import * as Effectable from "effect/Effectable";
import { dual } from "effect/Function";
import * as Procedure from "./Procedure.js";
/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/experimental/Machine/ProcedureList");
const Proto = {
  ...Effectable.CommitPrototype,
  [TypeId]: TypeId,
  commit() {
    return Effect.succeed(this);
  }
};
const makeProto = options => Object.assign(Object.create(Proto), options);
/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (initialState, options) => makeProto({
  initialState,
  public: [],
  private: [],
  identifier: options?.identifier ?? "Unknown"
});
/**
 * @since 1.0.0
 * @category combinators
 */
export const addProcedure = /*#__PURE__*/dual(2, (self, procedure) => makeProto({
  ...self,
  public: [...self.public, procedure]
}));
/**
 * @since 1.0.0
 * @category combinators
 */
export const addProcedurePrivate = /*#__PURE__*/dual(2, (self, procedure) => makeProto({
  ...self,
  private: [...self.private, procedure]
}));
/**
 * @since 1.0.0
 * @category combinators
 */
export const add = () => dual(3, (self, tag, handler) => addProcedure(self, Procedure.make()()(tag, handler)));
/**
 * @since 1.0.0
 * @category combinators
 */
export const addPrivate = () => dual(3, (self, tag, handler) => addProcedurePrivate(self, Procedure.make()()(tag, handler)));
/**
 * @since 1.0.0
 * @category combinators
 */
export const withInitialState = /*#__PURE__*/dual(2, (self, initialState) => makeProto({
  ...self,
  initialState
}));
//# sourceMappingURL=ProcedureList.js.map