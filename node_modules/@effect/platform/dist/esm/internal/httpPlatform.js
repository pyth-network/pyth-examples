import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import { identity, pipe } from "effect/Function";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";
import * as Etag from "../Etag.js";
import * as FileSystem from "../FileSystem.js";
import * as Headers from "../Headers.js";
import * as serverResponse from "./httpServerResponse.js";
/** @internal */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpPlatform");
/** @internal */
export const tag = /*#__PURE__*/Context.GenericTag("@effect/platform/HttpPlatform");
/** @internal */
export const make = impl => Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const etagGen = yield* Etag.Generator;
  return tag.of({
    [TypeId]: TypeId,
    fileResponse(path, options) {
      return pipe(Effect.bindTo(fs.stat(path), "info"), Effect.bind("etag", ({
        info
      }) => etagGen.fromFileInfo(info)), Effect.map(({
        etag,
        info
      }) => {
        const start = Number(options?.offset ?? 0);
        const end = options?.bytesToRead !== undefined ? start + Number(options.bytesToRead) : undefined;
        const headers = Headers.set(options?.headers ? Headers.fromInput(options.headers) : Headers.empty, "etag", Etag.toString(etag));
        if (info.mtime._tag === "Some") {
          ;
          headers["last-modified"] = info.mtime.value.toUTCString();
        }
        const contentLength = end !== undefined ? end - start : Number(info.size) - start;
        return impl.fileResponse(path, options?.status ?? 200, options?.statusText, headers, start, end, contentLength);
      }));
    },
    fileWebResponse(file, options) {
      return Effect.map(etagGen.fromFileWeb(file), etag => {
        const headers = Headers.merge(options?.headers ? Headers.fromInput(options.headers) : Headers.empty, Headers.unsafeFromRecord({
          etag: Etag.toString(etag),
          "last-modified": new Date(file.lastModified).toUTCString()
        }));
        return impl.fileWebResponse(file, options?.status ?? 200, options?.statusText, headers, options);
      });
    }
  });
});
/** @internal */
export const layer = /*#__PURE__*/Layer.effect(tag, Effect.flatMap(FileSystem.FileSystem, fs => make({
  fileResponse(path, status, statusText, headers, start, end, contentLength) {
    return serverResponse.stream(fs.stream(path, {
      offset: start,
      bytesToRead: end !== undefined ? end - start : undefined
    }), {
      contentLength,
      headers,
      status,
      statusText
    });
  },
  fileWebResponse(file, status, statusText, headers, _options) {
    return serverResponse.stream(Stream.fromReadableStream(() => file.stream(), identity), {
      headers,
      status,
      statusText
    });
  }
}))).pipe(/*#__PURE__*/Layer.provide(Etag.layerWeak));
//# sourceMappingURL=httpPlatform.js.map