import { Either as E, Equal, FastCheck, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as Address from "./Address.js"
import * as Assets from "./Assets/index.js"
import * as CBOR from "./CBOR.js"
import * as DatumHash from "./DatumHash.js"
import * as DatumOption from "./DatumOption.js"
import * as ScriptRef from "./ScriptRef.js"

// Pre-bind frequently used ParseResult helpers for hot paths
const encAddress = ParseResult.encodeEither(Address.FromBytes)
const decAddress = ParseResult.decodeUnknownEither(Address.FromBytes)
const encAssets = ParseResult.encodeEither(Assets.FromCDDL)
const decAssets = ParseResult.decodeUnknownEither(Assets.FromCDDL)
const encDatumOption = ParseResult.encodeEither(DatumOption.FromCDDL)
const decDatumOption = ParseResult.decodeUnknownEither(DatumOption.FromCDDL)
const decDatumHash = ParseResult.decodeEither(DatumHash.FromBytes)
const encScriptRef = ParseResult.encodeEither(ScriptRef.FromCDDL)
const decScriptRef = ParseResult.decodeUnknownEither(ScriptRef.FromCDDL)

/**
 * Babbage-era transaction output format
 *
 * CDDL:
 * ```
 * babbage_transaction_output =
 *   {0 : address, 1 : value, ? 2 : datum_option, ? 3 : script_ref}
 * ```
 *
 * @since 2.0.0
 * @category model
 */
export class TransactionOutput extends Schema.TaggedClass<TransactionOutput>()("TransactionOutput", {
  address: Address.Address,
  assets: Assets.Assets.pipe(
    Schema.filter(Assets.allPositive, {
      message: () => "Transaction output assets must have non-negative lovelace and positive token quantities"
    })
  ),
  datumOption: Schema.optional(DatumOption.DatumOptionSchema), // 2
  scriptRef: Schema.optional(ScriptRef.ScriptRef) // 3
}) {
  toJSON() {
    return {
      _tag: this._tag,
      address: this.address.toJSON(),
      assets: this.assets.toJSON(),
      datumOption: this.datumOption?.toJSON(),
      scriptRef: this.scriptRef?.toJSON()
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
      that instanceof TransactionOutput &&
      Equal.equals(this.address, that.address) &&
      Equal.equals(this.assets, that.assets) &&
      Equal.equals(this.datumOption, that.datumOption) &&
      Equal.equals(this.scriptRef, that.scriptRef)
    )
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.hash(this.address))
  }
}

// CDDL Schemas

/**
 * Shelley-era transaction output CDDL format (array)
 *
 * @since 2.0.0
 * @category schemas
 */
export const ShelleyTransactionOutputCDDL = Schema.Tuple(
  Schema.Uint8ArrayFromSelf, // address as bytes
  Schema.encodedSchema(Assets.FromCDDL), // assets (value)
  Schema.optionalElement(Schema.Uint8ArrayFromSelf) // optional datum_hash as bytes
)

/**
 * Babbage-era transaction output CDDL format (map)
 *
 * @since 2.0.0
 * @category schemas
 */
export const BabbageTransactionOutputCDDL = Schema.MapFromSelf({
  key: CBOR.Integer,
  value: CBOR.CBORSchema
})

/**
 * CDDL schema for transaction outputs (union of Shelley and Babbage formats)
 *
 * @since 2.0.0
 * @category schemas
 */
export const CDDLSchema = Schema.Union(ShelleyTransactionOutputCDDL, BabbageTransactionOutputCDDL)

/**
 * Transformation schema for Shelley transaction outputs
 *
 * @since 2.0.0
 * @category transformation
 */
