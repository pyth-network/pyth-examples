"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.layerFileTreeAdd = exports.layerFileTree = exports.layerDotEnvAdd = exports.layerDotEnv = exports.fromFileTree = exports.fromDotEnv = void 0;
var Arr = _interopRequireWildcard(require("effect/Array"));
var Cause = _interopRequireWildcard(require("effect/Cause"));
var ConfigError = _interopRequireWildcard(require("effect/ConfigError"));
var ConfigProvider = _interopRequireWildcard(require("effect/ConfigProvider"));
var PathPatch = _interopRequireWildcard(require("effect/ConfigProviderPathPatch"));
var Context = _interopRequireWildcard(require("effect/Context"));
var DefaultServices = _interopRequireWildcard(require("effect/DefaultServices"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Either = _interopRequireWildcard(require("effect/Either"));
var HashSet = _interopRequireWildcard(require("effect/HashSet"));
var Layer = _interopRequireWildcard(require("effect/Layer"));
var _Error = require("./Error.js");
var FileSystem = _interopRequireWildcard(require("./FileSystem.js"));
var internal = _interopRequireWildcard(require("./internal/platformConfigProvider.js"));
var Path = _interopRequireWildcard(require("./Path.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category constructors
 */
const fromFileTree = options => Effect.Do.pipe(Effect.bind("path", () => Path.Path), Effect.bind("fs", () => FileSystem.FileSystem), Effect.map(({
  fs,
  path
}) => {
  const rootDirectory = options?.rootDirectory ?? "/";
  const parseConfig = primitive => value => Either.map(primitive.parse(value.trim()), Arr.of);
  const readConfig = (filePath, primitive) => Effect.flatMap(fs.readFileString(filePath), parseConfig(primitive));
  const resolveEnumerableDirs = segments => segments.length === 0 ? [] : [path.join(...segments)];
  const resolveFilePath = pathSegments => path.join(rootDirectory, ...pathSegments);
  const sourceError = (pathSegments, error) => ConfigError.SourceUnavailable([...pathSegments], error.description ?? error.message, Cause.fail(error));
  const pathNotFoundError = pathSegments => ConfigError.MissingData([...pathSegments], `Path ${resolveFilePath(pathSegments)} not found`);
  const handlePlatformError = pathSegments => error => error._tag === "SystemError" && error.reason === "NotFound" ? Effect.fail(pathNotFoundError(pathSegments)) : Effect.fail(sourceError(pathSegments, error));
  return ConfigProvider.fromFlat(ConfigProvider.makeFlat({
    load: (pathSegments, config) => Effect.catchIf(readConfig(resolveFilePath(pathSegments), config), _Error.isPlatformError, handlePlatformError(pathSegments)),
    enumerateChildren: pathSegments => Effect.forEach(resolveEnumerableDirs(pathSegments), dir => fs.readDirectory(dir)).pipe(Effect.map(files => HashSet.fromIterable(files.flat())), Effect.catchIf(_Error.isPlatformError, handlePlatformError(pathSegments))),
    patch: PathPatch.empty
  }));
}));
/**
 * Add the file tree ConfigProvider to the environment, as a fallback to the current ConfigProvider.
 *
 * @since 1.0.0
 * @category layers
 */
exports.fromFileTree = fromFileTree;
const layerFileTreeAdd = options => fromFileTree(options).pipe(Effect.map(provider => Layer.fiberRefLocallyScopedWith(DefaultServices.currentServices, services => {
  const current = Context.get(services, ConfigProvider.ConfigProvider);
  return Context.add(services, ConfigProvider.ConfigProvider, ConfigProvider.orElse(current, () => provider));
})), Layer.unwrapEffect);
/**
 * Add the file tree ConfigProvider to the environment, replacing the current ConfigProvider.
 *
 * @since 1.0.0
 * @category layers
 */
exports.layerFileTreeAdd = layerFileTreeAdd;
const layerFileTree = options => fromFileTree(options).pipe(Effect.map(Layer.setConfigProvider), Layer.unwrapEffect);
/**
 * Create a dotenv ConfigProvider.
 *
 * @category constructors
 * @since 1.0.0
 */
exports.layerFileTree = layerFileTree;
const fromDotEnv = exports.fromDotEnv = internal.fromDotEnv;
/**
 * Add the dotenv ConfigProvider to the environment, as a fallback to the current ConfigProvider.
 * If the file is not found, a debug log is produced and empty layer is returned.
 *
 * @since 1.0.0
 * @category layers
 */
const layerDotEnvAdd = exports.layerDotEnvAdd = internal.layerDotEnvAdd;
/**
 * Add the dotenv ConfigProvider to the environment, replacing the current ConfigProvider.
 *
 * @since 1.0.0
 * @category layers
 */
const layerDotEnv = exports.layerDotEnv = internal.layerDotEnv;
//# sourceMappingURL=PlatformConfigProvider.js.map