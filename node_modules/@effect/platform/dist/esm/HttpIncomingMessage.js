/**
 * @since 1.0.0
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import { dual } from "effect/Function";
import * as Inspectable from "effect/Inspectable";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as FileSystem from "./FileSystem.js";
import * as UrlParams from "./UrlParams.js";
/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpIncomingMessage");
/**
 * @since 1.0.0
 * @category schema
 */
export const schemaBodyJson = (schema, options) => {
  const parse = Schema.decodeUnknown(schema, options);
  return self => Effect.flatMap(self.json, parse);
};
/**
 * @since 1.0.0
 * @category schema
 */
export const schemaBodyUrlParams = (schema, options) => {
  const decode = UrlParams.schemaStruct(schema, options);
  return self => Effect.flatMap(self.urlParamsBody, decode);
};
/**
 * @since 1.0.0
 * @category schema
 */
export const schemaHeaders = (schema, options) => {
  const parse = Schema.decodeUnknown(schema, options);
  return self => parse(self.headers);
};
/**
 * @since 1.0.0
 * @category fiber refs
 */
export class MaxBodySize extends /*#__PURE__*/Context.Reference()("@effect/platform/HttpIncomingMessage/MaxBodySize", {
  defaultValue: Option.none
}) {}
/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withMaxBodySize = /*#__PURE__*/dual(2, (effect, size) => Effect.provideService(effect, MaxBodySize, Option.map(size, FileSystem.Size)));
/**
 * @since 1.0.0
 */
export const inspect = (self, that) => {
  const contentType = self.headers["content-type"] ?? "";
  let body;
  if (contentType.includes("application/json")) {
    try {
      body = Effect.runSync(self.json);
    } catch {
      //
    }
  } else if (contentType.includes("text/") || contentType.includes("urlencoded")) {
    try {
      body = Effect.runSync(self.text);
    } catch {
      //
    }
  }
  const obj = {
    ...that,
    headers: Inspectable.redact(self.headers),
    remoteAddress: self.remoteAddress.toJSON()
  };
  if (body !== undefined) {
    obj.body = body;
  }
  return obj;
};
//# sourceMappingURL=HttpIncomingMessage.js.map