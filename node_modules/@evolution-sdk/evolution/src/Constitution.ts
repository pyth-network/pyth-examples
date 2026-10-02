import { Effect as Eff, Equal, FastCheck, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as Anchor from "./Anchor.js"
import * as CBOR from "./CBOR.js"
import * as ScriptHash from "./ScriptHash.js"

/**
 * Constitution per CDDL:
 * constitution = [anchor, script_hash/ nil]
 *
 * @since 2.0.0
 * @category schemas
 */
export class Constitution extends Schema.TaggedClass<Constitution>()("Constitution", {
  anchor: Anchor.Anchor,
  scriptHash: Schema.NullOr(ScriptHash.ScriptHash)
}) {
  toJSON() {
    return {
      _tag: "Constitution" as const,
      anchor: this.anchor.toJSON(),
      scriptHash: this.scriptHash ? this.scriptHash.toJSON() : null
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return (
      that instanceof Constitution &&
      Equal.equals(this.anchor, that.anchor) &&
      Equal.equals(this.scriptHash, that.scriptHash)
    )
  }

  [Hash.symbol](): number {
    return Hash.cached(
      this,
      Hash.combine(Hash.hash("Constitution"))(Hash.combine(Hash.hash(this.anchor))(Hash.hash(this.scriptHash)))
    )
  }
}

/**
 * CDDL tuple schema for Constitution
 */
export const CDDLSchema = Schema.Tuple(
  Anchor.CDDLSchema, // anchor
  Schema.NullOr(CBOR.ByteArray) // script_hash / nil
)

/**
 * Transform between CDDL tuple and typed Constitution
 */
export const FromCDDL = Schema.transformOrFail(CDDLSchema, Schema.typeSchema(Constitution), {
  strict: true,
  encode: (toA) =>
    Eff.gen(function* () {
      const anchor = yield* ParseResult.encode(Anchor.FromCDDL)(toA.anchor)
      const scriptHash = toA.scriptHash ? yield* ParseResult.encode(ScriptHash.FromBytes)(toA.scriptHash) : null
      return [anchor, scriptHash] as const
    }),
  decode: ([anchorTuple, scriptHashBytes]) =>
    Eff.gen(function* () {
      const anchor = yield* ParseResult.decode(Anchor.FromCDDL)(anchorTuple)
      const scriptHash = scriptHashBytes ? yield* ParseResult.decode(ScriptHash.FromBytes)(scriptHashBytes) : null
      return new Constitution({ anchor, scriptHash })
    })
})

export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(CBOR.FromBytes(options), FromCDDL)

export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(CBOR.FromHex(options), FromCBORBytes(options))

/**
 * Arbitrary for Constitution
 */
export const arbitrary: FastCheck.Arbitrary<Constitution> = FastCheck.tuple(
  Anchor.arbitrary,
  FastCheck.option(ScriptHash.arbitrary, { nil: null })
).map(([anchor, scriptHash]) => new Constitution({ anchor, scriptHash }, { disableValidation: true }))

// ============================================================================
// Decoding Functions
// ============================================================================

/**
 * Parse Constitution from CBOR bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORBytes = (bytes: Uint8Array, options?: CBOR.CodecOptions): Constitution =>
  Schema.decodeSync(FromCBORBytes(options))(bytes)

/**
 * Parse Constitution from CBOR hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORHex = (hex: string, options?: CBOR.CodecOptions): Constitution =>
  Schema.decodeSync(FromCBORHex(options))(hex)

// ============================================================================
// Encoding Functions
// ============================================================================

/**
 * Convert Constitution to CBOR bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORBytes = (constitution: Constitution, options?: CBOR.CodecOptions): Uint8Array =>
  Schema.encodeSync(FromCBORBytes(options))(constitution)

/**
 * Convert Constitution to CBOR hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHex = (constitution: Constitution, options?: CBOR.CodecOptions): string =>
  Schema.encodeSync(FromCBORHex(options))(constitution)
