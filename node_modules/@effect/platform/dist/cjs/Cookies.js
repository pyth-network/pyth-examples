"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isEmpty = exports.isCookies = exports.getValue = exports.get = exports.fromSetCookie = exports.fromReadonlyRecord = exports.fromIterable = exports.empty = exports.TypeId = exports.ErrorTypeId = exports.CookiesError = exports.CookieTypeId = void 0;
exports.makeCookie = makeCookie;
exports.merge = void 0;
exports.parseHeader = parseHeader;
exports.remove = void 0;
exports.serializeCookie = serializeCookie;
exports.unsafeSetAll = exports.unsafeSet = exports.unsafeMakeCookie = exports.toSetCookieHeaders = exports.toRecord = exports.toCookieHeader = exports.setCookie = exports.setAllCookie = exports.setAll = exports.set = void 0;
var Duration = _interopRequireWildcard(require("effect/Duration"));
var Either = _interopRequireWildcard(require("effect/Either"));
var _Function = require("effect/Function");
var Inspectable = _interopRequireWildcard(require("effect/Inspectable"));
var Option = _interopRequireWildcard(require("effect/Option"));
var _Pipeable = require("effect/Pipeable");
var Predicate = _interopRequireWildcard(require("effect/Predicate"));
var Record = _interopRequireWildcard(require("effect/Record"));
var _Error = require("./Error.js");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category type ids
 */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/platform/Cookies");
/**
 * @since 1.0.0
 * @category refinements
 */
const isCookies = u => Predicate.hasProperty(u, TypeId);
/**
 * @since 1.0.0
 * @category type ids
 */
exports.isCookies = isCookies;
const CookieTypeId = exports.CookieTypeId = /*#__PURE__*/Symbol.for("@effect/platform/Cookies/Cookie");
/**
 * @since 1.0.0
 * @category type ids
 */
const ErrorTypeId = exports.ErrorTypeId = /*#__PURE__*/Symbol.for("@effect/platform/Cookies/CookieError");
/**
 * @since 1.0.0
 * @category errors
 */
class CookiesError extends /*#__PURE__*/(0, _Error.TypeIdError)(ErrorTypeId, "CookieError") {
  get message() {
    return this.reason;
  }
}
exports.CookiesError = CookiesError;
const Proto = {
  [TypeId]: TypeId,
  ...Inspectable.BaseProto,
  toJSON() {
    return {
      _id: "@effect/platform/Cookies",
      cookies: Record.map(this.cookies, cookie => cookie.toJSON())
    };
  },
  pipe() {
    return (0, _Pipeable.pipeArguments)(this, arguments);
  }
};
/**
 * Create a Cookies object from an Iterable
 *
 * @since 1.0.0
 * @category constructors
 */
const fromReadonlyRecord = cookies => {
  const self = Object.create(Proto);
  self.cookies = cookies;
  return self;
};
/**
 * Create a Cookies object from an Iterable
 *
 * @since 1.0.0
 * @category constructors
 */
exports.fromReadonlyRecord = fromReadonlyRecord;
const fromIterable = cookies => {
  const record = {};
  for (const cookie of cookies) {
    record[cookie.name] = cookie;
  }
  return fromReadonlyRecord(record);
};
/**
 * Create a Cookies object from a set of Set-Cookie headers
 *
 * @since 1.0.0
 * @category constructors
 */
