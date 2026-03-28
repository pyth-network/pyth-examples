import { blake2b } from "@noble/hashes/blake2"

import * as AuxiliaryData from "../AuxiliaryData.js"
import * as AuxiliaryDataHash from "../AuxiliaryDataHash.js"
import * as CBOR from "../CBOR.js"
import * as CostModel from "../CostModel.js"
import * as Data from "../Data.js"
import * as Redeemer from "../Redeemer.js"
import * as Redeemers from "../Redeemers.js"
import * as ScriptDataHash from "../ScriptDataHash.js"
import * as TransactionBody from "../TransactionBody.js"
import * as TransactionHash from "../TransactionHash.js"

/**
 * Compute the transaction body hash (blake2b-256 over CBOR of body).
 */
export const hashTransaction = (body: TransactionBody.TransactionBody): TransactionHash.TransactionHash => {
  // Encode body using the same options used across the SDK to ensure parity with CML
  const bytes = TransactionBody.toCBORBytes(body)
  const digest = blake2b(bytes, { dkLen: 32 })
  return new TransactionHash.TransactionHash({ hash: digest })
}

/**
 * Compute the transaction body hash from raw CBOR bytes, preserving original encoding.
 * Uses `Transaction.extractBodyBytes` to avoid the decode→re-encode round-trip.
 */
export const hashTransactionRaw = (bodyBytes: Uint8Array): TransactionHash.TransactionHash => {
  const digest = blake2b(bodyBytes, { dkLen: 32 })
  return new TransactionHash.TransactionHash({ hash: digest })
}

/**
 * script_data per CDDL (Conway)
 *
 * ```
 * ; This is a hash of data which may affect evaluation of a script.
 * ; This data consists of:
 * ;   - The redeemers from the transaction_witness_set (the value of field 5).
 * ;   - The datums from the transaction_witness_set (the value of field 4).
 * ;   - The value in the cost_models map corresponding to the script's language
 * ;     (in field 18 of protocol_param_update.)
 * ; (In the future it may contain additional protocol parameters.)
 * ;
 * ; Since this data does not exist in contiguous form inside a transaction, it needs
 * ; to be independently constructed by each recipient.
 * ;
 * ; The bytestring which is hashed is the concatenation of three things:
 * ;   redeemers || datums || language views
 * ; The redeemers are exactly the data present in the transaction witness set.
 * ; Similarly for the datums, if present. If no datums are provided, the middle
 * ; field is omitted (i.e. it is the empty/null bytestring).
 * ;
 * ; language views CDDL:
 * ; { * language => script_integrity_data }
 * ;
 * ; This must be encoded canonically, using the same scheme as in
 * ; RFC7049 section 3.9:
 * ;  - Maps, strings, and bytestrings must use a definite-length encoding
 * ;  - Integers must be as small as possible.
 * ;  - The expressions for map length, string length, and bytestring length
 * ;    must be as short as possible.
 * ;  - The keys in the map must be sorted as follows:
 * ;     -  If two keys have different lengths, the shorter one sorts earlier.
 * ;     -  If two keys have the same length, the one with the lower value
 * ;        in (byte-wise) lexical order sorts earlier.
 * ;
 * ; For PlutusV1 (language id 0), the language view is the following:
 * ;   - the value of cost_models map at key 0 (in other words, the script_integrity_data)
 * ;     is encoded as an indefinite length list and the result is encoded as a bytestring.
 * ;     (our apologies)
 * ;     For example, the script_integrity_data corresponding to the all zero costmodel for V1
 * ;     would be encoded as (in hex):
 * ;     58a89f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ff
 * ;   - the language ID tag is also encoded twice. first as a uint then as
 * ;     a bytestring. (our apologies)
 * ;     Concretely, this means that the language version for V1 is encoded as
 * ;     4100 in hex.
 * ; For PlutusV2 (language id 1), the language view is the following:
 * ;   - the value of cost_models map at key 1 is encoded as an definite length list.
 * ;     For example, the script_integrity_data corresponding to the all zero costmodel for V2
 * ;     would be encoded as (in hex):
 * ;     98af0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
 * ;   - the language ID tag is encoded as expected.
 * ;     Concretely, this means that the language version for V2 is encoded as
 * ;     01 in hex.
 * ; For PlutusV3 (language id 2), the language view is the following:
 * ;   - the value of cost_models map at key 2 is encoded as a definite length list.
 * ;
 * ; Note that each Plutus language represented inside a transaction must have
 * ; a cost model in the cost_models protocol parameter in order to execute,
 * ; regardless of what the script integrity data is.
 * ;
 * ; Finally, note that in the case that a transaction includes datums but does not
 * ; include the redeemers field, the script data format becomes (in hex):
 * ; [ A0 | datums | A0 ]
 * ; corresponding to a CBOR empty map and an empty map for language view.
 * ; This empty redeeemer case has changed from the previous eras, since default
 * ; representation for redeemers has been changed to a map. Also whenever redeemers are
 * ; supplied either as a map or as an array they must contain at least one element,
 * ; therefore there is no way to override this behavior by providing a custom
 * ; representation for empty redeemers.
 * script_data_hash = hash32
 * ```
 */

