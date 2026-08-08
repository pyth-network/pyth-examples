"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.layer = void 0;
var Error = _interopRequireWildcard(require("@effect/platform/Error"));
var FileSystem = _interopRequireWildcard(require("@effect/platform/FileSystem"));
var ParcelWatcher = _interopRequireWildcard(require("@parcel/watcher"));
var Chunk = _interopRequireWildcard(require("effect/Chunk"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Layer = _interopRequireWildcard(require("effect/Layer"));
var Option = _interopRequireWildcard(require("effect/Option"));
var Stream = _interopRequireWildcard(require("effect/Stream"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
const watchParcel = path => Stream.asyncScoped(emit => Effect.acquireRelease(Effect.tryPromise({
  try: () => ParcelWatcher.subscribe(path, (cause, events) => {
    if (cause) {
      emit.fail(new Error.SystemError({
        reason: "Unknown",
        module: "FileSystem",
        method: "watch",
        pathOrDescriptor: path,
        cause
      }));
    } else {
      emit.chunk(Chunk.unsafeFromArray(events.map(event => {
        switch (event.type) {
          case "create":
            {
              return FileSystem.WatchEventCreate({
                path: event.path
              });
            }
          case "update":
            {
              return FileSystem.WatchEventUpdate({
                path: event.path
              });
            }
          case "delete":
            {
              return FileSystem.WatchEventRemove({
                path: event.path
              });
            }
        }
      })));
    }
  }),
  catch: cause => new Error.SystemError({
    reason: "Unknown",
    module: "FileSystem",
    method: "watch",
    pathOrDescriptor: path,
    cause
  })
}), sub => Effect.promise(() => sub.unsubscribe())));
const backend = /*#__PURE__*/FileSystem.WatchBackend.of({
  register(path, stat, _options) {
    if (stat.type !== "Directory") {
      return Option.none();
    }
    return Option.some(watchParcel(path));
  }
});
const layer = exports.layer = /*#__PURE__*/Layer.succeed(FileSystem.WatchBackend, backend);
//# sourceMappingURL=parcelWatcher.js.map