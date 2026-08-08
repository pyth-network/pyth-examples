/** @internal */
export const isCloudflare = typeof navigator !== "undefined" && typeof navigator.userAgent === "string" && /*#__PURE__*/navigator.userAgent.includes("Cloudflare");
/** @internal */
export const isEdgeRuntime =
// @ts-expect-error
typeof EdgeRuntime === "string" || isCloudflare;
//# sourceMappingURL=env.js.map