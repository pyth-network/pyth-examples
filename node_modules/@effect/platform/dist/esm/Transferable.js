/**
 * @since 1.0.0
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import { dual } from "effect/Function";
import * as Option from "effect/Option";
import * as ParseResult from "effect/ParseResult";
import * as Schema from "effect/Schema";
/**
 * @since 1.0.0
 * @category tags
 */
export class Collector extends /*#__PURE__*/Context.Tag("@effect/platform/Transferable/Collector")() {}
/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeMakeCollector = () => {
  let tranferables = [];
  const unsafeAddAll = transfers => {
    // eslint-disable-next-line no-restricted-syntax
    tranferables.push(...transfers);
  };
  const unsafeRead = () => tranferables;
  const unsafeClear = () => {
    const prev = tranferables;
    tranferables = [];
    return prev;
  };
  return Collector.of({
    unsafeAddAll,
    addAll: transferables => Effect.sync(() => unsafeAddAll(transferables)),
    unsafeRead,
    read: Effect.sync(unsafeRead),
    unsafeClear,
    clear: Effect.sync(unsafeClear)
  });
};
/**
 * @since 1.0.0
 * @category constructors
 */
export const makeCollector = /*#__PURE__*/Effect.sync(unsafeMakeCollector);
/**
 * @since 1.0.0
 * @category accessors
 */
export const addAll = tranferables => Effect.flatMap(Effect.serviceOption(Collector), Option.match({
  onNone: () => Effect.void,
  onSome: _ => _.addAll(tranferables)
}));
/**
 * @since 1.0.0
 * @category schema
 */
export const schema = /*#__PURE__*/dual(2, (self, f) => Schema.transformOrFail(Schema.encodedSchema(self), self, {
  strict: true,
  decode: ParseResult.succeed,
  encode: i => Effect.as(addAll(f(i)), i)
}));
/**
 * @since 1.0.0
 * @category schema
 */
export const ImageData = /*#__PURE__*/schema(Schema.Any, _ => [_.data.buffer]);
/**
 * @since 1.0.0
 * @category schema
 */
export const MessagePort = /*#__PURE__*/schema(Schema.Any, _ => [_]);
/**
 * @since 1.0.0
 * @category schema
 */
export const Uint8Array = /*#__PURE__*/schema(Schema.Uint8ArrayFromSelf, _ => [_.buffer]);
//# sourceMappingURL=Transferable.js.map