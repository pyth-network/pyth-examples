/**
 * @since 1.0.0
 */
import * as Duration from "effect/Duration";
import * as Either from "effect/Either";
import { dual, identity } from "effect/Function";
import * as Inspectable from "effect/Inspectable";
import * as Option from "effect/Option";
import { pipeArguments } from "effect/Pipeable";
import * as Predicate from "effect/Predicate";
import * as Record from "effect/Record";
import { TypeIdError } from "./Error.js";
/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/platform/Cookies");
/**
 * @since 1.0.0
 * @category refinements
 */
export const isCookies = u => Predicate.hasProperty(u, TypeId);
/**
 * @since 1.0.0
 * @category type ids
 */
export const CookieTypeId = /*#__PURE__*/Symbol.for("@effect/platform/Cookies/Cookie");
/**
 * @since 1.0.0
 * @category type ids
 */
export const ErrorTypeId = /*#__PURE__*/Symbol.for("@effect/platform/Cookies/CookieError");
/**
 * @since 1.0.0
 * @category errors
 */
export class CookiesError extends /*#__PURE__*/TypeIdError(ErrorTypeId, "CookieError") {
  get message() {
    return this.reason;
  }
}
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
    return pipeArguments(this, arguments);
  }
};
/**
 * Create a Cookies object from an Iterable
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromReadonlyRecord = cookies => {
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
export const fromIterable = cookies => {
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
export const fromSetCookie = headers => {
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
export const empty = /*#__PURE__*/fromIterable([]);
/**
 * @since 1.0.0
 * @category refinements
 */
export const isEmpty = self => Record.isEmptyRecord(self.cookies);
// eslint-disable-next-line no-control-regex
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
export function makeCookie(name, value, options) {
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
export const unsafeMakeCookie = (name, value, options) => Either.getOrThrowWith(makeCookie(name, value, options), identity);
/**
 * Add a cookie to a Cookies object
 *
 * @since 1.0.0
 * @category combinators
 */
export const setCookie = /*#__PURE__*/dual(2, (self, cookie) => fromReadonlyRecord(Record.set(self.cookies, cookie.name, cookie)));
/**
 * Add multiple cookies to a Cookies object
 *
 * @since 1.0.0
 * @category combinators
 */
export const setAllCookie = /*#__PURE__*/dual(2, (self, cookies) => {
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
export const merge = /*#__PURE__*/dual(2, (self, that) => fromReadonlyRecord({
  ...self.cookies,
  ...that.cookies
}));
/**
 * Remove a cookie by name
 *
 * @since 1.0.0
 * @category combinators
 */
export const remove = /*#__PURE__*/dual(2, (self, name) => fromReadonlyRecord(Record.remove(self.cookies, name)));
/**
 * Get a cookie from a Cookies object
 *
 * @since 1.0.0
 * @category combinators
 */
export const get = /*#__PURE__*/dual(args => isCookies(args[0]), (self, name) => Record.get(self.cookies, name));
/**
 * Get a cookie from a Cookies object
 *
 * @since 1.0.0
 * @category combinators
 */
export const getValue = /*#__PURE__*/dual(args => isCookies(args[0]), (self, name) => Option.map(Record.get(self.cookies, name), cookie => cookie.value));
/**
 * Add a cookie to a Cookies object
 *
 * @since 1.0.0
 * @category combinators
 */
export const set = /*#__PURE__*/dual(args => isCookies(args[0]), (self, name, value, options) => Either.map(makeCookie(name, value, options), cookie => fromReadonlyRecord(Record.set(self.cookies, name, cookie))));
/**
 * Add a cookie to a Cookies object
 *
 * @since 1.0.0
 * @category combinators
 */
export const unsafeSet = /*#__PURE__*/dual(args => isCookies(args[0]), (self, name, value, options) => fromReadonlyRecord(Record.set(self.cookies, name, unsafeMakeCookie(name, value, options))));
/**
 * Add multiple cookies to a Cookies object
 *
 * @since 1.0.0
 * @category combinators
 */
export const setAll = /*#__PURE__*/dual(2, (self, cookies) => {
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
export const unsafeSetAll = /*#__PURE__*/dual(2, (self, cookies) => Either.getOrThrowWith(setAll(self, cookies), identity));
/**
 * Serialize a cookie into a string
 *
 * Adapted from https://github.com/fastify/fastify-cookie under MIT License
 *
 * @since 1.0.0
 * @category encoding
 */
export function serializeCookie(self) {
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
export const toCookieHeader = self => Object.values(self.cookies).map(cookie => `${cookie.name}=${cookie.valueEncoded}`).join("; ");
/**
 * To record
 *
 * @since 1.0.0
 * @category encoding
 */
export const toRecord = self => {
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
export const toSetCookieHeaders = self => Object.values(self.cookies).map(serializeCookie);
/**
 * Parse a cookie header into a record of key-value pairs
 *
 * Adapted from https://github.com/fastify/fastify-cookie under MIT License
 *
 * @since 1.0.0
 * @category decoding
 */
export function parseHeader(header) {
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