/** @internal */
export const isCloudflare =
  typeof navigator !== "undefined" &&
  typeof navigator.userAgent === "string" &&
  navigator.userAgent.includes("Cloudflare")

/** @internal */
export const isEdgeRuntime =
  // @ts-expect-error
  typeof EdgeRuntime === "string" || isCloudflare