export const FromShelleyTransactionOutputCDDL = Schema.transformOrFail(
  ShelleyTransactionOutputCDDL,
  Schema.typeSchema(TransactionOutput),
  {
    strict: true,
    encode: (toI) =>
      E.gen(function* () {
        const addressBytes = yield* encAddress(toI.address)
        const assetsBytes = yield* encAssets(toI.assets)

        if (toI.datumOption !== undefined) {
          // For Shelley format, only datum hash is supported
          if (toI.datumOption._tag === "DatumHash") {
            return [addressBytes, assetsBytes, toI.datumOption.hash] as const
          }
          // If it's inline datum, we can't encode to Shelley format - use Babbage instead
          return yield* E.left(
            new ParseResult.Type(
              Schema.typeSchema(TransactionOutput).ast,
              toI,
              "Shelley format does not support inline datums"
            )
          )
        }

        return [addressBytes, assetsBytes] as const
      }),
    decode: (fromI) =>
      E.gen(function* () {
        const [addressBytes, assetsBytes, datumHashBytes] = fromI
        const address = yield* decAddress(addressBytes)
        const assets = yield* decAssets(assetsBytes)
        let datumOption: DatumOption.DatumOption | undefined
        if (datumHashBytes !== undefined) {
          const datumHash = yield* decDatumHash(datumHashBytes)
          datumOption = datumHash
        }

        return new TransactionOutput(
          {
            address,
            assets,
            datumOption,
            scriptRef: undefined
          },
          { disableValidation: true }
        )
      })
  }
)

/**
 * Transformation schema for Babbage transaction outputs
 *
 * @since 2.0.0
 * @category transformation
 */
export const FromBabbageTransactionOutputCDDL = Schema.transformOrFail(
  BabbageTransactionOutputCDDL,
  Schema.typeSchema(TransactionOutput),
  {
    strict: true,
    encode: (toI) =>
      E.gen(function* () {
        const outputMap = new Map<bigint, CBOR.CBOR>()
        const addressBytes = yield* encAddress(toI.address)
        const assetsBytes = yield* encAssets(toI.assets)
        // Prepare optional fields
        const datumOptionBytes = toI.datumOption !== undefined ? yield* encDatumOption(toI.datumOption) : undefined
        const scriptRefBytes = toI.scriptRef !== undefined ? yield* encScriptRef(toI.scriptRef) : undefined

        // Build result object with conditional properties
        outputMap.set(0n, addressBytes)
        outputMap.set(1n, assetsBytes)
        if (datumOptionBytes !== undefined) {
          outputMap.set(2n, datumOptionBytes)
        }
        if (scriptRefBytes !== undefined) {
          outputMap.set(3n, scriptRefBytes)
        }
        return outputMap
      }),
    decode: (fromI) =>
      E.gen(function* () {
        // Assume `fromI` is a CBOR Map and read keys directly.
        const addressBytes = fromI.get(0n)
        const assetsBytes = fromI.get(1n)
        const datumOptionBytes = fromI.get(2n)
        const scriptRefBytes = fromI.get(3n)

        const address = yield* decAddress(addressBytes)
        const assets = yield* decAssets(assetsBytes)

        const datumOption = datumOptionBytes !== undefined ? yield* decDatumOption(datumOptionBytes) : undefined

        const scriptRef = scriptRefBytes !== undefined ? yield* decScriptRef(scriptRefBytes) : undefined

        return new TransactionOutput(
          {
            address,
            assets,
            datumOption,
            scriptRef
          },
          { disableValidation: true }
        )
      })
  }
)

/**
 * CDDL transformation schema for transaction outputs (supports both Shelley and Babbage formats)
 *
 * Encoding logic:
 * - Uses Shelley format (array) when no scriptRef and either no datumOption or only DatumHash
 * - Uses Babbage format (map) when scriptRef is present or datumOption contains InlineDatum
 *
 * Decoding: Accepts both formats
 *
 * @since 2.0.0
 * @category transformation
 */
