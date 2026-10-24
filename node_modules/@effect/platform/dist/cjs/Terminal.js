"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isQuitException = exports.Terminal = exports.QuitException = void 0;
var _Data = require("effect/Data");
var InternalTerminal = _interopRequireWildcard(require("./internal/terminal.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * A `QuitException` represents an exception that occurs when a user attempts to
 * quit out of a `Terminal` prompt for input (usually by entering `ctrl`+`c`).
 *
 * @since 1.0.0
 * @category model
 */
class QuitException extends /*#__PURE__*/(0, _Data.TaggedError)("QuitException") {}
/**
 * @since 1.0.0
 * @category refinements
 */
exports.QuitException = QuitException;
const isQuitException = u => typeof u === "object" && u != null && "_tag" in u && u._tag === "QuitException";
/**
 * @since 1.0.0
 * @category tag
 */
exports.isQuitException = isQuitException;
const Terminal = exports.Terminal = InternalTerminal.tag;
//# sourceMappingURL=Terminal.js.map