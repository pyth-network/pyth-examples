import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import { Scope } from "effect/Scope";
/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/rpc/RpcMiddleware");
/**
 * @since 1.0.0
 * @category tags
 */
export const Tag = () => (id, options) => {
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
export const layerClient = (tag, service) => Layer.scopedContext(Effect.gen(function* () {
  const context = (yield* Effect.context()).pipe(Context.omit(Scope));
  const middleware = Effect.isEffect(service) ? yield* service : service;
  return Context.unsafeMake(new Map([[`${tag.key}/Client`, options => Effect.mapInputContext(middleware(options), requestContext => Context.merge(context, requestContext))]]));
}));
//# sourceMappingURL=RpcMiddleware.js.map