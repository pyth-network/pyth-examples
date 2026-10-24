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
var internal = _interopRequireWildcard(require("./internal/httpApiSwagger.js"));
var OpenApi = _interopRequireWildcard(require("./OpenApi.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

const makeHandler = options => {
  const spec = OpenApi.fromApi(options.api);
  const response = HttpServerResponse.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${Html.escape(spec.info.title)} Documentation</title>
  <style>${internal.css}</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script id="swagger-spec" type="application/json">
    ${Html.escapeJson(spec)}
  </script>
  <script>
    ${internal.javascript}
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        spec: JSON.parse(document.getElementById("swagger-spec").textContent),
        dom_id: '#swagger-ui',
      });
    };
  </script>
</body>
</html>`);
  return Effect.succeed(response);
};
/**
 * Exported layer mounting Swagger/OpenAPI documentation UI.
 *
 * @param options.path  Optional mount path (default "/docs").
 *
 * @since 1.0.0
 * @category layers
 */
const layer = options => _HttpApiBuilder.Router.use(router => Effect.gen(function* () {
  const {
    api
  } = yield* _HttpApi.Api;
  const handler = makeHandler({
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
//# sourceMappingURL=HttpApiSwagger.js.map