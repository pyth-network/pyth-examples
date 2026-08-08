import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Exit from "effect/Exit";
import * as FiberRef from "effect/FiberRef";
import * as Hash from "effect/Hash";
import * as MutableHashMap from "effect/MutableHashMap";
import * as Option from "effect/Option";
import * as Request from "effect/Request";
import * as RequestResolver from "effect/RequestResolver";
import * as Schema from "effect/Schema";
import * as Tracer from "effect/Tracer";
import * as internalClient from "./internal/client.js";
import { ResultLengthMismatch } from "./SqlError.js";
const SqlRequestProto = {
  ...Request.Class.prototype,
  [Equal.symbol](that) {
    return this._tag === that._tag && Equal.equals(this.input, that.input);
  },
  [Hash.symbol]() {
    return Hash.cached(this, Hash.combine(Hash.hash(this.input))(Hash.string(this._tag)));
  }
};
const makeRequest = (tag, input, encoded, span) => {
  const self = Object.create(SqlRequestProto);
  self._tag = tag;
  self.spanLink = {
    _tag: "SpanLink",
    span,
    attributes: {}
  };
  self.input = input;
  self.encoded = encoded;
  return self;
};
const partitionRequests = requests => {
  const len = requests.length;
  const inputs = new Array(len);
  const spanLinks = new Array(len);
  for (let i = 0; i < len; i++) {
    const request = requests[i];
    inputs[i] = request.encoded;
    spanLinks[i] = request.spanLink;
  }
  return [inputs, spanLinks];
};
const partitionRequestsById = () => requests => {
  const len = requests.length;
  const inputs = new Array(len);
  const spanLinks = new Array(len);
  const byIdMap = MutableHashMap.empty();
  for (let i = 0; i < len; i++) {
    const request = requests[i];
    inputs[i] = request.encoded;
    spanLinks[i] = request.spanLink;
    MutableHashMap.set(byIdMap, request.input, request);
  }
  return [inputs, spanLinks, byIdMap];
};
const makeResolver = (self, tag, Request, withContext) => {
  function make(context) {
    const encode = Schema.encode(Request);
    function makeExecute(self) {
      return function (input) {
        return Effect.useSpan(`sql.Resolver.execute ${tag}`, {
          kind: "client",
          captureStackTrace: false
        }, span => Effect.withFiberRuntime(fiber => {
          span.attribute("request.input", input);
          const currentContext = fiber.currentContext;
          const connection = currentContext.unsafeMap.get(internalClient.TransactionConnection.key);
          let toProvide = context;
          if (connection !== undefined) {
            if (toProvide === undefined) {
              toProvide = Context.make(internalClient.TransactionConnection, connection);
            } else {
              toProvide = Context.add(toProvide, internalClient.TransactionConnection, connection);
            }
          }
          const resolver = toProvide === undefined ? self : RequestResolver.provideContext(self, toProvide);
          return Effect.flatMap(encode(input), encoded => Effect.request(makeRequest(tag, input, encoded, span), resolver));
        }));
      };
    }
    return Object.assign(self, {
      request(input) {
        return Effect.withFiberRuntime(fiber => {
          const span = fiber.currentContext.unsafeMap.get(Tracer.ParentSpan.key);
          return Effect.map(encode(input), encoded => makeRequest(tag, input, encoded, span));
        });
      },
      cachePopulate(input, value) {
        return Effect.cacheRequestResult(makeRequest(tag, input, null, null), Exit.succeed(value));
      },
      cacheInvalidate(input) {
        return Effect.withFiberRuntime(fiber => {
          const cache = fiber.getFiberRef(FiberRef.currentRequestCache);
          return cache.invalidate(makeRequest(tag, input, null, null));
        });
      },
      makeExecute,
      execute: makeExecute(self)
    });
  }
  return withContext === true ? Effect.map(Effect.context(), make) : Effect.succeed(make(undefined));
};
/**
 * Create a resolver for a sql query with a request schema and a result schema.
 *
 * The request schema is used to validate the input of the query.
 * The result schema is used to validate the output of the query.
 *
 * Results are mapped to the requests in order, so the length of the results must match the length of the requests.
 *
 * @since 1.0.0
 * @category resolvers
 */
export const ordered = (tag, options) => {
  const decodeResults = Schema.decodeUnknown(Schema.Array(options.Result));
  const resolver = RequestResolver.makeBatched(requests => {
    const [inputs, spanLinks] = partitionRequests(requests);
    return options.execute(inputs).pipe(Effect.filterOrFail(results => results.length === inputs.length, ({
      length
    }) => new ResultLengthMismatch({
      expected: inputs.length,
      actual: length
    })), Effect.flatMap(decodeResults), Effect.flatMap(Effect.forEach((result, i) => Request.succeed(requests[i], result), {
      discard: true
    })), Effect.catchAllCause(cause => Effect.forEach(requests, request => Request.failCause(request, cause), {
      discard: true
    })), Effect.withSpan(`sql.Resolver.batch ${tag}`, {
      kind: "client",
      links: spanLinks,
      attributes: {
        "request.count": inputs.length
      },
      captureStackTrace: false
    }));
  }).identified(`@effect/sql/SqlResolver.ordered/${tag}`);
  return makeResolver(resolver, tag, options.Request, options.withContext);
};
/**
 * Create a resolver the can return multiple results for a single request.
 *
 * Results are grouped by a common key extracted from the request and result.
 *
 * @since 1.0.0
 * @category resolvers
 */
