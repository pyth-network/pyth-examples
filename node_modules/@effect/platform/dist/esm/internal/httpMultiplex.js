import * as Arr from "effect/Array";
import * as Effect from "effect/Effect";
import * as Effectable from "effect/Effectable";
import { dual } from "effect/Function";
import * as Inspectable from "effect/Inspectable";
import * as Error from "../HttpServerError.js";
import * as ServerRequest from "../HttpServerRequest.js";
/** @internal */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpMultiplex");
class MultiplexImpl extends Effectable.Class {
  apps;
  [TypeId];
  constructor(apps) {
    super();
    this.apps = apps;
    this[TypeId] = TypeId;
    let execute = request => Effect.fail(new Error.RouteNotFound({
      request
    }));
    for (let i = apps.length - 1; i >= 0; i--) {
      const [predicate, app] = apps[i];
      const previous = execute;
      execute = request => Effect.flatMap(predicate(request), match => match ? app : previous(request));
    }
    this.execute = Effect.flatMap(ServerRequest.HttpServerRequest, execute);
  }
  execute;
  commit() {
    return this.execute;
  }
  [Inspectable.NodeInspectSymbol]() {
    return Inspectable.toJSON(this);
  }
  toString() {
    return Inspectable.format(this);
  }
  toJSON() {
    return {
      _id: "@effect/platform/HttpMultiplex"
    };
  }
}
/** @internal */
export const empty = /*#__PURE__*/new MultiplexImpl([]);
/** @internal */
export const make = apps => new MultiplexImpl(Arr.fromIterable(apps));
/** @internal */
export const add = /*#__PURE__*/dual(3, (self, predicate, app) => make([...self.apps, [predicate, app]]));
/** @internal */
export const headerExact = /*#__PURE__*/dual(4, (self, header, value, app) => add(self, req => req.headers[header] !== undefined ? Effect.succeed(req.headers[header] === value) : Effect.succeed(false), app));
/** @internal */
export const headerRegex = /*#__PURE__*/dual(4, (self, header, regex, app) => add(self, req => req.headers[header] !== undefined ? Effect.succeed(regex.test(req.headers[header])) : Effect.succeed(false), app));
/** @internal */
export const headerStartsWith = /*#__PURE__*/dual(4, (self, header, prefix, app) => add(self, req => req.headers[header] !== undefined ? Effect.succeed(req.headers[header].startsWith(prefix)) : Effect.succeed(false), app));
/** @internal */
export const headerEndsWith = /*#__PURE__*/dual(4, (self, header, suffix, app) => add(self, req => req.headers[header] !== undefined ? Effect.succeed(req.headers[header].endsWith(suffix)) : Effect.succeed(false), app));
/** @internal */
export const hostRegex = /*#__PURE__*/dual(3, (self, regex, app) => headerRegex(self, "host", regex, app));
/** @internal */
export const hostStartsWith = /*#__PURE__*/dual(3, (self, prefix, app) => headerStartsWith(self, "host", prefix, app));
/** @internal */
export const hostEndsWith = /*#__PURE__*/dual(3, (self, suffix, app) => headerEndsWith(self, "host", suffix, app));
/** @internal */
export const hostExact = /*#__PURE__*/dual(3, (self, host, app) => headerExact(self, "host", host, app));
//# sourceMappingURL=httpMultiplex.js.map