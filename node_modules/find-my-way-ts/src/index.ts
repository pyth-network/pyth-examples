/**
 * @since 1.0.0
 */
import * as internal from "./internal/router.js"

/**
 * @since 1.0.0
 * @category models
 */
export interface RouterConfig {
  readonly ignoreTrailingSlash: boolean
  readonly ignoreDuplicateSlashes: boolean
  readonly caseSensitive: boolean
  readonly maxParamLength: number
}

/**
 * @since 1.0.0
 * @category models
 */
export type PathInput = `/${string}` | "*"

/**
 * @since 1.0.0
 * @category models
 */
export interface Router<A> {
  readonly on: (
    method: string | Iterable<string>,
    path: PathInput,
    handler: A,
  ) => void
  readonly all: (path: PathInput, handler: A) => void
  readonly find: (method: string, url: string) => FindResult<A> | undefined
  readonly has: (method: string, url: string) => boolean
}

/**
 * @since 1.0.0
 * @category models
 */
export interface FindResult<A> {
  readonly handler: A
  readonly params: Record<string, string | undefined>
  readonly searchParams: Record<string, string | Array<string>>
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: <A>(options?: Partial<RouterConfig>) => Router<A> =
  internal.make
