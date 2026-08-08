import { Either as E, Equal, FastCheck, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as AddressEras from "./AddressEras.js"
import * as BaseAddress from "./BaseAddress.js"
import * as CBOR from "./CBOR.js"
import * as DatumHash from "./DatumHash.js"
import * as DatumOption from "./DatumOption.js"
import * as EnterpriseAddress from "./EnterpriseAddress.js"
import * as ScriptRef from "./ScriptRef.js"
import * as Value from "./Value.js"

// Pre-bind frequently used ParseResult helpers for hot paths
const encAddress = ParseResult.encodeEither(AddressEras.FromBytes)
const decAddress = ParseResult.decodeUnknownEither(Schema.Union(BaseAddress.FromBytes, EnterpriseAddress.FromBytes))
const encValue = ParseResult.encodeEither(Value.FromCDDL)
const decValue = ParseResult.decodeUnknownEither(Value.FromCDDL)
const encDatumOption = ParseResult.encodeEither(DatumOption.FromCDDL)
const decDatumOption = ParseResult.decodeUnknownEither(DatumOption.FromCDDL)
const decDatumHash = ParseResult.decodeEither(DatumHash.FromBytes)
const encScriptRef = ParseResult.encodeEither(ScriptRef.FromCDDL)
const decScriptRef = ParseResult.decodeUnknownEither(ScriptRef.FromCDDL)

/**
 * Shelley-era transaction output format
 *
 * CDDL:
 * ```
 * shelley_transaction_output = [address, amount : value, ? Bytes32]
 * ```
 *
 * @since 2.0.0
 * @category model
 */
export class ShelleyTransactionOutput extends Schema.TaggedClass<ShelleyTransactionOutput>()(
  "ShelleyTransactionOutput",
  {
    address: AddressEras.FromBech32,
    // Schema.Union(BaseAddress.BaseAddress, EnterpriseAddress.EnterpriseAddress),
    amount: Value.Value,
    datumHash: Schema.optional(DatumHash.DatumHash)
  }
) {
  toJSON() {
    return {
      _tag: this._tag,
      address: this.address,
      amount: this.amount,
      datumHash: this.datumHash
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
      that instanceof ShelleyTransactionOutput &&
      Equal.equals(this.address, that.address) &&
      Equal.equals(this.amount, that.amount) &&
      Equal.equals(this.datumHash, that.datumHash)
    )
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.hash(this.address) ^ Hash.hash(this.amount) ^ Hash.hash(this.datumHash))
  }
}

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
export class BabbageTransactionOutput extends Schema.TaggedClass<BabbageTransactionOutput>()(
  "BabbageTransactionOutput",
  {
    address: AddressEras.FromBech32,
    amount: Value.Value, // 1
    datumOption: Schema.optional(DatumOption.DatumOptionSchema), // 2
    scriptRef: Schema.optional(ScriptRef.ScriptRef) // 3
  }
) {
  toJSON() {
    return {
      _tag: this._tag,
      address: this.address,
      amount: this.amount,
      datumOption: this.datumOption,
      scriptRef: this.scriptRef
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
      that instanceof BabbageTransactionOutput &&
      Equal.equals(this.address, that.address) &&
      Equal.equals(this.amount, that.amount) &&
      Equal.equals(this.datumOption, that.datumOption) &&
      Equal.equals(this.scriptRef, that.scriptRef)
    )
  }

  [Hash.symbol](): number {
    return Hash.cached(
      this,
      Hash.hash(this.address) ^ Hash.hash(this.amount) ^ Hash.hash(this.datumOption) ^ Hash.hash(this.scriptRef)
    )
  }
}

/**
 * Union type for transaction outputs
 *
 * CDDL:
 * ```
 * transaction_output = shelley_transaction_output / babbage_transaction_output
 * ```
 *
 * @since 2.0.0
 * @category schemas
 */
export const TransactionOutput = Schema.Union(ShelleyTransactionOutput, BabbageTransactionOutput)

export type TransactionOutput = typeof TransactionOutput.Type

export const ShelleyTransactionOutputCDDL = Schema.Tuple(
  Schema.Uint8ArrayFromSelf, // address as bytes
  Value.CDDLSchema, // value
  Schema.optionalElement(Schema.Uint8ArrayFromSelf) // optional datum_hash as bytes
)

