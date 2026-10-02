"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isEdgeRuntime = exports.isCloudflare = void 0;
/** @internal */
const isCloudflare = exports.isCloudflare = typeof navigator !== "undefined" && typeof navigator.userAgent === "string" && /*#__PURE__*/navigator.userAgent.includes("Cloudflare");
/** @internal */
const isEdgeRuntime = exports.isEdgeRuntime =
// @ts-expect-error
typeof EdgeRuntime === "string" || isCloudflare;
//# sourceMappingURL=env.js.map