exports.fromIterable = fromIterable;
const fromSetCookie = headers => {
  const arrayHeaders = typeof headers === "string" ? [headers] : headers;
  const cookies = [];
  for (const header of arrayHeaders) {
    const cookie = parseSetCookie(header.trim());
    if (Option.isSome(cookie)) {
      cookies.push(cookie.value);
    }
  }
  return fromIterable(cookies);
};
exports.fromSetCookie = fromSetCookie;
function parseSetCookie(header) {
  const parts = header.split(";").map(_ => _.trim()).filter(_ => _ !== "");
  if (parts.length === 0) {
    return Option.none();
  }
  const firstEqual = parts[0].indexOf("=");
  if (firstEqual === -1) {
    return Option.none();
  }
  const name = parts[0].slice(0, firstEqual);
  if (!fieldContentRegExp.test(name)) {
    return Option.none();
  }
  const valueEncoded = parts[0].slice(firstEqual + 1);
  const value = tryDecodeURIComponent(valueEncoded);
  if (parts.length === 1) {
    return Option.some(Object.assign(Object.create(CookieProto), {
      name,
      value,
      valueEncoded
    }));
  }
  const options = {};
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const equalIndex = part.indexOf("=");
    const key = equalIndex === -1 ? part : part.slice(0, equalIndex).trim();
    const value = equalIndex === -1 ? undefined : part.slice(equalIndex + 1).trim();
    switch (key.toLowerCase()) {
      case "domain":
        {
          if (value === undefined) {
            break;
          }
          const domain = value.trim().replace(/^\./, "");
          if (domain) {
            options.domain = domain;
          }
          break;
        }
      case "expires":
        {
          if (value === undefined) {
            break;
          }
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            options.expires = date;
          }
          break;
        }
      case "max-age":
        {
          if (value === undefined) {
            break;
          }
          const maxAge = parseInt(value, 10);
          if (!isNaN(maxAge)) {
            options.maxAge = Duration.seconds(maxAge);
          }
          break;
        }
      case "path":
        {
          if (value === undefined) {
            break;
          }
          if (value[0] === "/") {
            options.path = value;
          }
          break;
        }
      case "priority":
        {
          if (value === undefined) {
            break;
          }
          switch (value.toLowerCase()) {
            case "low":
              options.priority = "low";
              break;
            case "medium":
              options.priority = "medium";
              break;
            case "high":
              options.priority = "high";
              break;
          }
          break;
        }
      case "httponly":
        {
          options.httpOnly = true;
          break;
        }
      case "secure":
        {
          options.secure = true;
          break;
        }
      case "partitioned":
        {
          options.partitioned = true;
          break;
        }
      case "samesite":
        {
          if (value === undefined) {
            break;
          }
          switch (value.toLowerCase()) {
            case "lax":
              options.sameSite = "lax";
              break;
            case "strict":
              options.sameSite = "strict";
              break;
            case "none":
              options.sameSite = "none";
              break;
          }
          break;
        }
    }
  }
  return Option.some(Object.assign(Object.create(CookieProto), {
    name,
    value,
    valueEncoded,
    options: Object.keys(options).length > 0 ? options : undefined
  }));
}
/**
 * An empty Cookies object
 *
 * @since 1.0.0
 * @category constructors
 */
const empty = exports.empty = /*#__PURE__*/fromIterable([]);
/**
 * @since 1.0.0
 * @category refinements
 */
const isEmpty = self => Record.isEmptyRecord(self.cookies);
// eslint-disable-next-line no-control-regex
exports.isEmpty = isEmpty;
const fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;
const CookieProto = {
  [CookieTypeId]: CookieTypeId,
  ...Inspectable.BaseProto,
  toJSON() {
    return {
      _id: "@effect/platform/Cookies/Cookie",
      name: this.name,
      value: this.value,
      options: this.options
    };
  }
};
/**
 * Create a new cookie
 *
 * @since 1.0.0
 * @category constructors
 */
function makeCookie(name, value, options) {
  if (!fieldContentRegExp.test(name)) {
    return Either.left(new CookiesError({
      reason: "InvalidName"
    }));
  }
  const encodedValue = encodeURIComponent(value);
  if (encodedValue && !fieldContentRegExp.test(encodedValue)) {
    return Either.left(new CookiesError({
      reason: "InvalidValue"
    }));
  }
  if (options !== undefined) {
    if (options.domain !== undefined && !fieldContentRegExp.test(options.domain)) {
      return Either.left(new CookiesError({
        reason: "InvalidDomain"
      }));
    }
    if (options.path !== undefined && !fieldContentRegExp.test(options.path)) {
      return Either.left(new CookiesError({
        reason: "InvalidPath"
      }));
    }
    if (options.maxAge !== undefined && !Duration.isFinite(Duration.decode(options.maxAge))) {
      return Either.left(new CookiesError({
        reason: "InfinityMaxAge"
      }));
    }
  }
  return Either.right(Object.assign(Object.create(CookieProto), {
    name,
    value,
    valueEncoded: encodedValue,
    options
  }));
}
/**
 * Create a new cookie, throwing an error if invalid
 *
 * @since 1.0.0
 * @category constructors
 */
