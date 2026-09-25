import * as internal from "./internal/search.js"

export const make: (
  needle: string,
  callback: (index: number, chunk: Uint8Array) => void,
) => { readonly write: (chunk: Uint8Array) => void; readonly end: () => void } =
  internal.make
