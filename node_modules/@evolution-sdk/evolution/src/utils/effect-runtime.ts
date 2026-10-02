import { Cause, Effect, Exit } from "effect"

/**
 * Patterns to filter from stack traces - Effect.ts internal implementation details
 */
const EFFECT_INTERNAL_PATTERNS = [
  /node_modules\/.pnpm\/effect@.*\/node_modules\/effect\//,
  /at FiberRuntime\./,
  /at EffectPrimitive\./,
  /at Object\.Iterator/,
  /at runLoop/,
  /at evaluateEffect/,
  /at body \(/,
  /effect_instruction_i\d+/,
  /at pipeArguments/,
  /at pipe \(/,
  /at Arguments\./,
  /at Module\./,
  /at issue \(/,
  /at \.\.\.$/ // Lines like "... 7 lines matching cause stack trace ..."
]

/**
 * Clean a single error's stack trace by removing Effect.ts internals
 */
function cleanStackTrace(stack: string | undefined): string {
  if (!stack) return ""

  const lines = stack.split("\n")
  const cleaned = lines.filter((line) => {
    // Keep the error message line (first line)
    if (!line.trim().startsWith("at ")) return true

    // Filter out Effect.ts internal lines
    return !EFFECT_INTERNAL_PATTERNS.some((pattern) => pattern.test(line))
  })

  return cleaned.join("\n")
}

/**
 * Recursively clean error chain (error and all causes)
 */
function cleanErrorChain(error: any): any {
  if (!error) return error

  // Clean current error's stack
  if (error.stack) {
    error.stack = cleanStackTrace(error.stack)
  }

  // Recursively clean cause chain
  if (error.cause) {
    error.cause = cleanErrorChain(error.cause)
  }

  // Handle Effect.ts internal cause field
  if (error[Symbol.for("effect/Runtime/FiberFailure/Cause")]) {
    const cause = error[Symbol.for("effect/Runtime/FiberFailure/Cause")]
    if (cause && typeof cause === "object") {
      if (cause.error) {
        cause.error = cleanErrorChain(cause.error)
      }
    }
  }

  return error
}

/**
 * Run an Effect synchronously with clean error handling.
 *
 * - Executes the Effect using Effect.runSyncExit
 * - On failure, extracts the error from the Exit and cleans stack traces
 * - Removes Effect.ts internal stack frames for cleaner error messages
 * - Throws the cleaned error for standard error handling
 *
 * @example
 * ```typescript
 * import { Effect } from "effect"
 * import { runEffect } from "@evolution-sdk/evolution/utils/effect-runtime"
 *
 * const myEffect = Effect.succeed(42)
 *
 * try {
 *   const result = runEffect(myEffect)
 *   console.log(result)
 * } catch (error) {
 *   // Error with clean stack trace, no Effect.ts internals
 *   console.error(error)
 * }
 * ```
 *
 * @since 2.0.0
 * @category utilities
 */
export function runEffect<A, E>(effect: Effect.Effect<A, E>): A {
  const exit = Effect.runSyncExit(effect)

  if (Exit.isFailure(exit)) {
    // Extract the error from the failure
    const error = Cause.squash(exit.cause)

    // Clean the error's stack trace
    const cleanedError = cleanErrorChain(error)

    throw cleanedError
  }

  return exit.value
}

/**
 * Run an Effect asynchronously and convert it to a Promise with clean error handling.
 *
 * - Executes the Effect using Effect.runPromiseExit
 * - On failure, extracts the error from the Exit and cleans stack traces
 * - Removes Effect.ts internal stack frames for cleaner error messages
 * - Throws the cleaned error for standard Promise error handling
 *
 * @example
 * ```typescript
 * import { Effect } from "effect"
 * import { runEffectPromise } from "@evolution-sdk/evolution/utils/effect-runtime"
 *
 * const myEffect = Effect.succeed(42)
 *
 * async function example() {
 *   try {
 *     const result = await runEffectPromise(myEffect)
 *     console.log(result)
 *   } catch (error) {
 *     // Error with clean stack trace, no Effect.ts internals
 *     console.error(error)
 *   }
 * }
 * ```
 *
 * @since 2.0.0
 * @category utilities
 */
export async function runEffectPromise<A, E>(effect: Effect.Effect<A, E>): Promise<A> {
  const exit = await Effect.runPromiseExit(effect)

  if (Exit.isFailure(exit)) {
    // Extract the error from the failure
    const error = Cause.squash(exit.cause)

    // Clean the error's stack trace
    const cleanedError = cleanErrorChain(error)

    throw cleanedError
  }

  return exit.value
}
