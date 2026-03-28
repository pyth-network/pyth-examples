"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.layerHttpLayerRouter = exports.layer = void 0;
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Layer = _interopRequireWildcard(require("effect/Layer"));
var _HttpApi = require("./HttpApi.js");
var _HttpApiBuilder = require("./HttpApiBuilder.js");
var HttpLayerRouter = _interopRequireWildcard(require("./HttpLayerRouter.js"));
var HttpServerResponse = _interopRequireWildcard(require("./HttpServerResponse.js"));
var Html = _interopRequireWildcard(require("./internal/html.js"));
var internal = _interopRequireWildcard(require("./internal/httpApiScalar.js"));
var OpenApi = _interopRequireWildcard(require("./OpenApi.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

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
const layer = options => _HttpApiBuilder.Router.use(router => Effect.gen(function* () {
  const {
    api
  } = yield* _HttpApi.Api;
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
exports.layer = layer;
const layerHttpLayerRouter = exports.layerHttpLayerRouter = /*#__PURE__*/Effect.fnUntraced(function* (options) {
  const router = yield* HttpLayerRouter.HttpRouter;
  const handler = makeHandler(options);
  yield* router.add("GET", options.path, handler);
}, Layer.effectDiscard);
//# sourceMappingURL=HttpApiScalar.js.map