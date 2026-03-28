"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.make = exports.hostStartsWith = exports.hostRegex = exports.hostExact = exports.hostEndsWith = exports.headerStartsWith = exports.headerRegex = exports.headerExact = exports.headerEndsWith = exports.empty = exports.add = exports.TypeId = void 0;
var Arr = _interopRequireWildcard(require("effect/Array"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Effectable = _interopRequireWildcard(require("effect/Effectable"));
var _Function = require("effect/Function");
var Inspectable = _interopRequireWildcard(require("effect/Inspectable"));
var Error = _interopRequireWildcard(require("../HttpServerError.js"));
var ServerRequest = _interopRequireWildcard(require("../HttpServerRequest.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/** @internal */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpMultiplex");
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
const empty = exports.empty = /*#__PURE__*/new MultiplexImpl([]);
/** @internal */
const make = apps => new MultiplexImpl(Arr.fromIterable(apps));
/** @internal */
exports.make = make;
const add = exports.add = /*#__PURE__*/(0, _Function.dual)(3, (self, predicate, app) => make([...self.apps, [predicate, app]]));
/** @internal */
const headerExact = exports.headerExact = /*#__PURE__*/(0, _Function.dual)(4, (self, header, value, app) => add(self, req => req.headers[header] !== undefined ? Effect.succeed(req.headers[header] === value) : Effect.succeed(false), app));
/** @internal */
const headerRegex = exports.headerRegex = /*#__PURE__*/(0, _Function.dual)(4, (self, header, regex, app) => add(self, req => req.headers[header] !== undefined ? Effect.succeed(regex.test(req.headers[header])) : Effect.succeed(false), app));
/** @internal */
const headerStartsWith = exports.headerStartsWith = /*#__PURE__*/(0, _Function.dual)(4, (self, header, prefix, app) => add(self, req => req.headers[header] !== undefined ? Effect.succeed(req.headers[header].startsWith(prefix)) : Effect.succeed(false), app));
/** @internal */
const headerEndsWith = exports.headerEndsWith = /*#__PURE__*/(0, _Function.dual)(4, (self, header, suffix, app) => add(self, req => req.headers[header] !== undefined ? Effect.succeed(req.headers[header].endsWith(suffix)) : Effect.succeed(false), app));
/** @internal */
const hostRegex = exports.hostRegex = /*#__PURE__*/(0, _Function.dual)(3, (self, regex, app) => headerRegex(self, "host", regex, app));
/** @internal */
const hostStartsWith = exports.hostStartsWith = /*#__PURE__*/(0, _Function.dual)(3, (self, prefix, app) => headerStartsWith(self, "host", prefix, app));
/** @internal */
const hostEndsWith = exports.hostEndsWith = /*#__PURE__*/(0, _Function.dual)(3, (self, suffix, app) => headerEndsWith(self, "host", suffix, app));
/** @internal */
const hostExact = exports.hostExact = /*#__PURE__*/(0, _Function.dual)(3, (self, host, app) => headerExact(self, "host", host, app));
//# sourceMappingURL=httpMultiplex.js.map