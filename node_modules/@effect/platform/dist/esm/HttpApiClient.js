/**
 * @since 1.0.0
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import { identity } from "effect/Function";
import { globalValue } from "effect/GlobalValue";
import * as Option from "effect/Option";
import * as ParseResult from "effect/ParseResult";
import * as Schema from "effect/Schema";
import * as HttpApi from "./HttpApi.js";
import * as HttpApiSchema from "./HttpApiSchema.js";
import * as HttpBody from "./HttpBody.js";
import * as HttpClient from "./HttpClient.js";
import * as HttpClientError from "./HttpClientError.js";
import * as HttpClientRequest from "./HttpClientRequest.js";
import * as HttpClientResponse from "./HttpClientResponse.js";
import * as HttpMethod from "./HttpMethod.js";
import * as UrlParams from "./UrlParams.js";
/**
 * @internal
 */
const makeClient = (api, options) => Effect.gen(function* () {
  const context = yield* Effect.context();
  const httpClient = options.httpClient.pipe(options?.baseUrl === undefined ? identity : HttpClient.mapRequest(HttpClientRequest.prependUrl(options.baseUrl.toString())));
  HttpApi.reflect(api, {
    predicate: options?.predicate,
    onGroup(onGroupOptions) {
      options.onGroup?.(onGroupOptions);
    },
    onEndpoint(onEndpointOptions) {
      const {
        endpoint,
        errors,
        successes
      } = onEndpointOptions;
      const makeUrl = compilePath(endpoint.path);
      const decodeMap = {
        orElse: statusOrElse
      };
      const decodeResponse = HttpClientResponse.matchStatus(decodeMap);
      errors.forEach(({
        ast
      }, status) => {
        if (ast._tag === "None") {
          decodeMap[status] = statusCodeError;
          return;
        }
        const decode = schemaToResponse(ast.value);
        decodeMap[status] = response => Effect.flatMap(decode(response), Effect.fail);
      });
      successes.forEach(({
        ast
      }, status) => {
        decodeMap[status] = ast._tag === "None" ? responseAsVoid : schemaToResponse(ast.value);
      });
      const encodePath = endpoint.pathSchema.pipe(Option.map(Schema.encodeUnknown));
      const encodePayloadBody = endpoint.payloadSchema.pipe(Option.map(schema => {
        if (HttpMethod.hasBody(endpoint.method)) {
          return Schema.encodeUnknown(payloadSchemaBody(schema));
        }
        return Schema.encodeUnknown(schema);
      }));
      const encodeHeaders = endpoint.headersSchema.pipe(Option.map(Schema.encodeUnknown));
      const encodeUrlParams = endpoint.urlParamsSchema.pipe(Option.map(Schema.encodeUnknown));
      const endpointFn = Effect.fnUntraced(function* (request) {
        let httpRequest = HttpClientRequest.make(endpoint.method)(endpoint.path);
        if (request && request.path) {
          const encodedPathParams = encodePath._tag === "Some" ? yield* encodePath.value(request.path) : request.path;
          httpRequest = HttpClientRequest.setUrl(httpRequest, makeUrl(encodedPathParams));
        }
        if (request && request.payload instanceof FormData) {
          httpRequest = HttpClientRequest.bodyFormData(httpRequest, request.payload);
        } else if (encodePayloadBody._tag === "Some") {
          if (HttpMethod.hasBody(endpoint.method)) {
            const body = yield* encodePayloadBody.value(request.payload);
            httpRequest = HttpClientRequest.setBody(httpRequest, body);
          } else {
            const urlParams = yield* encodePayloadBody.value(request.payload);
            httpRequest = HttpClientRequest.setUrlParams(httpRequest, urlParams);
          }
        }
        if (encodeHeaders._tag === "Some") {
          httpRequest = HttpClientRequest.setHeaders(httpRequest, yield* encodeHeaders.value(request.headers));
        }
        if (encodeUrlParams._tag === "Some") {
          httpRequest = HttpClientRequest.appendUrlParams(httpRequest, yield* encodeUrlParams.value(request.urlParams));
        }
        const response = yield* httpClient.execute(httpRequest);
        const value = yield* options.transformResponse === undefined ? decodeResponse(response) : options.transformResponse(decodeResponse(response));
        return request?.withResponse === true ? [value, response] : value;
      }, Effect.mapInputContext(input => Context.merge(context, input)));
      options.onEndpoint({
        ...onEndpointOptions,
        endpointFn
      });
    }
  });
});
/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (api, options) => Effect.flatMap(HttpClient.HttpClient, httpClient => makeWith(api, {
  ...options,
  httpClient: options?.transformClient ? options.transformClient(httpClient) : httpClient
}));
/**
 * @since 1.0.0
 * @category constructors
 */
export const makeWith = (api, options) => {
  const client = {};
  return makeClient(api, {
    ...options,
    onGroup({
      group
    }) {
      if (group.topLevel) return;
      client[group.identifier] = {};
    },
    onEndpoint({
      endpoint,
      endpointFn,
      group
    }) {
      ;
      (group.topLevel ? client : client[group.identifier])[endpoint.name] = endpointFn;
    }
  }).pipe(Effect.map(() => client));
};
/**
 * @since 1.0.0
 * @category constructors
 */
export const group = (api, options) => {
  const client = {};
  return makeClient(api, {
    ...options,
    predicate: ({
      group
    }) => group.identifier === options.group,
    onEndpoint({
      endpoint,
      endpointFn
    }) {
      client[endpoint.name] = endpointFn;
    }
  }).pipe(Effect.map(() => client));
};
/**
 * @since 1.0.0
 * @category constructors
 */