export const grouped = (tag, options) => {
  const decodeResults = Schema.decodeUnknown(Schema.Array(options.Result));
  const resolver = RequestResolver.makeBatched(requests => {
    const [inputs, spanLinks] = partitionRequests(requests);
    const resultMap = MutableHashMap.empty();
    return options.execute(inputs).pipe(Effect.bindTo("rawResults"), Effect.bind("results", ({
      rawResults
    }) => decodeResults(rawResults)), Effect.tap(({
      rawResults,
      results
    }) => {
      for (let i = 0, len = results.length; i < len; i++) {
        const result = results[i];
        const key = options.ResultGroupKey(result, rawResults[i]);
        const group = MutableHashMap.get(resultMap, key);
        if (group._tag === "None") {
          MutableHashMap.set(resultMap, key, [result]);
        } else {
          group.value.push(result);
        }
      }
      return Effect.forEach(requests, request => {
        const key = options.RequestGroupKey(request.input);
        const result = MutableHashMap.get(resultMap, key);
        return Request.succeed(request, result._tag === "None" ? [] : result.value);
      }, {
        discard: true
      });
    }), Effect.catchAllCause(cause => Effect.forEach(requests, request => Request.failCause(request, cause), {
      discard: true
    })), Effect.withSpan(`sql.Resolver.batch ${tag}`, {
      kind: "client",
      links: spanLinks,
      attributes: {
        "request.count": inputs.length
      },
      captureStackTrace: false
    }));
  }).identified(`@effect/sql/SqlResolver.grouped/${tag}`);
  return makeResolver(resolver, tag, options.Request, options.withContext);
};
/**
 * Create a resolver that resolves results by id.
 *
 * @since 1.0.0
 * @category resolvers
 */
export const findById = (tag, options) => {
  const decodeResults = Schema.decodeUnknown(Schema.Array(options.Result));
  const resolver = RequestResolver.makeBatched(requests => {
    const [inputs, spanLinks, idMap] = partitionRequestsById()(requests);
    return options.execute(inputs).pipe(Effect.bindTo("rawResults"), Effect.bind("results", ({
      rawResults
    }) => decodeResults(rawResults)), Effect.flatMap(({
      rawResults,
      results
    }) => Effect.forEach(results, (result, i) => {
      const id = options.ResultId(result, rawResults[i]);
      const request = MutableHashMap.get(idMap, id);
      if (request._tag === "None") {
        return Effect.void;
      }
      MutableHashMap.remove(idMap, id);
      return Request.succeed(request.value, Option.some(result));
    }, {
      discard: true
    })), Effect.tap(_ => {
      if (MutableHashMap.size(idMap) === 0) {
        return Effect.void;
      }
      return Effect.forEach(idMap, ([, request]) => Request.succeed(request, Option.none()), {
        discard: true
      });
    }), Effect.catchAllCause(cause => Effect.forEach(requests, request => Request.failCause(request, cause), {
      discard: true
    })), Effect.withSpan(`sql.Resolver.batch ${tag}`, {
      kind: "client",
      links: spanLinks,
      attributes: {
        "request.count": inputs.length
      },
      captureStackTrace: false
    }));
  }).identified(`@effect/sql/SqlResolver.findById/${tag}`);
  return makeResolver(resolver, tag, options.Id, options.withContext);
};
const void_ = (tag, options) => {
  const resolver = RequestResolver.makeBatched(requests => {
    const [inputs, spanLinks] = partitionRequests(requests);
    return options.execute(inputs).pipe(Effect.andThen(Effect.forEach(requests, request => Request.complete(request, Exit.void), {
      discard: true
    })), Effect.catchAllCause(cause => Effect.forEach(requests, request => Request.failCause(request, cause), {
      discard: true
    })), Effect.withSpan(`sql.Resolver.batch ${tag}`, {
      kind: "client",
      links: spanLinks,
      attributes: {
        "request.count": inputs.length
      },
      captureStackTrace: false
    }));
  }).identified(`@effect/sql/SqlResolver.void/${tag}`);
  return makeResolver(resolver, tag, options.Request, options.withContext);
};
export {
/**
 * Create a resolver that performs side effects.
 *
 * @since 1.0.0
 * @category resolvers
 */
void_ as void };
//# sourceMappingURL=SqlResolver.js.map