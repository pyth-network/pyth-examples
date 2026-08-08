import { Effect as Eff, Equal, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as NetworkId from "./NetworkId.js"

/**
 * Byron legacy address format
 *
 * @since 2.0.0
 * @category schemas
 */
export class ByronAddress extends Schema.TaggedClass<ByronAddress>("ByronAddress")("ByronAddress", {
  networkId: NetworkId.NetworkId,
  bytes: Schema.Uint8ArrayFromSelf
}) {
  toJSON() {
    return {
      _tag: "ByronAddress" as const,
      networkId: this.networkId,
      bytes: this.bytes
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof ByronAddress && this.networkId === that.networkId && this.bytes === that.bytes
  }

  [Hash.symbol](): number {
    return Hash.hash(this.toJSON())
  }
}

/**
 * Schema for encoding/decoding Byron addresses as bytes.
 *
 * @since 2.0.0
 * @category schemas
 */
export const BytesSchema = Schema.transformOrFail(Schema.Uint8ArrayFromSelf, ByronAddress, {
  strict: true,
  encode: (_, __, ___, toA) => ParseResult.succeed(toA.bytes),
  decode: (_, __, ast, fromA) =>
    Eff.gen(function* () {
      return new ByronAddress({
        networkId: NetworkId.NetworkId.make(0),
        bytes: fromA
      })
    })
})

/**
 * Schema for encoding/decoding Byron addresses as hex strings.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromHex = Schema.compose(Schema.Uint8ArrayFromHex, BytesSchema)
