import { dual } from "effect/Function";
import * as Procedure from "./Procedure.js";
import * as ProcedureList from "./ProcedureList.js";
/**
 * @since 1.0.0
 * @category constructors
 */
export const make = ProcedureList.make;
/**
 * @since 1.0.0
 * @category combinators
 */
export const add = /*#__PURE__*/dual(3, (self, schema, handler) => ProcedureList.addProcedure(self, Procedure.makeSerializable()(schema, handler)));
/**
 * @since 1.0.0
 * @category combinators
 */
export const addPrivate = /*#__PURE__*/dual(3, (self, schema, handler) => ProcedureList.addProcedurePrivate(self, Procedure.makeSerializable()(schema, handler)));
/**
 * @since 1.0.0
 * @category combinators
 */
export const withInitialState = ProcedureList.withInitialState;
//# sourceMappingURL=SerializableProcedureList.js.map