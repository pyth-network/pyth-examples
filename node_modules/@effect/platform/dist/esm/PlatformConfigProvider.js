/**
 * @since 1.0.0
 */
import * as Arr from "effect/Array";
import * as Cause from "effect/Cause";
import * as ConfigError from "effect/ConfigError";
import * as ConfigProvider from "effect/ConfigProvider";
import * as PathPatch from "effect/ConfigProviderPathPatch";
import * as Context from "effect/Context";
import * as DefaultServices from "effect/DefaultServices";
import * as Effect from "effect/Effect";
import * as Either from "effect/Either";
import * as HashSet from "effect/HashSet";
import * as Layer from "effect/Layer";
import { isPlatformError } from "./Error.js";
import * as FileSystem from "./FileSystem.js";
import * as internal from "./internal/platformConfigProvider.js";
import * as Path from "./Path.js";
/**
 * @since 1.0.0
 * @category constructors
 */
export const fromFileTree = options => Effect.Do.pipe(Effect.bind("path", () => Path.Path), Effect.bind("fs", () => FileSystem.FileSystem), Effect.map(({
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
    load: (pathSegments, config) => Effect.catchIf(readConfig(resolveFilePath(pathSegments), config), isPlatformError, handlePlatformError(pathSegments)),
    enumerateChildren: pathSegments => Effect.forEach(resolveEnumerableDirs(pathSegments), dir => fs.readDirectory(dir)).pipe(Effect.map(files => HashSet.fromIterable(files.flat())), Effect.catchIf(isPlatformError, handlePlatformError(pathSegments))),
    patch: PathPatch.empty
  }));
}));
/**
 * Add the file tree ConfigProvider to the environment, as a fallback to the current ConfigProvider.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerFileTreeAdd = options => fromFileTree(options).pipe(Effect.map(provider => Layer.fiberRefLocallyScopedWith(DefaultServices.currentServices, services => {
  const current = Context.get(services, ConfigProvider.ConfigProvider);
  return Context.add(services, ConfigProvider.ConfigProvider, ConfigProvider.orElse(current, () => provider));
})), Layer.unwrapEffect);
/**
 * Add the file tree ConfigProvider to the environment, replacing the current ConfigProvider.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerFileTree = options => fromFileTree(options).pipe(Effect.map(Layer.setConfigProvider), Layer.unwrapEffect);
/**
 * Create a dotenv ConfigProvider.
 *
 * @category constructors
 * @since 1.0.0
 */
export const fromDotEnv = internal.fromDotEnv;
/**
 * Add the dotenv ConfigProvider to the environment, as a fallback to the current ConfigProvider.
 * If the file is not found, a debug log is produced and empty layer is returned.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerDotEnvAdd = internal.layerDotEnvAdd;
/**
 * Add the dotenv ConfigProvider to the environment, replacing the current ConfigProvider.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerDotEnv = internal.layerDotEnv;
//# sourceMappingURL=PlatformConfigProvider.js.map