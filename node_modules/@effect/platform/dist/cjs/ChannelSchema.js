"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.encodeUnknown = exports.encode = exports.duplexUnknown = exports.duplex = exports.decodeUnknown = exports.decode = void 0;
var Channel = _interopRequireWildcard(require("effect/Channel"));
var _Function = require("effect/Function");
var Schema = _interopRequireWildcard(require("effect/Schema"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category constructors
 */
const encode = schema => () => {
  const encode = Schema.encode(Schema.ChunkFromSelf(schema));
  const loop = Channel.readWithCause({
    onInput: input => Channel.zipRight(Channel.flatMap(encode(input), Channel.write), loop),
    onFailure: cause => Channel.failCause(cause),
    onDone: Channel.succeed
  });
  return loop;
};
/**
 * @since 1.0.0
 * @category constructors
 */
exports.encode = encode;
const encodeUnknown = exports.encodeUnknown = encode;
/**
 * @since 1.0.0
 * @category constructors
 */
const decode = schema => () => {
  const decode = Schema.decode(Schema.ChunkFromSelf(schema));
  const loop = Channel.readWithCause({
    onInput(chunk) {
      return decode(chunk).pipe(Channel.flatMap(Channel.write), Channel.zipRight(loop));
    },
    onFailure(cause) {
      return Channel.failCause(cause);
    },
    onDone(done) {
      return Channel.succeed(done);
    }
  });
  return loop;
};
/**
 * @since 1.0.0
 * @category constructors
 */
exports.decode = decode;
const decodeUnknown = exports.decodeUnknown = decode;
/**
 * @since 1.0.0
 * @category combinators
 */
const duplex = exports.duplex = /*#__PURE__*/(0, _Function.dual)(2, (self, options) => {
  const decode = Schema.decode(Schema.ChunkFromSelf(options.outputSchema));
  return (0, _Function.pipe)(encode(options.inputSchema)(), Channel.pipeTo(self), Channel.mapOutEffect(decode));
});
/**
 * @since 1.0.0
 * @category combinators
 */
const duplexUnknown = exports.duplexUnknown = duplex;
//# sourceMappingURL=ChannelSchema.js.map