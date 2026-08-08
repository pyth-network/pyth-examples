"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeExecutor = exports.TypeId = exports.ProcessTypeId = exports.ProcessId = exports.ExitCode = exports.CommandExecutor = void 0;
var internal = _interopRequireWildcard(require("./internal/commandExecutor.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category type ids
 */
const TypeId = exports.TypeId = internal.TypeId;
/**
 * @since 1.0.0
 * @category tags
 */
const CommandExecutor = exports.CommandExecutor = internal.CommandExecutor;
/**
 * @since 1.0.0
 * @category symbols
 */
const ProcessTypeId = exports.ProcessTypeId = internal.ProcessTypeId;
/**
 * @since 1.0.0
 * @category constructors
 */
const ExitCode = exports.ExitCode = internal.ExitCode;
/**
 * @since 1.0.0
 * @category constructors
 */
const ProcessId = exports.ProcessId = internal.ProcessId;
/**
 * @since 1.0.0
 * @category constructors
 */
const makeExecutor = exports.makeExecutor = internal.makeExecutor;
//# sourceMappingURL=CommandExecutor.js.map