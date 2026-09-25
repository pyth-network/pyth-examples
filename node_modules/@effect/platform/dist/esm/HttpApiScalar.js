/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { Api } from "./HttpApi.js";
import { Router } from "./HttpApiBuilder.js";
import * as HttpLayerRouter from "./HttpLayerRouter.js";
import * as HttpServerResponse from "./HttpServerResponse.js";
import * as Html from "./internal/html.js";
import * as internal from "./internal/httpApiScalar.js";
import * as OpenApi from "./OpenApi.js";
const makeHandler = options => {
  const spec = OpenApi.fromApi(options.api);
  const source = options?.source;
  const defaultScript = internal.javascript;
  const src = source ? typeof source === "string" ? source : source.type === "cdn" ? `https://cdn.jsdelivr.net/npm/@scalar/api-reference@${source.version ?? "latest"}/dist/browser/standalone.min.js` : null : null;
  const scalarConfig = {
    _integration: "http",
    ...options?.scalar
  };
  const response = HttpServerResponse.html(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${Html.escape(spec.info.title)}</title>
    ${!spec.info.description ? "" : `<meta name="description" content="${Html.escape(spec.info.description)}"/>`}
    ${!spec.info.description ? "" : `<meta name="og:description" content="${Html.escape(spec.info.description)}"/>`}
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference" type="application/json">
      ${Html.escapeJson(spec)}
    </script>
    <script>
      document.getElementById('api-reference').dataset.configuration = JSON.stringify(${Html.escapeJson(scalarConfig)})
    </script>
    ${src ? `<script src="${src}" crossorigin></script>` : `<script>${defaultScript}</script>`}
  </body>
</html>`);
  return Effect.succeed(response);
};
/**
 * @since 1.0.0
 * @category layers
 */
export const layer = options => Router.use(router => Effect.gen(function* () {
  const {
    api
  } = yield* Api;
  const handler = makeHandler({
    ...options,
    api
  });
  yield* router.get(options?.path ?? "/docs", handler);
}));
/**
 * @since 1.0.0
 * @category layers
 */
export const layerHttpLayerRouter = /*#__PURE__*/Effect.fnUntraced(function* (options) {
  const router = yield* HttpLayerRouter.HttpRouter;
  const handler = makeHandler(options);
  yield* router.add("GET", options.path, handler);
}, Layer.effectDiscard);
//# sourceMappingURL=HttpApiScalar.js.map