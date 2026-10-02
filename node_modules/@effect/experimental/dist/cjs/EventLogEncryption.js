"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeEncryptionSubtle = exports.layerSubtle = exports.EventLogEncryption = exports.EncryptedRemoteEntry = exports.EncryptedEntry = void 0;
var Context = _interopRequireWildcard(require("effect/Context"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Layer = _interopRequireWildcard(require("effect/Layer"));
var Redacted = _interopRequireWildcard(require("effect/Redacted"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
var _EventJournal = require("./EventJournal.js");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category models
 */
const EncryptedEntry = exports.EncryptedEntry = /*#__PURE__*/Schema.Struct({
  entryId: _EventJournal.EntryId,
  encryptedEntry: Schema.Uint8ArrayFromSelf
});
/**
 * @since 1.0.0
 * @category models
 */
const EncryptedRemoteEntry = exports.EncryptedRemoteEntry = /*#__PURE__*/Schema.Struct({
  sequence: Schema.Number,
  iv: Schema.Uint8ArrayFromSelf,
  entryId: _EventJournal.EntryId,
  encryptedEntry: Schema.Uint8ArrayFromSelf
});
/**
 * @since 1.0.0
 * @category encrytion
 */
class EventLogEncryption extends /*#__PURE__*/Context.Tag("@effect/experimental/EventLogEncryption")() {}
/**
 * @since 1.0.0
 * @category encrytion
 */
exports.EventLogEncryption = EventLogEncryption;
const makeEncryptionSubtle = crypto => Effect.sync(() => {
  const keyCache = new WeakMap();
  const getKey = identity => Effect.suspend(() => {
    if (keyCache.has(identity)) {
      return Effect.succeed(keyCache.get(identity));
    }
    return Effect.promise(() => crypto.subtle.importKey("raw", Redacted.value(identity.privateKey), "AES-GCM", true, ["encrypt", "decrypt"])).pipe(Effect.tap(key => {
      keyCache.set(identity, key);
    }));
  });
  return EventLogEncryption.of({
    encrypt: (identity, entries) => Effect.gen(function* () {
      const data = yield* Effect.orDie(_EventJournal.Entry.encodeArray(entries));
      const key = yield* getKey(identity);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encryptedEntries = yield* Effect.promise(() => Promise.all(data.map(entry => crypto.subtle.encrypt({
        name: "AES-GCM",
        iv,
        tagLength: 128
      }, key, entry))));
      return {
        iv,
        encryptedEntries: encryptedEntries.map(entry => new Uint8Array(entry))
      };
    }),
    decrypt: (identity, entries) => Effect.gen(function* () {
      const key = yield* getKey(identity);
      const decryptedData = (yield* Effect.promise(() => Promise.all(entries.map(data => crypto.subtle.decrypt({
        name: "AES-GCM",
        iv: data.iv,
        tagLength: 128
      }, key, data.encryptedEntry))))).map(buffer => new Uint8Array(buffer));
      const decoded = yield* Effect.orDie(_EventJournal.Entry.decodeArray(decryptedData));
      return decoded.map((entry, i) => new _EventJournal.RemoteEntry({
        remoteSequence: entries[i].sequence,
        entry
      }));
    }),
    sha256: data => Effect.promise(() => crypto.subtle.digest("SHA-256", data)).pipe(Effect.map(hash => new Uint8Array(hash))),
    sha256String: data => Effect.map(Effect.promise(() => crypto.subtle.digest("SHA-256", data)), hash => {
      const hashArray = Array.from(new Uint8Array(hash));
      const hashHex = hashArray.map(bytes => bytes.toString(16).padStart(2, "0")).join("");
      return hashHex;
    })
  });
});
/**
 * @since 1.0.0
 * @category encrytion
 */
exports.makeEncryptionSubtle = makeEncryptionSubtle;
const layerSubtle = exports.layerSubtle = /*#__PURE__*/Layer.suspend(() => Layer.effect(EventLogEncryption, makeEncryptionSubtle(globalThis.crypto)));
//# sourceMappingURL=EventLogEncryption.js.map