"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.layerClient = exports.TypeId = exports.Tag = void 0;
var Context = _interopRequireWildcard(require("effect/Context"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Layer = _interopRequireWildcard(require("effect/Layer"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
var _Scope = require("effect/Scope");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category type ids
 */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/rpc/RpcMiddleware");
/**
 * @since 1.0.0
 * @category tags
 */
const Tag = () => (id, options) => {
  const Err = globalThis.Error;
  const limit = Err.stackTraceLimit;
  Err.stackTraceLimit = 2;
  const creationError = new Err();
  Err.stackTraceLimit = limit;
  function TagClass() {}
  const TagClass_ = TagClass;
  Object.setPrototypeOf(TagClass, Object.getPrototypeOf(Context.GenericTag(id)));
  TagClass.key = id;
  Object.defineProperty(TagClass, "stack", {
    get() {
      return creationError.stack;
    }
  });
  TagClass_[TypeId] = TypeId;
  TagClass_.failure = options?.optional === true || options?.failure === undefined ? Schema.Never : options.failure;
  if (options?.provides) {
    TagClass_.provides = options.provides;
  }
  TagClass_.optional = options?.optional ?? false;
  TagClass_.requiredForClient = options?.requiredForClient ?? false;
  TagClass_.wrap = options?.wrap ?? false;
  return TagClass;
};
/**
 * @since 1.0.0
 * @category client
 */
exports.Tag = Tag;
const layerClient = (tag, service) => Layer.scopedContext(Effect.gen(function* () {
  const context = (yield* Effect.context()).pipe(Context.omit(_Scope.Scope));
  const middleware = Effect.isEffect(service) ? yield* service : service;
  return Context.unsafeMake(new Map([[`${tag.key}/Client`, options => Effect.mapInputContext(middleware(options), requestContext => Context.merge(context, requestContext))]]));
}));
exports.layerClient = layerClient;
//# sourceMappingURL=RpcMiddleware.js.map