export const endpoint = (api, options) => {
  let client = undefined;
  return makeClient(api, {
    ...options,
    predicate: ({
      endpoint,
      group
    }) => group.identifier === options.group && endpoint.name === options.endpoint,
    onEndpoint({
      endpointFn
    }) {
      client = endpointFn;
    }
  }).pipe(Effect.map(() => client));
};
// ----------------------------------------------------------------------------
const paramsRegex = /:(\w+)\??/g;
const compilePath = path => {
  const segments = path.split(paramsRegex);
  const len = segments.length;
  if (len === 1) {
    return _ => path;
  }
  return params => {
    let url = segments[0];
    for (let i = 1; i < len; i++) {
      if (i % 2 === 0) {
        url += segments[i];
      } else {
        url += params[segments[i]];
      }
    }
    return url;
  };
};
const schemaToResponse = ast => {
  const encoding = HttpApiSchema.getEncoding(ast);
  const decode = Schema.decode(schemaFromArrayBuffer(ast, encoding));
  return response => Effect.flatMap(response.arrayBuffer, decode);
};
const Uint8ArrayFromArrayBuffer = /*#__PURE__*/Schema.transform(Schema.Unknown, Schema.Uint8ArrayFromSelf, {
  decode(fromA) {
    return new Uint8Array(fromA);
  },
  encode(arr) {
    return arr.byteLength === arr.buffer.byteLength ? arr.buffer : arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength);
  }
});
const StringFromArrayBuffer = /*#__PURE__*/Schema.transform(Schema.Unknown, Schema.String, {
  decode(fromA) {
    return new TextDecoder().decode(fromA);
  },
  encode(toI) {
    const arr = new TextEncoder().encode(toI);
    return arr.byteLength === arr.buffer.byteLength ? arr.buffer : arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength);
  }
});
const parseJsonOrVoid = /*#__PURE__*/Schema.transformOrFail(Schema.String, Schema.Unknown, {
  strict: true,
  decode: (i, _, ast) => {
    if (i === "") return ParseResult.succeed(void 0);
    return ParseResult.try({
      try: () => JSON.parse(i),
      catch: () => new ParseResult.Type(ast, i, "Could not parse JSON")
    });
  },
  encode: (a, _, ast) => {
    if (a === undefined) return ParseResult.succeed("");
    return ParseResult.try({
      try: () => JSON.stringify(a),
      catch: () => new ParseResult.Type(ast, a, "Could not encode as JSON")
    });
  }
});
const parseJsonArrayBuffer = /*#__PURE__*/Schema.compose(StringFromArrayBuffer, parseJsonOrVoid);
const schemaFromArrayBuffer = (ast, encoding) => {
  if (ast._tag === "Union") {
    return Schema.Union(...ast.types.map(ast => schemaFromArrayBuffer(ast, HttpApiSchema.getEncoding(ast, encoding))));
  }
  const schema = Schema.make(ast);
  switch (encoding.kind) {
    case "Json":
      {
        return Schema.compose(parseJsonArrayBuffer, schema);
      }
    case "UrlParams":
      {
        return Schema.compose(StringFromArrayBuffer, UrlParams.schemaParse(schema));
      }
    case "Uint8Array":
      {
        return Schema.compose(Uint8ArrayFromArrayBuffer, schema);
      }
    case "Text":
      {
        return Schema.compose(StringFromArrayBuffer, schema);
      }
  }
};
const statusOrElse = response => Effect.fail(new HttpClientError.ResponseError({
  reason: "Decode",
  request: response.request,
  response
}));
const statusCodeError = response => Effect.fail(new HttpClientError.ResponseError({
  reason: "StatusCode",
  request: response.request,
  response
}));
const responseAsVoid = _response => Effect.void;
const HttpBodyFromSelf = /*#__PURE__*/Schema.declare(HttpBody.isHttpBody);
const payloadSchemaBody = schema => {
  const members = schema.ast._tag === "Union" ? schema.ast.types : [schema.ast];
  return Schema.Union(...members.map(bodyFromPayload));
};
const bodyFromPayloadCache = /*#__PURE__*/globalValue("@effect/platform/HttpApiClient/bodyFromPayloadCache", () => new WeakMap());
const bodyFromPayload = ast => {
  if (bodyFromPayloadCache.has(ast)) {
    return bodyFromPayloadCache.get(ast);
  }
  const schema = Schema.make(ast);
  const encoding = HttpApiSchema.getEncoding(ast);
  const transform = Schema.transformOrFail(HttpBodyFromSelf, schema, {
    decode(fromA, _, ast) {
      return ParseResult.fail(new ParseResult.Forbidden(ast, fromA, "encode only schema"));
    },
    encode(toI, _, ast) {
      switch (encoding.kind) {
        case "Json":
          {
            try {
              return ParseResult.succeed(HttpBody.text(JSON.stringify(toI), encoding.contentType));
            } catch {
              return ParseResult.fail(new ParseResult.Type(ast, toI, "Could not encode as JSON"));
            }
          }
        case "Text":
          {
            if (typeof toI !== "string") {
              return ParseResult.fail(new ParseResult.Type(ast, toI, "Expected a string"));
            }
            return ParseResult.succeed(HttpBody.text(toI, encoding.contentType));
          }
        case "UrlParams":
          {
            return ParseResult.succeed(HttpBody.urlParams(UrlParams.fromInput(toI)));
          }
        case "Uint8Array":
          {
            if (!(toI instanceof Uint8Array)) {
              return ParseResult.fail(new ParseResult.Type(ast, toI, "Expected a Uint8Array"));
            }
            return ParseResult.succeed(HttpBody.uint8Array(toI, encoding.contentType));
          }
      }
    }
  });
  bodyFromPayloadCache.set(ast, transform);
  return transform;
};
//# sourceMappingURL=HttpApiClient.js.map