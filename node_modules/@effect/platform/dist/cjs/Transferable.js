"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.unsafeMakeCollector = exports.schema = exports.makeCollector = exports.addAll = exports.Uint8Array = exports.MessagePort = exports.ImageData = exports.Collector = void 0;
var Context = _interopRequireWildcard(require("effect/Context"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var _Function = require("effect/Function");
var Option = _interopRequireWildcard(require("effect/Option"));
var ParseResult = _interopRequireWildcard(require("effect/ParseResult"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category tags
 */
class Collector extends /*#__PURE__*/Context.Tag("@effect/platform/Transferable/Collector")() {}
/**
 * @since 1.0.0
 * @category constructors
 */
exports.Collector = Collector;
const unsafeMakeCollector = () => {
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
exports.unsafeMakeCollector = unsafeMakeCollector;
const makeCollector = exports.makeCollector = /*#__PURE__*/Effect.sync(unsafeMakeCollector);
/**
 * @since 1.0.0
 * @category accessors
 */
const addAll = tranferables => Effect.flatMap(Effect.serviceOption(Collector), Option.match({
  onNone: () => Effect.void,
  onSome: _ => _.addAll(tranferables)
}));
/**
 * @since 1.0.0
 * @category schema
 */
exports.addAll = addAll;
const schema = exports.schema = /*#__PURE__*/(0, _Function.dual)(2, (self, f) => Schema.transformOrFail(Schema.encodedSchema(self), self, {
  strict: true,
  decode: ParseResult.succeed,
  encode: i => Effect.as(addAll(f(i)), i)
}));
/**
 * @since 1.0.0
 * @category schema
 */
const ImageData = exports.ImageData = /*#__PURE__*/schema(Schema.Any, _ => [_.data.buffer]);
/**
 * @since 1.0.0
 * @category schema
 */
const MessagePort = exports.MessagePort = /*#__PURE__*/schema(Schema.Any, _ => [_]);
/**
 * @since 1.0.0
 * @category schema
 */
const Uint8Array = exports.Uint8Array = /*#__PURE__*/schema(Schema.Uint8ArrayFromSelf, _ => [_.buffer]);
//# sourceMappingURL=Transferable.js.map