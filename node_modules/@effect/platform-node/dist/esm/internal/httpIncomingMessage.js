import * as Headers from "@effect/platform/Headers";
import * as IncomingMessage from "@effect/platform/HttpIncomingMessage";
import * as UrlParams from "@effect/platform/UrlParams";
import * as Effect from "effect/Effect";
import * as Inspectable from "effect/Inspectable";
import * as Option from "effect/Option";
import * as NodeStream from "../NodeStream.js";
/** @internal */
export class HttpIncomingMessageImpl extends Inspectable.Class {
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
//# sourceMappingURL=httpIncomingMessage.js.map