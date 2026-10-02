import { TaggedError } from "effect/Data";
import * as InternalTerminal from "./internal/terminal.js";
/**
 * A `QuitException` represents an exception that occurs when a user attempts to
 * quit out of a `Terminal` prompt for input (usually by entering `ctrl`+`c`).
 *
 * @since 1.0.0
 * @category model
 */
export class QuitException extends /*#__PURE__*/TaggedError("QuitException") {}
/**
 * @since 1.0.0
 * @category refinements
 */
export const isQuitException = u => typeof u === "object" && u != null && "_tag" in u && u._tag === "QuitException";
/**
 * @since 1.0.0
 * @category tag
 */
export const Terminal = InternalTerminal.tag;
//# sourceMappingURL=Terminal.js.map