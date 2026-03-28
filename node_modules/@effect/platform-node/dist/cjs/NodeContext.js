"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.layer = void 0;
var NodeCommandExecutor = _interopRequireWildcard(require("@effect/platform-node-shared/NodeCommandExecutor"));
var NodeFileSystem = _interopRequireWildcard(require("@effect/platform-node-shared/NodeFileSystem"));
var NodePath = _interopRequireWildcard(require("@effect/platform-node-shared/NodePath"));
var NodeTerminal = _interopRequireWildcard(require("@effect/platform-node-shared/NodeTerminal"));
var _Function = require("effect/Function");
var Layer = _interopRequireWildcard(require("effect/Layer"));
var NodeWorker = _interopRequireWildcard(require("./NodeWorker.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category layer
 */
const layer = exports.layer = /*#__PURE__*/(0, _Function.pipe)(/*#__PURE__*/Layer.mergeAll(NodePath.layer, NodeCommandExecutor.layer, NodeTerminal.layer, NodeWorker.layerManager), /*#__PURE__*/Layer.provideMerge(NodeFileSystem.layer));
//# sourceMappingURL=NodeContext.js.map