/**
 * Encode an array of datums as tag(258) set.
 * Each datum is encoded individually, then wrapped in a definite-length array with tag 258.
 */
const encodeDatumsTaggedSet = (
  datums: ReadonlyArray<Data.Data>,
  options: CBOR.CodecOptions = CBOR.CML_DATA_DEFAULT_OPTIONS
): Uint8Array => {
  const items = datums.map((d) => Data.toCBORBytes(d, options))
  const arr = CBOR.encodeArrayAsDefinite(items)
  return CBOR.encodeTaggedValue(258, arr)
}

/**
 * Concatenate multiple Uint8Arrays into one.
 */
const concatBytes = (...arrays: ReadonlyArray<Uint8Array>): Uint8Array => {
  const totalLen = arrays.reduce((sum, arr) => sum + arr.length, 0)
  const result = new Uint8Array(totalLen)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}

/**
 * Compute script_data_hash using standard module encoders.
 *
 * Accepts the concrete `Redeemers` union type — encoding format is determined
 * by `_tag` (`RedeemerMap` → map CBOR, `RedeemerArray` → array CBOR).
 *
 * The payload format per CDDL spec is raw concatenation (not a CBOR structure):
 * ```
 * redeemers_bytes || datums_bytes || language_views_bytes
 * ```
 */
export const hashScriptData = (
  redeemers: Redeemers.Redeemers,
  costModels: CostModel.CostModels,
  datums?: ReadonlyArray<Data.Data>,
  options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS
): ScriptDataHash.ScriptDataHash => {
  const hasDatums = Array.isArray(datums) && datums.length > 0

  // Language views encoding (handles PlutusV1 indefinite-length quirk per spec)
  const langViewsBytes = CostModel.languageViewsEncoding(costModels)

  let payload: Uint8Array

  if (hasDatums && redeemers.size === 0) {
    // Special case (CDDL): [ A0 | tag(258) datums | A0 ]
    const datumsBytes = encodeDatumsTaggedSet(datums)
    payload = concatBytes(
      new Uint8Array([0xa0]), // Empty map
      datumsBytes,
      new Uint8Array([0xa0]) // Empty map
    )
  } else {
    // Encode redeemers based on concrete type
    const redeemersBytes =
      redeemers._tag === "RedeemerMap"
        ? Redeemers.toCBORBytesMap(redeemers, options)
        : Redeemers.toCBORBytes(redeemers, options)
    const datumsBytes = hasDatums ? encodeDatumsTaggedSet(datums) : undefined

    payload = datumsBytes
      ? concatBytes(redeemersBytes, datumsBytes, langViewsBytes)
      : concatBytes(redeemersBytes, langViewsBytes)
  }

  const digest = blake2b(payload, { dkLen: 32 })
  return new ScriptDataHash.ScriptDataHash({ hash: digest })
}

/**
 * Compute hash of auxiliary data (tag 259) per ledger rules.
 */
export const hashAuxiliaryData = (aux: AuxiliaryData.AuxiliaryData): AuxiliaryDataHash.AuxiliaryDataHash => {
  const bytes = AuxiliaryData.toCBORBytes(aux)
  const digest = blake2b(bytes, { dkLen: 32 })
  return new AuxiliaryDataHash.AuxiliaryDataHash({ bytes: digest })
}

/**
 * Compute total ex_units by summing over redeemers.
 */
export const computeTotalExUnits = (redeemers: ReadonlyArray<Redeemer.Redeemer>): Redeemer.ExUnits => {
  let mem = 0n
  let steps = 0n
  for (const r of redeemers) {
    mem += r.exUnits.mem
    steps += r.exUnits.steps
  }
  return new Redeemer.ExUnits({ mem, steps })
}
