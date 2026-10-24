"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.HttpIncomingMessageImpl = void 0;
var Headers = _interopRequireWildcard(require("@effect/platform/Headers"));
var IncomingMessage = _interopRequireWildcard(require("@effect/platform/HttpIncomingMessage"));
var UrlParams = _interopRequireWildcard(require("@effect/platform/UrlParams"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Inspectable = _interopRequireWildcard(require("effect/Inspectable"));
var Option = _interopRequireWildcard(require("effect/Option"));
var NodeStream = _interopRequireWildcard(require("../NodeStream.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/** @internal */
class HttpIncomingMessageImpl extends Inspectable.Class {
  source;
  onError;
  remoteAddressOverride;
  [IncomingMessage.TypeId];
  constructor(source, onError, remoteAddressOverride) {
    super();
    this.source = source;
    this.onError = onError;
    this.remoteAddressOverride = remoteAddressOverride;
    this[IncomingMessage.TypeId] = IncomingMessage.TypeId;
  }
  get headers() {
    return Headers.fromInput(this.source.headers);
  }
  get remoteAddress() {
    return Option.fromNullable(this.remoteAddressOverride ?? this.source.socket.remoteAddress);
  }
  textEffect;
  get text() {
    if (this.textEffect) {
      return this.textEffect;
    }
    this.textEffect = Effect.runSync(Effect.cached(Effect.flatMap(IncomingMessage.MaxBodySize, maxBodySize => NodeStream.toString(() => this.source, {
      onFailure: this.onError,
      maxBytes: Option.getOrUndefined(maxBodySize)
    }))));
    return this.textEffect;
  }
  get unsafeText() {
    return Effect.runSync(this.text);
  }
  get json() {
    return Effect.tryMap(this.text, {
      try: _ => _ === "" ? null : JSON.parse(_),
      catch: this.onError
    });
  }
  get unsafeJson() {
    return Effect.runSync(this.json);
  }
  get urlParamsBody() {
    return Effect.flatMap(this.text, _ => Effect.try({
      try: () => UrlParams.fromInput(new URLSearchParams(_)),
      catch: this.onError
    }));
  }
  get stream() {
    return NodeStream.fromReadable(() => this.source, this.onError);
  }
  get arrayBuffer() {
    return Effect.flatMap(IncomingMessage.MaxBodySize, maxBodySize => NodeStream.toUint8Array(() => this.source, {
      onFailure: this.onError,
      maxBytes: Option.getOrUndefined(maxBodySize)
    }));
  }
}
exports.HttpIncomingMessageImpl = HttpIncomingMessageImpl;
//# sourceMappingURL=httpIncomingMessage.js.map