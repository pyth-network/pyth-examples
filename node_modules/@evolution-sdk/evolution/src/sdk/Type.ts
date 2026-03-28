import type * as Effect from "effect/Effect"

// Type helper to convert Effect types to Promise types
export type EffectToPromise<T> =
  T extends Effect.Effect<infer Return, infer _Error, infer _Context>
    ? Promise<Return>
    : T extends (...args: Array<any>) => Effect.Effect<infer Return, infer _Error, infer _Context>
      ? (...args: Parameters<T>) => Promise<Return>
      : never

/**
 * Utility to force TypeScript to expand and display computed types
 */
type Expand<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => R
  : T extends object
    ? { [K in keyof T]: T[K] }
    : T

export type EffectToPromiseAPI<T> = Expand<{
  readonly [K in keyof T]: EffectToPromise<T[K]>
}>

/**
 * Selective Promise conversion - specify which Effects become Promises, rest become sync
 */
export type SelectivePromiseAPI<T, PromiseKeys extends keyof T = never> = {
  // Promise-converted methods (explicitly specified)
  readonly [K in PromiseKeys]: EffectToPromise<T[K]>
} & {
  // Direct sync access for all other keys
  readonly [K in Exclude<keyof T, PromiseKeys>]: T[K] extends Effect.Effect<infer Return, any, any> ? Return : T[K]
}

/**
 * Selective Sync conversion - specify which Effects become sync, rest become Promises
 */
export type SelectiveSyncAPI<T, SyncKeys extends keyof T = never> = {
  // Direct sync access (explicitly specified)
  readonly [K in SyncKeys]: T[K] extends Effect.Effect<infer Return, any, any> ? Return : T[K]
} & {
  // Promise-converted methods for all other keys
  readonly [K in Exclude<keyof T, SyncKeys>]: EffectToPromise<T[K]>
}
