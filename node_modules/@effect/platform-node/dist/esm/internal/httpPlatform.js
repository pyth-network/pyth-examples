import * as EtagImpl from "@effect/platform/Etag";
import * as Headers from "@effect/platform/Headers";
import * as Platform from "@effect/platform/HttpPlatform";
import * as ServerResponse from "@effect/platform/HttpServerResponse";
import { pipe } from "effect/Function";
import * as Layer from "effect/Layer";
import Mime from "mime";
import * as Fs from "node:fs";
import { Readable } from "node:stream";
import * as FileSystem from "../NodeFileSystem.js";
/** @internal */
export const make = /*#__PURE__*/Platform.make({
  fileResponse(path, status, statusText, headers, start, end, contentLength) {
    const stream = Fs.createReadStream(path, {
      start,
      end
    });
    return ServerResponse.raw(stream, {
      headers: {
        ...headers,
        "content-type": headers["content-type"] ?? Mime.getType(path) ?? "application/octet-stream",
        "content-length": contentLength.toString()
      },
      status,
      statusText
    });
  },
  fileWebResponse(file, status, statusText, headers, _options) {
    return ServerResponse.raw(Readable.fromWeb(file.stream()), {
      headers: Headers.merge(headers, Headers.unsafeFromRecord({
        "content-type": headers["content-type"] ?? Mime.getType(file.name) ?? "application/octet-stream",
        "content-length": file.size.toString()
      })),
      status,
      statusText
    });
  }
});
/** @internal */
export const layer = /*#__PURE__*/pipe(/*#__PURE__*/Layer.effect(Platform.HttpPlatform, make), /*#__PURE__*/Layer.provide(FileSystem.layer), /*#__PURE__*/Layer.provide(EtagImpl.layer));
//# sourceMappingURL=httpPlatform.js.map