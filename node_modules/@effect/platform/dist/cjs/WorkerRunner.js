"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeSerialized = exports.make = exports.layerSerialized = exports.layerCloseLatch = exports.layer = exports.launch = exports.PlatformRunnerTypeId = exports.PlatformRunner = exports.CloseLatch = void 0;
var internal = _interopRequireWildcard(require("./internal/workerRunner.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category type ids
 */
const PlatformRunnerTypeId = exports.PlatformRunnerTypeId = internal.PlatformRunnerTypeId;
/**
 * @since 1.0.0
 * @category tags
 */
const PlatformRunner = exports.PlatformRunner = internal.PlatformRunner;
/**
 * The worker close latch is used by platform runners to signal that the worker
 * has been closed.
 *
 * @since 1.0.0
 * @category CloseLatch
 */
const CloseLatch = exports.CloseLatch = internal.CloseLatch;
/**
 * @since 1.0.0
 * @category CloseLatch
 */
const layerCloseLatch = exports.layerCloseLatch = internal.layerCloseLatch;
/**
 * @since 1.0.0
 * @category constructors
 */
const make = exports.make = internal.make;
/**
 * @since 1.0.0
 * @category layers
 */
const layer = exports.layer = internal.layer;
/**
 * @since 1.0.0
 * @category constructors
 */
const makeSerialized = exports.makeSerialized = internal.makeSerialized;
/**
 * @since 1.0.0
 * @category layers
 */
const layerSerialized = exports.layerSerialized = internal.layerSerialized;
/**
 * Launch the specified layer, interrupting the fiber when the CloseLatch is
 * triggered.
 *
 * @since 1.0.0
 * @category Execution
 */
const launch = exports.launch = internal.launch;
//# sourceMappingURL=WorkerRunner.js.map