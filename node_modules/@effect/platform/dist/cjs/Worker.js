"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeSerialized = exports.makePoolSerializedLayer = exports.makePoolSerialized = exports.makePoolLayer = exports.makePool = exports.makePlatform = exports.makeManager = exports.layerSpawner = exports.layerManager = exports.WorkerManagerTypeId = exports.WorkerManager = exports.Spawner = exports.PlatformWorkerTypeId = exports.PlatformWorker = void 0;
var internal = _interopRequireWildcard(require("./internal/worker.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category type ids
 */
const PlatformWorkerTypeId = exports.PlatformWorkerTypeId = internal.PlatformWorkerTypeId;
/**
 * @since 1.0.0
 */
const makePlatform = exports.makePlatform = internal.makePlatform;
/**
 * @since 1.0.0
 * @category tags
 */
const PlatformWorker = exports.PlatformWorker = internal.PlatformWorker;
/**
 * @since 1.0.0
 * @category tags
 */
const Spawner = exports.Spawner = internal.Spawner;
/**
 * @since 1.0.0
 * @category type ids
 */
const WorkerManagerTypeId = exports.WorkerManagerTypeId = internal.WorkerManagerTypeId;
/**
 * @since 1.0.0
 * @category tags
 */
const WorkerManager = exports.WorkerManager = internal.WorkerManager;
/**
 * @since 1.0.0
 * @category constructors
 */
const makeManager = exports.makeManager = internal.makeManager;
/**
 * @since 1.0.0
 * @category layers
 */
const layerManager = exports.layerManager = internal.layerManager;
/**
 * @since 1.0.0
 * @category constructors
 */
const makePool = exports.makePool = internal.makePool;
/**
 * @since 1.0.0
 * @category constructors
 */
const makePoolLayer = exports.makePoolLayer = internal.makePoolLayer;
/**
 * @since 1.0.0
 * @category constructors
 */
const makeSerialized = exports.makeSerialized = internal.makeSerialized;
/**
 * @since 1.0.0
 * @category constructors
 */
const makePoolSerialized = exports.makePoolSerialized = internal.makePoolSerialized;
/**
 * @since 1.0.0
 * @category layers
 */
const makePoolSerializedLayer = exports.makePoolSerializedLayer = internal.makePoolSerializedLayer;
/**
 * @since 1.0.0
 * @category layers
 */
const layerSpawner = exports.layerSpawner = internal.layerSpawner;
//# sourceMappingURL=Worker.js.map