export const FromCDDL = Schema.transformOrFail(CDDLSchema, Schema.typeSchema(TransactionOutput), {
  strict: true,
  encode: (toI) =>
    E.gen(function* () {
      // Determine if we can use Shelley format (more compact)
      const canUseShelleyFormat =
        toI.scriptRef === undefined && (toI.datumOption === undefined || toI.datumOption._tag === "DatumHash")

      if (canUseShelleyFormat) {
        // Use Shelley format (array)
        const addressBytes = yield* encAddress(toI.address)
        const assetsBytes = yield* encAssets(toI.assets)

        if (toI.datumOption !== undefined && toI.datumOption._tag === "DatumHash") {
          return [addressBytes, assetsBytes, toI.datumOption.hash] as const
        }

        return [addressBytes, assetsBytes] as const
      } else {
        // Use Babbage format (map)
        const outputMap = new Map<bigint, CBOR.CBOR>()
        const addressBytes = yield* encAddress(toI.address)
        const assetsBytes = yield* encAssets(toI.assets)
        const datumOptionBytes = toI.datumOption !== undefined ? yield* encDatumOption(toI.datumOption) : undefined
        const scriptRefBytes = toI.scriptRef !== undefined ? yield* encScriptRef(toI.scriptRef) : undefined

        outputMap.set(0n, addressBytes)
        outputMap.set(1n, assetsBytes)
        if (datumOptionBytes !== undefined) {
          outputMap.set(2n, datumOptionBytes)
        }
        if (scriptRefBytes !== undefined) {
          outputMap.set(3n, scriptRefBytes)
        }
        return outputMap
      }
    }),
  decode: (fromI) =>
    E.gen(function* () {
      // Check if it's an array (Shelley) or map (Babbage)
      if (Array.isArray(fromI)) {
        // Shelley format
        const [addressBytes, assetsBytes, datumHashBytes] = fromI
        const address = yield* decAddress(addressBytes)
        const assets = yield* decAssets(assetsBytes)
        let datumOption: DatumOption.DatumOption | undefined
        if (datumHashBytes !== undefined) {
          const datumHash = yield* decDatumHash(datumHashBytes)
          datumOption = datumHash
        }

        return new TransactionOutput(
          {
            address,
            assets,
            datumOption,
            scriptRef: undefined
          },
          { disableValidation: true }
        )
      } else {
        // Babbage format (map) - cast to Map type
        const outputMap = fromI as ReadonlyMap<bigint, CBOR.CBOR>
        const addressBytes = outputMap.get(0n)
        const assetsBytes = outputMap.get(1n)
        const datumOptionBytes = outputMap.get(2n)
        const scriptRefBytes = outputMap.get(3n)

        const address = yield* decAddress(addressBytes)
        const assets = yield* decAssets(assetsBytes)
        const datumOption = datumOptionBytes !== undefined ? yield* decDatumOption(datumOptionBytes) : undefined
        const scriptRef = scriptRefBytes !== undefined ? yield* decScriptRef(scriptRefBytes) : undefined

        return new TransactionOutput(
          {
            address,
            assets,
            datumOption,
            scriptRef
          },
          { disableValidation: true }
        )
      }
    })
})

/**
 * CBOR bytes transformation schema for TransactionOutput.
 *
 * @since 2.0.0
 * @category transformer
 */
export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    CBOR.FromBytes(options), // Uint8Array → CBOR
    FromCDDL // CBOR → TransactionOutput
  ).annotations({
    identifier: "TransactionOutput.FromCBORBytes",
    title: "TransactionOutput from CBOR Bytes",
    description: "Transforms CBOR bytes (Uint8Array) to TransactionOutput"
  })

/**
 * CBOR hex transformation schema for TransactionOutput.
 *
 * @since 2.0.0
 * @category transformer
 */
export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    Schema.Uint8ArrayFromHex, // string → Uint8Array
    FromCBORBytes(options) // Uint8Array → TransactionOutput
  ).annotations({
    identifier: "TransactionOutput.FromCBORHex",
    title: "TransactionOutput from CBOR Hex",
    description: "Transforms CBOR hex string to TransactionOutput"
  })

/**
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = FastCheck.record({
  address: Address.arbitrary,
  assets: Assets.arbitrary,
  datumOption: FastCheck.option(DatumOption.arbitrary, { nil: undefined }),
  scriptRef: FastCheck.option(ScriptRef.arbitrary, { nil: undefined })
}).map((props) => new TransactionOutput(props))

/**
 * Convert TransactionOutput to CBOR bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORBytes = (data: TransactionOutput, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORBytes(options))(data)

/**
 * Convert TransactionOutput to CBOR hex.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHex = (data: TransactionOutput, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORHex(options))(data)

/**
 * Parse TransactionOutput from CBOR bytes.
 *
 * @since 2.0.0
 * @category decoding
 */
export const fromCBORBytes = (bytes: Uint8Array, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORBytes(options))(bytes)

/**
 * Parse TransactionOutput from CBOR hex.
 *
 * @since 2.0.0
 * @category decoding
 */
export const fromCBORHex = (hex: string, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORHex(options))(hex)
