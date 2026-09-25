import * as internal from "./internal/headers.js"

export type FailureReason =
  | "TooManyHeaders"
  | "HeaderTooLarge"
  | "InvalidHeaderName"
  | "InvalidHeaderValue"

export interface Continue {
  readonly _tag: "Continue"
}

export interface Failure {
  readonly _tag: "Failure"
  readonly reason: FailureReason
  readonly headers: Record<string, string | Array<string>>
}

export interface Headers {
  readonly _tag: "Headers"
  readonly headers: Record<string, string | Array<string>>
  readonly endPosition: number
}

export type ReturnValue = Continue | Failure | Headers

export const make: () => (chunk: Uint8Array, start: number) => ReturnValue =
  internal.make