/**
 * CDDL schema for Shelley transaction outputs
 *
 * @since 2.0.0
 * @category transformation
 */
export const FromShelleyTransactionOutputCDDLSchema = Schema.transformOrFail(
  ShelleyTransactionOutputCDDL,
  Schema.typeSchema(ShelleyTransactionOutput),
  {
    strict: true,
    encode: (toI) =>
      E.gen(function* () {
        const addressBytes = yield* encAddress(toI.address)
        const valueBytes = yield* encValue(toI.amount)

        if (toI.datumHash !== undefined) {
          return [addressBytes, valueBytes, toI.datumHash.hash] as const
        }

        return [addressBytes, valueBytes] as const
      }),
    decode: (fromI) =>
      E.gen(function* () {
        const [addressBytes, valueBytes, datumHashBytes] = fromI
        const address = yield* decAddress(addressBytes)
        const amount = yield* decValue(valueBytes)
        let datumHash: DatumHash.DatumHash | undefined
        if (datumHashBytes !== undefined) {
          datumHash = yield* decDatumHash(datumHashBytes)
        }

        return new ShelleyTransactionOutput(
          {
            address,
            amount,
            datumHash
          },
          { disableValidation: true }
        )
      })
  }
)

const BabbageTransactionOutputCDDL = Schema.MapFromSelf({
  key: CBOR.Integer,
  value: CBOR.CBORSchema
})

/**
 * CDDL schema for Babbage transaction outputs
 *
 * @since 2.0.0
 * @category transformation
 */
export const FromBabbageTransactionOutputCDDLSchema = Schema.transformOrFail(
  BabbageTransactionOutputCDDL,
  Schema.typeSchema(BabbageTransactionOutput),
  {
    strict: true,
    encode: (toI) =>
      E.gen(function* () {
        const outputMap = new Map<bigint, CBOR.CBOR>()
        const addressBytes = yield* encAddress(toI.address)
        const valueBytes = yield* encValue(toI.amount)
        // Prepare optional fields
        const datumOptionBytes = toI.datumOption !== undefined ? yield* encDatumOption(toI.datumOption) : undefined
        const scriptRefBytes = toI.scriptRef !== undefined ? yield* encScriptRef(toI.scriptRef) : undefined

        // Build result object with conditional properties
        outputMap.set(0n, addressBytes)
        outputMap.set(1n, valueBytes)
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
        const valueBytes = fromI.get(1n)
        const datumOptionBytes = fromI.get(2n)
        const scriptRefBytes = fromI.get(3n)

        const address = yield* decAddress(addressBytes)
        const amount = yield* decValue(valueBytes)

        const datumOption = datumOptionBytes !== undefined ? yield* decDatumOption(datumOptionBytes) : undefined

        const scriptRef = scriptRefBytes !== undefined ? yield* decScriptRef(scriptRefBytes) : undefined

        return new BabbageTransactionOutput(
          {
            address,
            amount,
            datumOption,
            scriptRef
          },
          { disableValidation: true }
        )
      })
  }
)

export const CDDLSchema = Schema.Union(ShelleyTransactionOutputCDDL, BabbageTransactionOutputCDDL)

/**
 * CDDL schema for transaction outputs
 *
 * @since 2.0.0
 * @category transformer
 */
export const FromCDDL = Schema.Union(FromShelleyTransactionOutputCDDLSchema, FromBabbageTransactionOutputCDDLSchema)

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
export const arbitrary = FastCheck.oneof(
  // Shelley TransactionOutput
  FastCheck.record({
    address: FastCheck.oneof(BaseAddress.arbitrary, EnterpriseAddress.arbitrary),
    amount: Value.arbitrary,
    datumHash: FastCheck.option(DatumHash.arbitrary, { nil: undefined })
  }).map((props) => new ShelleyTransactionOutput(props)),

  // Babbage TransactionOutput
  FastCheck.record({
    address: FastCheck.oneof(BaseAddress.arbitrary, EnterpriseAddress.arbitrary),
    amount: Value.arbitrary,
    datumOption: FastCheck.option(DatumOption.arbitrary, { nil: undefined }),
    scriptRef: FastCheck.option(ScriptRef.arbitrary, { nil: undefined })
  }).map((props) => new BabbageTransactionOutput(props))
)

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
