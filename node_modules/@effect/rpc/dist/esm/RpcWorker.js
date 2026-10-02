/**
 * @since 1.0.0
 */
import * as Transferable from "@effect/platform/Transferable";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
/**
 * @since 1.0.0
 * @category initial message
 */
export class InitialMessage extends /*#__PURE__*/Context.Tag("@effect/rpc/RpcWorker/InitialMessage")() {}
const ProtocolTag = /*#__PURE__*/Context.GenericTag("@effect/rpc/RpcServer/Protocol");
/**
 * @since 1.0.0
 * @category initial message
 */
export const makeInitialMessage = (schema, effect) => Effect.flatMap(effect, value => {
  const collector = Transferable.unsafeMakeCollector();
  return Schema.encode(schema)(value).pipe(Effect.provideService(Transferable.Collector, collector), Effect.map(encoded => [encoded, collector.unsafeClear()]));
});
/**
 * @since 1.0.0
 * @category initial message
 */
export const layerInitialMessage = (schema, build) => Layer.effect(InitialMessage, Effect.contextWith(context => Effect.provide(Effect.orDie(makeInitialMessage(schema, build)), context)));
/**
 * @since 1.0.0
 * @category initial message
 */
export const initialMessage = schema => ProtocolTag.pipe(Effect.flatMap(protocol => protocol.initialMessage), Effect.flatten, Effect.flatMap(Schema.decodeUnknown(schema)));
//# sourceMappingURL=RpcWorker.js.map