const unsafeMakeCookie = (name, value, options) => Either.getOrThrowWith(makeCookie(name, value, options), _Function.identity);
/**
 * Add a cookie to a Cookies object
 *
 * @since 1.0.0
 * @category combinators
 */
exports.unsafeMakeCookie = unsafeMakeCookie;
const setCookie = exports.setCookie = /*#__PURE__*/(0, _Function.dual)(2, (self, cookie) => fromReadonlyRecord(Record.set(self.cookies, cookie.name, cookie)));
/**
 * Add multiple cookies to a Cookies object
 *
 * @since 1.0.0
 * @category combinators
 */
const setAllCookie = exports.setAllCookie = /*#__PURE__*/(0, _Function.dual)(2, (self, cookies) => {
  const record = {
    ...self.cookies
  };
  for (const cookie of cookies) {
    record[cookie.name] = cookie;
  }
  return fromReadonlyRecord(record);
});
/**
 * Combine two Cookies objects, removing duplicates from the first
 *
 * @since 1.0.0
 * @category combinators
 */
const merge = exports.merge = /*#__PURE__*/(0, _Function.dual)(2, (self, that) => fromReadonlyRecord({
  ...self.cookies,
  ...that.cookies
}));
/**
 * Remove a cookie by name
 *
 * @since 1.0.0
 * @category combinators
 */
const remove = exports.remove = /*#__PURE__*/(0, _Function.dual)(2, (self, name) => fromReadonlyRecord(Record.remove(self.cookies, name)));
/**
 * Get a cookie from a Cookies object
 *
 * @since 1.0.0
 * @category combinators
 */
const get = exports.get = /*#__PURE__*/(0, _Function.dual)(args => isCookies(args[0]), (self, name) => Record.get(self.cookies, name));
/**
 * Get a cookie from a Cookies object
 *
 * @since 1.0.0
 * @category combinators
 */
const getValue = exports.getValue = /*#__PURE__*/(0, _Function.dual)(args => isCookies(args[0]), (self, name) => Option.map(Record.get(self.cookies, name), cookie => cookie.value));
/**
 * Add a cookie to a Cookies object
 *
 * @since 1.0.0
 * @category combinators
 */
const set = exports.set = /*#__PURE__*/(0, _Function.dual)(args => isCookies(args[0]), (self, name, value, options) => Either.map(makeCookie(name, value, options), cookie => fromReadonlyRecord(Record.set(self.cookies, name, cookie))));
/**
 * Add a cookie to a Cookies object
 *
 * @since 1.0.0
 * @category combinators
 */
const unsafeSet = exports.unsafeSet = /*#__PURE__*/(0, _Function.dual)(args => isCookies(args[0]), (self, name, value, options) => fromReadonlyRecord(Record.set(self.cookies, name, unsafeMakeCookie(name, value, options))));
/**
 * Add multiple cookies to a Cookies object
 *
 * @since 1.0.0
 * @category combinators
 */
const setAll = exports.setAll = /*#__PURE__*/(0, _Function.dual)(2, (self, cookies) => {
  const record = {
    ...self.cookies
  };
  for (const [name, value, options] of cookies) {
    const either = makeCookie(name, value, options);
    if (Either.isLeft(either)) {
      return either;
    }
    record[name] = either.right;
  }
  return Either.right(fromReadonlyRecord(record));
});
/**
 * Add multiple cookies to a Cookies object, throwing an error if invalid
 *
 * @since 1.0.0
 * @category combinators
 */
