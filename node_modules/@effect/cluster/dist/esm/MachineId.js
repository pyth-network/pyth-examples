/**
 * @since 1.0.0
 */
import * as Schema from "effect/Schema";
/**
 * @since 1.0.0
 * @category constructors
 */
export const MachineId = /*#__PURE__*/Schema.Int.pipe(/*#__PURE__*/Schema.brand("MachineId"), /*#__PURE__*/Schema.annotations({
  pretty: () => machineId => `MachineId(${machineId})`
}));
/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = shardId => MachineId.make(shardId);
//# sourceMappingURL=MachineId.js.map