import { Effect as Eff, Equal, FastCheck, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as AuxiliaryData from "./AuxiliaryData.js"
import * as CBOR from "./CBOR.js"
import * as TransactionBody from "./TransactionBody.js"
import * as TransactionWitnessSet from "./TransactionWitnessSet.js"

/**
 * Transaction based on Conway CDDL specification
 *
 * CDDL: transaction =
 *   [transaction_body, transaction_witness_set, bool, auxiliary_data / nil]
 *
 * @since 2.0.0
 * @category model
 */
export class Transaction extends Schema.TaggedClass<Transaction>()("Transaction", {
  body: TransactionBody.TransactionBody,
  witnessSet: TransactionWitnessSet.TransactionWitnessSet,
  isValid: Schema.Boolean,
  auxiliaryData: Schema.NullOr(AuxiliaryData.AuxiliaryData)
}) {
  toJSON() {
    return {
      _tag: this._tag,
      body: this.body.toJSON(),
      witnessSet: this.witnessSet.toJSON(),
      isValid: this.isValid,
      auxiliaryData: this.auxiliaryData?.toJSON() ?? null
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
      that instanceof Transaction &&
      Equal.equals(this.body, that.body) &&
      Equal.equals(this.witnessSet, that.witnessSet) &&
      this.isValid === that.isValid &&
      Equal.equals(this.auxiliaryData, that.auxiliaryData)
    )
  }

  [Hash.symbol](): number {
    return Hash.cached(
      this,
      Hash.combine(
        Hash.combine(Hash.combine(Hash.hash(this.body))(Hash.hash(this.witnessSet)))(Hash.hash(this.isValid))
      )(Hash.hash(this.auxiliaryData))
    )
  }
}

/**
 * Conway CDDL schema for Transaction tuple structure.
 *
 * CDDL: transaction = [transaction_body, transaction_witness_set, bool, auxiliary_data / nil]
 */
export const CDDLSchema = Schema.declare(
  (input: unknown): input is readonly [Map<bigint, CBOR.CBOR>, Map<bigint, CBOR.CBOR>, boolean, CBOR.CBOR | null] =>
    Array.isArray(input)
).annotations({ identifier: "Transaction.CDDLSchema", description: "Transaction tuple structure" })

/**
 * Transform between CDDL tuple and Transaction class.
 */
export const FromCDDL = Schema.transformOrFail(CDDLSchema, Schema.typeSchema(Transaction), {
  strict: true,
  encode: (tx) =>
    Eff.gen(function* () {
      const bodyReadonly = yield* ParseResult.encode(TransactionBody.FromCDDL)(tx.body)
      const witnessReadonly = yield* ParseResult.encode(TransactionWitnessSet.FromCDDL)(tx.witnessSet)
      // Ensure mutable Map instances for tuple A-type compatibility
      const body = new Map<bigint, CBOR.CBOR>(bodyReadonly.entries())
      const witnessSet = new Map<bigint, CBOR.CBOR>(witnessReadonly.entries())
      const isValid = tx.isValid
      const auxiliaryData =
        tx.auxiliaryData === null ? null : yield* ParseResult.encode(AuxiliaryData.FromCDDL)(tx.auxiliaryData)
      const result = [body, witnessSet, isValid, auxiliaryData] as const
      return result
    }),
  decode: (tuple) =>
    Eff.gen(function* () {
      const [bodyCDDL, witnessSetCDDL, isValid, aux] = tuple
      const body = yield* ParseResult.decode(TransactionBody.FromCDDL)(bodyCDDL)
      const witnessSet = yield* ParseResult.decode(TransactionWitnessSet.FromCDDL)(witnessSetCDDL)
      const auxiliaryData = aux === null ? null : yield* ParseResult.decodeUnknownEither(AuxiliaryData.FromCDDL)(aux)
      return new Transaction({ body, witnessSet, isValid, auxiliaryData }, { disableValidation: true })
    })
})

/**
 * CBOR bytes transformation schema for Transaction.
 */
export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(CBOR.FromBytes(options), FromCDDL).annotations({
    identifier: "Transaction.FromCBORBytes",
    description: "Decode Transaction from CBOR bytes per Conway CDDL"
  })

/**
 * CBOR hex transformation schema for Transaction.
 */
export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(CBOR.FromHex(options), FromCDDL).annotations({
    identifier: "Transaction.FromCBORHex",
    description: "Decode Transaction from CBOR hex per Conway CDDL"
  })

// ============================================================================
// Parsing / Encoding Functions
// ============================================================================

export const fromCBORBytes = (bytes: Uint8Array, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORBytes(options))(bytes)

export const fromCBORHex = (hex: string, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORHex(options))(hex)

/**
 * Parse a Transaction from CBOR bytes and return the root format tree.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORBytesWithFormat = (
  bytes: Uint8Array
): CBOR.DecodedWithFormat<Transaction> => {
  const decoded = CBOR.fromCBORBytesWithFormat(bytes)
  const value = Schema.decodeSync(FromCDDL)(
    decoded.value as readonly [Map<bigint, CBOR.CBOR>, Map<bigint, CBOR.CBOR>, boolean, CBOR.CBOR | null]
  )
  return { value, format: decoded.format }
}

/**
 * Parse a Transaction from CBOR hex string and return the root format tree.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORHexWithFormat = (
  hex: string
): CBOR.DecodedWithFormat<Transaction> => {
  const decoded = CBOR.fromCBORHexWithFormat(hex)
  const value = Schema.decodeSync(FromCDDL)(
    decoded.value as readonly [Map<bigint, CBOR.CBOR>, Map<bigint, CBOR.CBOR>, boolean, CBOR.CBOR | null]
  )
  return { value, format: decoded.format }
}

export const toCBORBytes = (data: Transaction, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORBytes(options))(data)

export const toCBORHex = (data: Transaction, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORHex(options))(data)

/**
 * Convert a Transaction to CBOR bytes using an explicit root format tree.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORBytesWithFormat = (
  data: Transaction,
  format: CBOR.CBORFormat
): Uint8Array => {
  const cborTuple = Schema.encodeSync(FromCDDL)(data)
  return CBOR.toCBORBytesWithFormat(cborTuple as unknown as CBOR.CBOR, format)
}

/**
 * Convert a Transaction to CBOR hex string using an explicit root format tree.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHexWithFormat = (
  data: Transaction,
  format: CBOR.CBORFormat
): string => {
  const cborTuple = Schema.encodeSync(FromCDDL)(data)
  return CBOR.toCBORHexWithFormat(cborTuple as unknown as CBOR.CBOR, format)
}

// ============================================================================
// Witness merging via WithFormat round-trip
//
// Decode the full transaction with format preservation, merge witnesses at
// the domain level, then re-encode using the captured format tree. The format
// tree ensures body, redeemers, scripts, and all other entries maintain their
// original encoding — preserving txId and scriptDataHash.
//
// Reconciliation handles structural changes gracefully:
// - New map entries (key 0 absent → added) get default encoding
// - Extended arrays (more witnesses) encode extra children minimally
// - Surviving entries replay their captured format exactly
// ============================================================================

/**
 * Merge wallet vkey witnesses into a transaction, preserving CBOR encoding.
 *
 * Uses the WithFormat round-trip: decode with format capture, mutate at the
 * domain level, re-encode with the original format tree. Body encoding,
 * redeemer bytes, map key ordering, and all non-witness data are preserved
 * through the format tree reconciliation.
 *
 * `options` applies only to parsing the wallet witness set bytes. Transaction
 * decoding and re-encoding are governed by the captured format tree, making
 * codec options irrelevant for the transaction round-trip path.
 *
 * @since 2.0.0
 * @category encoding
 */
export const addVKeyWitnessesBytes = (
  txBytes: Uint8Array,
  walletWitnessSetBytes: Uint8Array,
  options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS
): Uint8Array => {
  // Decode wallet witness set to extract vkey witnesses
  const walletWs = TransactionWitnessSet.fromCBORBytes(walletWitnessSetBytes, options)
  const walletVkeys = walletWs.vkeyWitnesses ?? []
  if (walletVkeys.length === 0) return txBytes

  // Decode transaction with full format preservation
  const { format, value: tx } = fromCBORBytesWithFormat(txBytes)

  // Add witnesses at the domain level
  const merged = addVKeyWitnesses(tx, walletVkeys)

  // Re-encode using the captured format tree — reconciliation handles
  // the added/extended witness entries while preserving everything else
  return toCBORBytesWithFormat(merged, format)
}

/**
 * Hex variant of `addVKeyWitnessesBytes`.
 *
 * @since 2.0.0
 * @category encoding
 */
export const addVKeyWitnessesHex = (
  txHex: string,
  walletWitnessSetHex: string,
  options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS
): string => {
  const txBytes = Schema.decodeSync(Schema.Uint8ArrayFromHex)(txHex)
  const wsBytes = Schema.decodeSync(Schema.Uint8ArrayFromHex)(walletWitnessSetHex)
  const result = addVKeyWitnessesBytes(txBytes, wsBytes, options)
  return Schema.encodeSync(Schema.Uint8ArrayFromHex)(result)
}

// ============================================================================
// Raw body bytes extraction
// ============================================================================

/** Skip a CBOR item header and return its byte width. */
const cborHeaderSize = (data: Uint8Array, offset: number): number => {
  const additionalInfo = data[offset] & 0x1f
  if (additionalInfo < 24) return 1
  if (additionalInfo === CBOR.CBOR_ADDITIONAL_INFO.DIRECT) return 2
  if (additionalInfo === CBOR.CBOR_ADDITIONAL_INFO.UINT16) return 3
  if (additionalInfo === CBOR.CBOR_ADDITIONAL_INFO.UINT32) return 5
  if (additionalInfo === CBOR.CBOR_ADDITIONAL_INFO.UINT64) return 9
  if (additionalInfo === CBOR.CBOR_ADDITIONAL_INFO.INDEFINITE) return 1
  throw new CBOR.CBORError({ message: `Unsupported additional info: ${additionalInfo}` })
}

/**
 * Extract the original body bytes from a raw transaction CBOR byte array.
 * A Cardano transaction is a 4-element CBOR array: `[body, witnessSet, isValid, auxiliaryData]`.
 * This returns the raw body bytes without decoding/re-encoding, preserving the exact CBOR encoding.
 *
 * @since 2.0.0
 * @category encoding
 */
export const extractBodyBytes = (txBytes: Uint8Array): Uint8Array => {
  const arrHdr = cborHeaderSize(txBytes, 0)
  const { newOffset: bodyEnd } = CBOR.decodeItemWithOffset(txBytes, arrHdr)
  return txBytes.subarray(arrHdr, bodyEnd)
}

// ============================================================================
// Domain-level witness addition
// ============================================================================

/**
 * Add VKey witnesses to a transaction at the domain level.
 *
 * This creates a new Transaction with the additional witnesses merged in.
 * All encoding metadata (body bytes, redeemers format, witness map structure)
 * is preserved so that txId and scriptDataHash remain stable.
 *
 * @since 2.0.0
 * @category encoding
 */
export const addVKeyWitnesses = (
  tx: Transaction,
  witnesses: ReadonlyArray<TransactionWitnessSet.VKeyWitness>
): Transaction => {
  if (witnesses.length === 0) return tx
  const oldWs = tx.witnessSet
  const newWs = new TransactionWitnessSet.TransactionWitnessSet(
    {
      ...oldWs,
      vkeyWitnesses: [...(oldWs.vkeyWitnesses ?? []), ...witnesses]
    },
    { disableValidation: true }
  )
  return new Transaction(
    { body: tx.body, witnessSet: newWs, isValid: tx.isValid, auxiliaryData: tx.auxiliaryData },
    { disableValidation: true }
  )
}

// ============================================================================
// Arbitrary (FastCheck)
// ============================================================================

export const arbitrary: FastCheck.Arbitrary<Transaction> = FastCheck.record({
  body: TransactionBody.arbitrary,
  witnessSet: TransactionWitnessSet.arbitrary,
  isValid: FastCheck.boolean(),
  auxiliaryData: FastCheck.option(AuxiliaryData.arbitrary, { nil: null }).map((a) => (a === undefined ? null : a))
}).map((r) => new Transaction(r))