const unsafeSetAll = exports.unsafeSetAll = /*#__PURE__*/(0, _Function.dual)(2, (self, cookies) => Either.getOrThrowWith(setAll(self, cookies), _Function.identity));
/**
 * Serialize a cookie into a string
 *
 * Adapted from https://github.com/fastify/fastify-cookie under MIT License
 *
 * @since 1.0.0
 * @category encoding
 */
function serializeCookie(self) {
  let str = self.name + "=" + self.valueEncoded;
  if (self.options === undefined) {
    return str;
  }
  const options = self.options;
  if (options.maxAge !== undefined) {
    const maxAge = Duration.toSeconds(options.maxAge);
    str += "; Max-Age=" + Math.trunc(maxAge);
  }
  if (options.domain !== undefined) {
    str += "; Domain=" + options.domain;
  }
  if (options.path !== undefined) {
    str += "; Path=" + options.path;
  }
  if (options.priority !== undefined) {
    switch (options.priority) {
      case "low":
        str += "; Priority=Low";
        break;
      case "medium":
        str += "; Priority=Medium";
        break;
      case "high":
        str += "; Priority=High";
        break;
    }
  }
  if (options.expires !== undefined) {
    str += "; Expires=" + options.expires.toUTCString();
  }
  if (options.httpOnly) {
    str += "; HttpOnly";
  }
  if (options.secure) {
    str += "; Secure";
  }
  // Draft implementation to support Chrome from 2024-Q1 forward.
  // See https://datatracker.ietf.org/doc/html/draft-cutler-httpbis-partitioned-cookies#section-2.1
  if (options.partitioned) {
    str += "; Partitioned";
  }
  if (options.sameSite !== undefined) {
    switch (options.sameSite) {
      case "lax":
        str += "; SameSite=Lax";
        break;
      case "strict":
        str += "; SameSite=Strict";
        break;
      case "none":
        str += "; SameSite=None";
        break;
    }
  }
  return str;
}
/**
 * Serialize a Cookies object into a Cookie header
 *
 * @since 1.0.0
 * @category encoding
 */
const toCookieHeader = self => Object.values(self.cookies).map(cookie => `${cookie.name}=${cookie.valueEncoded}`).join("; ");
/**
 * To record
 *
 * @since 1.0.0
 * @category encoding
 */
exports.toCookieHeader = toCookieHeader;
const toRecord = self => {
  const record = {};
  const cookies = Object.values(self.cookies);
  for (let index = 0; index < cookies.length; index++) {
    const cookie = cookies[index];
    record[cookie.name] = cookie.value;
  }
  return record;
};
/**
 * Serialize a Cookies object into Headers object containing one or more Set-Cookie headers
 *
 * @since 1.0.0
 * @category encoding
 */
exports.toRecord = toRecord;
const toSetCookieHeaders = self => Object.values(self.cookies).map(serializeCookie);
/**
 * Parse a cookie header into a record of key-value pairs
 *
 * Adapted from https://github.com/fastify/fastify-cookie under MIT License
 *
 * @since 1.0.0
 * @category decoding
 */
exports.toSetCookieHeaders = toSetCookieHeaders;
function parseHeader(header) {
  const result = {};
  const strLen = header.length;
  let pos = 0;
  let terminatorPos = 0;
  while (true) {
    if (terminatorPos === strLen) break;
    terminatorPos = header.indexOf(";", pos);
    if (terminatorPos === -1) terminatorPos = strLen; // This is the last pair
    let eqIdx = header.indexOf("=", pos);
    if (eqIdx === -1) break; // No key-value pairs left
    if (eqIdx > terminatorPos) {
      // Malformed key-value pair
      pos = terminatorPos + 1;
      continue;
    }
    const key = header.substring(pos, eqIdx++).trim();
    if (result[key] === undefined) {
      const val = header.charCodeAt(eqIdx) === 0x22 ? header.substring(eqIdx + 1, terminatorPos - 1).trim() : header.substring(eqIdx, terminatorPos).trim();
      result[key] = !(val.indexOf("%") === -1) ? tryDecodeURIComponent(val) : val;
    }
    pos = terminatorPos + 1;
  }
  return result;
}
const tryDecodeURIComponent = str => {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
};
//# sourceMappingURL=Cookies.js.map