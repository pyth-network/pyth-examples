import { bech32 } from "@scure/base"
import { Effect as Eff, Equal, FastCheck, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as CBOR from "./CBOR.js"
import * as KeyHash from "./KeyHash.js"
import * as ScriptHash from "./ScriptHash.js"

/**
 * KeyHashDRep variant of DRep.
 * drep = [0, addr_keyhash]
 *
 * @since 2.0.0
 * @category model
 */
export class KeyHashDRep extends Schema.TaggedClass<KeyHashDRep>()("KeyHashDRep", {
  keyHash: KeyHash.KeyHash
}) {
  toJSON() {
    return {
      _tag: "KeyHashDRep" as const,
      keyHash: this.keyHash.toJSON()
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof KeyHashDRep && Equal.equals(this.keyHash, that.keyHash)
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.combine(Hash.hash("KeyHashDRep"))(Hash.hash(this.keyHash)))
  }
}

/**
 * ScriptHashDRep variant of DRep.
 * drep = [1, script_hash]
 *
 * @since 2.0.0
 * @category model
 */
export class ScriptHashDRep extends Schema.TaggedClass<ScriptHashDRep>()("ScriptHashDRep", {
  scriptHash: ScriptHash.ScriptHash
}) {
  toJSON() {
    return {
      _tag: "ScriptHashDRep" as const,
      scriptHash: this.scriptHash.toJSON()
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof ScriptHashDRep && Equal.equals(this.scriptHash, that.scriptHash)
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.combine(Hash.hash("ScriptHashDRep"))(Hash.hash(this.scriptHash)))
  }
}

/**
 * AlwaysAbstainDRep variant of DRep.
 * drep = [2]
 *
 * @since 2.0.0
 * @category model
 */
export class AlwaysAbstainDRep extends Schema.TaggedClass<AlwaysAbstainDRep>()("AlwaysAbstainDRep", {}) {
  toJSON() {
    return {
      _tag: "AlwaysAbstainDRep" as const
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof AlwaysAbstainDRep
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.hash("AlwaysAbstainDRep"))
  }
}

/**
 * AlwaysNoConfidenceDRep variant of DRep.
 * drep = [3]
 *
 * @since 2.0.0
 * @category model
 */
export class AlwaysNoConfidenceDRep extends Schema.TaggedClass<AlwaysNoConfidenceDRep>()("AlwaysNoConfidenceDRep", {}) {
  toJSON() {
    return {
      _tag: "AlwaysNoConfidenceDRep" as const
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof AlwaysNoConfidenceDRep
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.hash("AlwaysNoConfidenceDRep"))
  }
}

/**
 * Union schema for DRep representing different DRep types.
 *
 * drep = [0, addr_keyhash] / [1, script_hash] / [2] / [3]
 *
 * @since 2.0.0
 * @category schemas
 */
export const DRep = Schema.Union(KeyHashDRep, ScriptHashDRep, AlwaysAbstainDRep, AlwaysNoConfidenceDRep)

/**
 * Type alias for DRep.
 *
 * @since 2.0.0
 * @category model
 */
export type DRep = typeof DRep.Type

export const CDDLSchema = Schema.Union(
  Schema.Tuple(Schema.Literal(0n), Schema.Uint8ArrayFromSelf),
  Schema.Tuple(Schema.Literal(1n), Schema.Uint8ArrayFromSelf),
  Schema.Tuple(Schema.Literal(2n)),
  Schema.Tuple(Schema.Literal(3n))
)

/**
 * CDDL schema for DRep with proper transformation.
 * drep = [0, addr_keyhash] / [1, script_hash] / [2] / [3]
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCDDL = Schema.transformOrFail(CDDLSchema, Schema.typeSchema(DRep), {
  strict: true,
  encode: (toA) =>
    Eff.gen(function* () {
      switch (toA._tag) {
        case "KeyHashDRep": {
          const keyHashBytes = yield* ParseResult.encode(KeyHash.FromBytes)(toA.keyHash)
          return [0n, keyHashBytes] as const
        }
        case "ScriptHashDRep": {
          const scriptHashBytes = yield* ParseResult.encode(ScriptHash.FromBytes)(toA.scriptHash)
          return [1n, scriptHashBytes] as const
        }
        case "AlwaysAbstainDRep":
          return [2n] as const
        case "AlwaysNoConfidenceDRep":
          return [3n] as const
      }
    }),
  decode: (fromA) =>
    Eff.gen(function* () {
      const [tag, ...rest] = fromA
      switch (tag) {
        case 0n: {
          const keyHash = yield* ParseResult.decode(KeyHash.FromBytes)(rest[0] as Uint8Array)
          return new KeyHashDRep({ keyHash })
        }
        case 1n: {
          const scriptHash = yield* ParseResult.decode(ScriptHash.FromBytes)(rest[0] as Uint8Array)
          return new ScriptHashDRep({ scriptHash })
        }
        case 2n:
          return new AlwaysAbstainDRep({})
        case 3n:
          return new AlwaysNoConfidenceDRep({})
        default:
          return yield* ParseResult.fail(
            new ParseResult.Type(Schema.typeSchema(DRep).ast, fromA, `Invalid DRep tag: ${tag}`)
          )
      }
    })
})

export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    CBOR.FromBytes(options), // Uint8Array → CBOR
    FromCDDL // CBOR → DRep
  )

export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    Schema.Uint8ArrayFromHex, // string → Uint8Array
    FromCBORBytes(options) // Uint8Array → DRep
  )

/**
 * Transform from raw bytes to DRep following CIP-129.
 * CIP-129 format: [1-byte header][28-byte credential]
 * Header byte: 0x22 = KeyHash, 0x23 = ScriptHash
 *
 * @since 2.0.0
 * @category transformations
 */
export const FromBytes = Schema.transformOrFail(Schema.Uint8ArrayFromSelf, Schema.typeSchema(DRep), {
  strict: true,
  encode: (_, __, ___, toA) =>
    Eff.gen(function* () {
      switch (toA._tag) {
        case "KeyHashDRep": {
          const keyHashBytes = yield* ParseResult.encode(KeyHash.FromBytes)(toA.keyHash)
          const result = new Uint8Array(29)
          result[0] = 0x22 // DRep KeyHash header
          result.set(keyHashBytes, 1)
          return yield* ParseResult.succeed(result)
        }
        case "ScriptHashDRep": {
          const scriptHashBytes = yield* ParseResult.encode(ScriptHash.FromBytes)(toA.scriptHash)
          const result = new Uint8Array(29)
          result[0] = 0x23 // DRep ScriptHash header
          result.set(scriptHashBytes, 1)
          return yield* ParseResult.succeed(result)
        }
        case "AlwaysAbstainDRep":
        case "AlwaysNoConfidenceDRep":
          return yield* ParseResult.fail(
            new ParseResult.Type(
              Schema.typeSchema(DRep).ast,
              toA,
              "AlwaysAbstain and AlwaysNoConfidence DReps cannot be encoded as bech32"
            )
          )
      }
    }),
  decode: (fromA, _, ast) =>
    Eff.gen(function* () {
      if (fromA.length !== 29) {
        return yield* ParseResult.fail(
          new ParseResult.Type(ast, fromA, `Invalid DRep bytes length: expected 29, got ${fromA.length}`)
        )
      }

      const header = fromA[0]
      const credential = fromA.slice(1)

      // Check key type (bits [7:4]) must be 0010 (DRep)
      const keyType = (header >> 4) & 0x0f
      if (keyType !== 0x02) {
        return yield* ParseResult.fail(
          new ParseResult.Type(
            ast,
            fromA,
            `Invalid key type in header: expected 0x02 (DRep), got 0x0${keyType.toString(16)}`
          )
        )
      }

      // Check credential type (bits [3:0])
      const credType = header & 0x0f

      if (credType === 0x02) {
        // Key Hash
        const keyHash = yield* ParseResult.decode(KeyHash.FromBytes)(credential)
        return new KeyHashDRep({ keyHash })
      } else if (credType === 0x03) {
        // Script Hash
        const scriptHash = yield* ParseResult.decode(ScriptHash.FromBytes)(credential)
        return new ScriptHashDRep({ scriptHash })
      }

      return yield* ParseResult.fail(
        new ParseResult.Type(
          ast,
          fromA,
          `Invalid credential type in header: expected 0x02 or 0x03, got 0x0${credType.toString(16)}`
        )
      )
    })
}).annotations({
  identifier: "DRep.FromBytes",
  description: "Transforms CIP-129 bytes to DRep (KeyHashDRep or ScriptHashDRep only)"
})

/**
 * Transform from hex string to DRep.
 *
 * @since 2.0.0
 * @category transformations
 */
export const FromHex = Schema.compose(Schema.Uint8ArrayFromHex, FromBytes).annotations({
  identifier: "DRep.FromHex",
  description: "Transforms hex string to DRep"
})

/**
 * Transform from Bech32 string to DRep following CIP-129.
 * Bech32 prefix: "drep" for both KeyHash and ScriptHash
 *
 * @since 2.0.0
 * @category transformations
 */
export const FromBech32 = Schema.transformOrFail(Schema.String, Schema.typeSchema(DRep), {
  strict: true,
  encode: (_, __, ___, toA) =>
    Eff.gen(function* () {
      const bytes = yield* ParseResult.encode(FromBytes)(toA)
      const words = bech32.toWords(bytes)
      return bech32.encode("drep", words, false)
    }),
  decode: (fromA, _, ast) =>
    Eff.gen(function* () {
      const result = yield* Eff.try({
        try: () => {
          // Note: `as any` needed because bech32.decode expects template literal type `${Prefix}1${string}`
          // but Schema provides plain string. Consider using decodeToBytes which accepts string.
          const decoded = bech32.decode(fromA as any, false)
          if (decoded.prefix !== "drep") {
            throw new Error(`Invalid prefix: expected "drep", got "${decoded.prefix}"`)
          }
          const bytes = bech32.fromWords(decoded.words)
          return new Uint8Array(bytes)
        },
        catch: (e) => new ParseResult.Type(ast, fromA, `Failed to decode Bech32: ${e}`)
      })
      return yield* ParseResult.decode(FromBytes)(result)
    })
}).annotations({
  identifier: "DRep.FromBech32",
  description: "Transforms CIP-129 Bech32 string to DRep"
})

/**
 * Check if the given value is a valid DRep
 *
 * @since 2.0.0
 * @category predicates
 */
export const isDRep = Schema.is(DRep)

/**
 * FastCheck arbitrary for generating random DRep instances.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = FastCheck.oneof(
  KeyHash.arbitrary.map((keyHash) => new KeyHashDRep({ keyHash })),
  ScriptHash.arbitrary.map((scriptHash) => new ScriptHashDRep({ scriptHash })),
  FastCheck.constant(new AlwaysAbstainDRep({})),
  FastCheck.constant(new AlwaysNoConfidenceDRep({}))
)

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse DRep from CBOR bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORBytes = (bytes: Uint8Array, options?: CBOR.CodecOptions): DRep =>
  Schema.decodeSync(FromCBORBytes(options))(bytes)

/**
 * Parse DRep from CBOR hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORHex = (hex: string, options?: CBOR.CodecOptions): DRep =>
  Schema.decodeSync(FromCBORHex(options))(hex)

// ============================================================================
// Encoding Functions
// ============================================================================

// ============================================================================
// Encoding Functions
// ============================================================================

/**
 * Encode DRep to CBOR bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORBytes = (options?: CBOR.CodecOptions) => Schema.encodeSync(FromCBORBytes(options))

/**
 * Encode DRep to CBOR hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHex = (options?: CBOR.CodecOptions) => Schema.encodeSync(FromCBORHex(options))

/**
 * Encode DRep to CIP-129 bytes (KeyHashDRep or ScriptHashDRep only).
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBytes = Schema.encodeSync(FromBytes)

/**
 * Encode DRep to hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toHex = Schema.encodeSync(FromHex)

/**
 * Encode DRep to Bech32 string (CIP-129 format).
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBech32 = Schema.encodeSync(FromBech32)

/**
 * Create a KeyHashDRep from a KeyHash.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromKeyHash = (keyHash: KeyHash.KeyHash): KeyHashDRep => new KeyHashDRep({ keyHash })

/**
 * Create a ScriptHashDRep from a ScriptHash.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromScriptHash = (scriptHash: ScriptHash.ScriptHash): ScriptHashDRep => new ScriptHashDRep({ scriptHash })

/**
 * Create an AlwaysAbstainDRep.
 *
 * @since 2.0.0
 * @category constructors
 */
export const alwaysAbstain = (): AlwaysAbstainDRep => new AlwaysAbstainDRep({})

/**
 * Create an AlwaysNoConfidenceDRep.
 *
 * @since 2.0.0
 * @category constructors
 */
export const alwaysNoConfidence = (): AlwaysNoConfidenceDRep => new AlwaysNoConfidenceDRep({})

/**
 * Pattern match over DRep.
 *
 * @since 2.0.0
 * @category pattern matching
 */
export const match =
  <A>(patterns: {
    KeyHashDRep: (keyHash: KeyHash.KeyHash) => A
    ScriptHashDRep: (scriptHash: ScriptHash.ScriptHash) => A
    AlwaysAbstainDRep: () => A
    AlwaysNoConfidenceDRep: () => A
  }) =>
  (drep: DRep) => {
    switch (drep._tag) {
      case "KeyHashDRep":
        return patterns.KeyHashDRep(drep.keyHash)
      case "ScriptHashDRep":
        return patterns.ScriptHashDRep(drep.scriptHash)
      case "AlwaysAbstainDRep":
        return patterns.AlwaysAbstainDRep()
      case "AlwaysNoConfidenceDRep":
        return patterns.AlwaysNoConfidenceDRep()
    }
  }

/**
 * Check if DRep is an AlwaysNoConfidenceDRep.
 *
 * @since 2.0.0
 * @category type guards
 */
export const isAlwaysNoConfidenceDRep = (drep: DRep): drep is AlwaysNoConfidenceDRep =>
  drep._tag === "AlwaysNoConfidenceDRep"
