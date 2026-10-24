"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeInitialMessage = exports.layerInitialMessage = exports.initialMessage = exports.InitialMessage = void 0;
var Transferable = _interopRequireWildcard(require("@effect/platform/Transferable"));
var Context = _interopRequireWildcard(require("effect/Context"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Layer = _interopRequireWildcard(require("effect/Layer"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category initial message
 */
class InitialMessage extends /*#__PURE__*/Context.Tag("@effect/rpc/RpcWorker/InitialMessage")() {}
exports.InitialMessage = InitialMessage;
const ProtocolTag = /*#__PURE__*/Context.GenericTag("@effect/rpc/RpcServer/Protocol");
/**
 * @since 1.0.0
 * @category initial message
 */
const makeInitialMessage = (schema, effect) => Effect.flatMap(effect, value => {
  const collector = Transferable.unsafeMakeCollector();
  return Schema.encode(schema)(value).pipe(Effect.provideService(Transferable.Collector, collector), Effect.map(encoded => [encoded, collector.unsafeClear()]));
});
/**
 * @since 1.0.0
 * @category initial message
 */
exports.makeInitialMessage = makeInitialMessage;
const layerInitialMessage = (schema, build) => Layer.effect(InitialMessage, Effect.contextWith(context => Effect.provide(Effect.orDie(makeInitialMessage(schema, build)), context)));
/**
 * @since 1.0.0
 * @category initial message
 */
exports.layerInitialMessage = layerInitialMessage;
const initialMessage = schema => ProtocolTag.pipe(Effect.flatMap(protocol => protocol.initialMessage), Effect.flatten, Effect.flatMap(Schema.decodeUnknown(schema)));
exports.initialMessage = initialMessage;
//# sourceMappingURL=RpcWorker.js.map