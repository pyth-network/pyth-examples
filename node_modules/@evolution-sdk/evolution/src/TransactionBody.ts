import { Either as E, Equal, FastCheck, Hash, Inspectable, ParseResult, Schema } from "effect"
import type { NonEmptyArray } from "effect/Array"

import * as Anchor from "./Anchor.js"
import * as AuxiliaryDataHash from "./AuxiliaryDataHash.js"
import * as Bytes from "./Bytes.js"
import * as CBOR from "./CBOR.js"
import * as Certificate from "./Certificate.js"
import * as Coin from "./Coin.js"
import * as GovernanceAction from "./GovernanceAction.js"
import * as KeyHash from "./KeyHash.js"
import * as Mint from "./Mint.js"
import * as NetworkId from "./NetworkId.js"
import * as PositiveCoin from "./PositiveCoin.js"
import * as ProposalProcedure from "./ProposalProcedure.js"
import * as ProposalProcedures from "./ProposalProcedures.js"
import * as RewardAccount from "./RewardAccount.js"
import * as ScriptDataHash from "./ScriptDataHash.js"
import * as TransactionInput from "./TransactionInput.js"
import * as TxOut from "./TxOut.js"
import * as VotingProcedures from "./VotingProcedures.js"
import * as Withdrawals from "./Withdrawals.js"

// Helper functions for array comparison
const arrayEquals = <A>(a: ReadonlyArray<A> | undefined, b: ReadonlyArray<A> | undefined): boolean => {
  if (a === b) return true
  if (a === undefined || b === undefined) return false
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (!Equal.equals(a[i], b[i])) return false
  }
  return true
}

// Helper function for array hashing
const arrayHash = <A>(arr: ReadonlyArray<A> | undefined): number => {
  if (arr === undefined) return 0
  let hash = Hash.number(arr.length)
  for (const item of arr) {
    hash = Hash.combine(hash)(Hash.hash(item))
  }
  return hash
}

/**
 * TransactionBody
 *
 * ```
 * transaction_body =
 *   {   0  : set<transaction_input>
 *   ,   1  : [* transaction_output]
 *   ,   2  : coin
 *   , ? 3  : slot_no
 *   , ? 4  : certificates
 *   , ? 5  : withdrawals
 *   , ? 7  : auxiliary_data_hash
 *   , ? 8  : slot_no
 *   , ? 9  : mint
 *   , ? 11 : script_data_hash
 *   , ? 13 : nonempty_set<transaction_input>
 *   , ? 14 : required_signers
 *   , ? 15 : network_id
 *   , ? 16 : transaction_output
 *   , ? 17 : coin
 *   , ? 18 : nonempty_set<transaction_input>
 *   , ? 19 : voting_procedures
 *   , ? 20 : proposal_procedures
 *   , ? 21 : coin
 *   , ? 22 : positive_coin
 *   }
 * ```
 *
 * @since 2.0.0
 * @category model
 */
export class TransactionBody extends Schema.TaggedClass<TransactionBody>()("TransactionBody", {
  inputs: Schema.Array(TransactionInput.TransactionInput), // 0
  outputs: Schema.Array(TxOut.TransactionOutput), // 1
  fee: Coin.Coin, // 2
  ttl: Schema.optional(Schema.BigInt), // 3 - slot_no
  certificates: Schema.optional(Schema.NonEmptyArray(Certificate.Certificate)), // 4
  withdrawals: Schema.optional(Withdrawals.Withdrawals), // 5
  auxiliaryDataHash: Schema.optional(AuxiliaryDataHash.AuxiliaryDataHash), // 7
  validityIntervalStart: Schema.optional(Schema.BigInt), // 8 - slot_no
  mint: Schema.optional(Mint.Mint), // 9
  scriptDataHash: Schema.optional(ScriptDataHash.ScriptDataHash), // 11
  collateralInputs: Schema.optional(Schema.NonEmptyArray(TransactionInput.TransactionInput)), // 13
  requiredSigners: Schema.optional(Schema.NonEmptyArray(KeyHash.KeyHash)), // 14
  networkId: Schema.optional(NetworkId.NetworkId), // 15
  collateralReturn: Schema.optional(TxOut.TransactionOutput), // 16
  totalCollateral: Schema.optional(Coin.Coin), // 17
  referenceInputs: Schema.optional(Schema.NonEmptyArray(TransactionInput.TransactionInput)), // 18
  votingProcedures: Schema.optional(VotingProcedures.VotingProcedures), // 19
  proposalProcedures: Schema.optional(ProposalProcedures.ProposalProcedures), // 20
  currentTreasuryValue: Schema.optional(Coin.Coin), // 21
  donation: Schema.optional(PositiveCoin.PositiveCoinSchema) // 22
}) {
  toJSON() {
    return {
      _tag: this._tag,
      inputs: this.inputs.map((i) => i.toJSON()),
      outputs: this.outputs.map((o) => o.toJSON()),
      fee: this.fee.toString(),
      ttl: this.ttl?.toString(),
      certificates: this.certificates?.map((c) => c.toJSON()),
      withdrawals: this.withdrawals?.toJSON(),
      auxiliaryDataHash: this.auxiliaryDataHash?.toJSON(),
      validityIntervalStart: this.validityIntervalStart?.toString(),
      mint: this.mint?.toJSON(),
      scriptDataHash: this.scriptDataHash?.toJSON(),
      collateralInputs: this.collateralInputs?.map((i) => i.toJSON()),
      requiredSigners: this.requiredSigners,
      networkId: this.networkId,
      collateralReturn: this.collateralReturn?.toJSON(),
      totalCollateral: this.totalCollateral?.toString(),
      referenceInputs: this.referenceInputs?.map((i) => i.toJSON()),
      votingProcedures: this.votingProcedures?.toJSON(),
      proposalProcedures: this.proposalProcedures?.toJSON(),
      currentTreasuryValue: this.currentTreasuryValue?.toString(),
      donation: this.donation?.toString()
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    if (!(that instanceof TransactionBody)) return false
    return (
      arrayEquals(this.inputs, that.inputs) &&
      arrayEquals(this.outputs, that.outputs) &&
      Equal.equals(this.fee, that.fee) &&
      this.ttl === that.ttl &&
      arrayEquals(this.certificates, that.certificates) &&
      Equal.equals(this.withdrawals, that.withdrawals) &&
      Equal.equals(this.auxiliaryDataHash, that.auxiliaryDataHash) &&
      this.validityIntervalStart === that.validityIntervalStart &&
      Equal.equals(this.mint, that.mint) &&
      Equal.equals(this.scriptDataHash, that.scriptDataHash) &&
      arrayEquals(this.collateralInputs, that.collateralInputs) &&
      arrayEquals(this.requiredSigners, that.requiredSigners) &&
      Equal.equals(this.networkId, that.networkId) &&
      Equal.equals(this.collateralReturn, that.collateralReturn) &&
      this.totalCollateral === that.totalCollateral &&
      arrayEquals(this.referenceInputs, that.referenceInputs) &&
      Equal.equals(this.votingProcedures, that.votingProcedures) &&
      Equal.equals(this.proposalProcedures, that.proposalProcedures) &&
      this.currentTreasuryValue === that.currentTreasuryValue &&
      Equal.equals(this.donation, that.donation)
    )
  }

  /**
   * Custom hash implementation for TransactionBody.
   * Only hashes frequently-changing fields for performance.
   *
   * @since 2.0.0
   * @category hashing
   */
  [Hash.symbol](): number {
    // Hash only the most frequently changing fields
    // inputs, outputs, and fee are the most common changes
    return Hash.cached(
      this,
      Hash.combine(Hash.combine(Hash.hash(this.fee))(arrayHash(this.inputs)))(arrayHash(this.outputs))
    )
  }
}

// Pre-bind hot ParseResult helpers
const encodeTxInput = ParseResult.encodeEither(TransactionInput.FromCDDL)
const decodeTxInput = ParseResult.decodeEither(TransactionInput.FromCDDL)
const encodeTxOutput = ParseResult.encodeEither(TxOut.FromCDDL)
const decodeTxOutput = ParseResult.decodeEither(TxOut.FromCDDL)
const encodeCertificate = ParseResult.encodeEither(Certificate.FromCDDL)
const decodeCertificate = ParseResult.decodeEither(Certificate.FromCDDL)
const encodeMint = ParseResult.encodeEither(Mint.FromCDDL)
const decodeMint = ParseResult.decodeEither(Mint.FromCDDL)
const encodeVotingProcedures = ParseResult.encodeEither(VotingProcedures.FromCDDL)
const decodeVotingProcedures = ParseResult.decodeEither(VotingProcedures.FromCDDL)
const encodeProposalProcedure = ParseResult.encodeEither(ProposalProcedure.FromCDDL)
const decodeProposalProcedure = ParseResult.decodeEither(ProposalProcedure.FromCDDL)
const encodeRewardAccountBytes = ParseResult.encodeEither(RewardAccount.FromBytes)
const decodeRewardAccountBytes = ParseResult.decodeEither(RewardAccount.FromBytes)
const decodeAuxiliaryDataHash = ParseResult.decodeEither(AuxiliaryDataHash.FromBytes)
const decodeScriptDataHash = ParseResult.decodeEither(ScriptDataHash.FromBytes)
const decodeKeyHash = ParseResult.decodeEither(KeyHash.FromBytes)

const decodeTaggedInputs = ParseResult.decodeUnknownEither(CBOR.tag(258, Schema.Array(TransactionInput.FromCDDL)))
const decodeUntaggedInputs = ParseResult.decodeUnknownEither(Schema.Array(TransactionInput.FromCDDL))

/**
 * CDDL schema for TransactionBody struct structure.
 *
 * @since 2.0.0
 * @category schemas
 */
export const CDDLSchema = Schema.declare(
  (input: unknown): input is Map<bigint, CBOR.CBOR> => input instanceof Map
).annotations({ identifier: "TransactionBody.CDDLSchema" })

type CDDLSchema = typeof CDDLSchema.Type

export const FromCDDL = Schema.transformOrFail(CDDLSchema, Schema.typeSchema(TransactionBody), {
  strict: true,
  encode: (toA) =>
    E.gen(function* () {
      const record = new Map<bigint, CBOR.CBOR>()

      // Required fields
      // 0: inputs - always tagged as set
      const inputsLen = toA.inputs.length
      const inputsArr = new Array(inputsLen)
      for (let i = 0; i < inputsLen; i++) {
        inputsArr[i] = yield* encodeTxInput(toA.inputs[i])
      }
      record.set(0n, CBOR.Tag.make({ tag: 258, value: inputsArr }, { disableValidation: true }))

      // 1: outputs
      const outputsLen = toA.outputs.length
      const outputsArr = new Array(outputsLen)
      for (let i = 0; i < outputsLen; i++) {
        outputsArr[i] = yield* encodeTxOutput(toA.outputs[i])
      }
      record.set(1n, outputsArr)

      // 2: fee
      record.set(2n, toA.fee)

      // Optional fields (assign directly when present)
      if (toA.ttl !== undefined) record.set(3n, toA.ttl)

      if (toA.certificates) {
        const len = toA.certificates.length
        const arr = new Array(len)
        for (let i = 0; i < len; i++) {
          arr[i] = yield* encodeCertificate(toA.certificates[i])
        }
        record.set(4n, arr)
      }

      if (toA.withdrawals) {
        const map = new Map<Uint8Array, bigint>()
        for (const [rewardAccount, coin] of toA.withdrawals.withdrawals.entries()) {
          const accountBytes = yield* encodeRewardAccountBytes(rewardAccount)
          map.set(accountBytes, coin)
        }
        record.set(5n, map)
      }

      if (toA.auxiliaryDataHash) record.set(7n, toA.auxiliaryDataHash.bytes)

      if (toA.validityIntervalStart !== undefined) record.set(8n, toA.validityIntervalStart)

      if (toA.mint) record.set(9n, yield* encodeMint(toA.mint))

      if (toA.scriptDataHash) record.set(11n, toA.scriptDataHash.hash)

      if (toA.collateralInputs) {
        const len = toA.collateralInputs.length
        const arr = new Array(len)
        for (let i = 0; i < len; i++) {
          arr[i] = yield* encodeTxInput(toA.collateralInputs[i])
        }
        record.set(13n, CBOR.Tag.make({ tag: 258, value: arr }, { disableValidation: true }))
      }

      if (toA.requiredSigners) {
        const len = toA.requiredSigners.length
        const arr = new Array(len)
        for (let i = 0; i < len; i++) {
          arr[i] = toA.requiredSigners[i].hash
        }
        record.set(14n, CBOR.Tag.make({ tag: 258, value: arr }, { disableValidation: true }))
      }

      if (toA.networkId !== undefined) record.set(15n, BigInt(toA.networkId))

      if (toA.collateralReturn) {
        record.set(16n, yield* encodeTxOutput(toA.collateralReturn))
      }

      if (toA.totalCollateral !== undefined) record.set(17n, toA.totalCollateral)

      if (toA.referenceInputs) {
        const len = toA.referenceInputs.length
        const arr = new Array(len)
        for (let i = 0; i < len; i++) {
          arr[i] = yield* encodeTxInput(toA.referenceInputs[i])
        }
        record.set(18n, CBOR.Tag.make({ tag: 258, value: arr }, { disableValidation: true }))
      }

      if (toA.votingProcedures) record.set(19n, yield* encodeVotingProcedures(toA.votingProcedures))

      if (toA.proposalProcedures && toA.proposalProcedures.procedures.length > 0) {
        const len = toA.proposalProcedures.procedures.length
        const arr = new Array(len)
        for (let i = 0; i < len; i++) {
          arr[i] = yield* encodeProposalProcedure(toA.proposalProcedures.procedures[i])
        }
        record.set(20n, CBOR.Tag.make({ tag: 258, value: arr }, { disableValidation: true }))
      }

      if (toA.currentTreasuryValue !== undefined) record.set(21n, toA.currentTreasuryValue)

      if (toA.donation !== undefined) record.set(22n, toA.donation)

      return record as CDDLSchema
    }),
  decode: (fromA) =>
    E.gen(function* () {
      // Required fields - accept both tag-258 (Conway) and plain array (Babbage)
      const inputsRaw = fromA.get(0n)
      const taggedResult = decodeTaggedInputs(inputsRaw)
      const inputs = E.isRight(taggedResult)
        ? taggedResult.right.value
        : yield* decodeUntaggedInputs(inputsRaw)

      // const inputsArray = inputsTag.value
      // const inputsLen = inputsArray.length
      // const inputs = new Array(inputsLen)
      // for (let i = 0; i < inputsLen; i++) {
      //   inputs[i] = yield* decodeTxInput(inputsArray[i])
      // }

      const outputsArray = fromA.get(1n) as Array<typeof TxOut.CDDLSchema.Type>
      const outputsLen = outputsArray.length
      const outputs = new Array(outputsLen)
      for (let i = 0; i < outputsLen; i++) {
        outputs[i] = yield* decodeTxOutput(outputsArray[i])
      }
      const fee = fromA.get(2n) as bigint

      // Optional fields - access as record properties
      const ttl = fromA.get(3n) as bigint | undefined

      const certificatesArray = fromA.get(4n) as Array<typeof Certificate.CDDLSchema.Type>
      let certificates: NonEmptyArray<Certificate.Certificate> | undefined
      if (certificatesArray) {
        const len = certificatesArray.length
        const arr = new Array(len)
        for (let i = 0; i < len; i++) {
          arr[i] = yield* decodeCertificate(certificatesArray[i])
        }
        certificates = arr as NonEmptyArray<Certificate.Certificate>
      }

      let withdrawals: Withdrawals.Withdrawals | undefined
      const withdrawalsMap = fromA.get(5n) as typeof Withdrawals.CDDLSchema.Type | undefined
      if (withdrawalsMap) {
        const decodedWithdrawals = new Map<RewardAccount.RewardAccount, Coin.Coin>()
        const entriesIter = (withdrawalsMap as ReadonlyMap<Uint8Array, bigint>).entries()
        for (const [accountBytes, coinAmount] of entriesIter) {
          const rewardAccount = yield* decodeRewardAccountBytes(accountBytes)
          decodedWithdrawals.set(rewardAccount, coinAmount)
        }
        withdrawals = new Withdrawals.Withdrawals({ withdrawals: decodedWithdrawals })
      }

      const auxiliaryDataHashBytes = fromA.get(7n) as Uint8Array | undefined
      const auxiliaryDataHash = auxiliaryDataHashBytes
        ? yield* decodeAuxiliaryDataHash(auxiliaryDataHashBytes)
        : undefined
      const validityIntervalStart = fromA.get(8n) as bigint | undefined
      const mintData = fromA.get(9n) as typeof Mint.CDDLSchema.Type | undefined
      const mint = mintData ? yield* decodeMint(mintData) : undefined
      const scriptDataHashBytes = fromA.get(11n) as Uint8Array | undefined
      const scriptDataHash = scriptDataHashBytes ? yield* decodeScriptDataHash(scriptDataHashBytes) : undefined

      // Accept both tag-258 (Conway) and plain array (Babbage) for collateral inputs
      const collateralInputsRaw = fromA.get(13n) as
        | { _tag: "Tag"; tag: 258; value: ReadonlyArray<typeof TransactionInput.CDDLSchema.Type> }
        | ReadonlyArray<typeof TransactionInput.CDDLSchema.Type>
        | undefined
      const collateralInputsArray = collateralInputsRaw
        ? (collateralInputsRaw as any)._tag === "Tag"
          ? (collateralInputsRaw as any).value
          : collateralInputsRaw
        : undefined
      let collateralInputs: NonEmptyArray<TransactionInput.TransactionInput> | undefined
      if (collateralInputsArray) {
        const len = collateralInputsArray.length
        const arr = new Array(len)
        for (let i = 0; i < len; i++) {
          arr[i] = yield* decodeTxInput(collateralInputsArray[i])
        }
        collateralInputs = arr as NonEmptyArray<TransactionInput.TransactionInput>
      }

      // Accept both tag-258 (Conway) and plain array (Babbage) for required signers
      const requiredSignersRaw = fromA.get(14n) as
        | { _tag: "Tag"; tag: 258; value: ReadonlyArray<Uint8Array> }
        | ReadonlyArray<Uint8Array>
        | undefined
      const requiredSignersArray = requiredSignersRaw
        ? (requiredSignersRaw as any)._tag === "Tag"
          ? (requiredSignersRaw as any).value
          : requiredSignersRaw
        : undefined
      let requiredSigners: NonEmptyArray<KeyHash.KeyHash> | undefined
      if (requiredSignersArray) {
        const len = requiredSignersArray.length
        const arr = new Array(len)
        for (let i = 0; i < len; i++) {
          arr[i] = yield* decodeKeyHash(requiredSignersArray[i])
        }
        requiredSigners = arr as NonEmptyArray<KeyHash.KeyHash>
      }
      const networkIdBigInt = fromA.get(15n) as bigint | undefined
      const networkId = networkIdBigInt !== undefined ? (Number(networkIdBigInt) as NetworkId.NetworkId) : undefined
      const collateralReturnData = fromA.get(16n) as typeof TxOut.CDDLSchema.Type | undefined
      const collateralReturn = collateralReturnData ? yield* decodeTxOutput(collateralReturnData) : undefined
      const totalCollateral = fromA.get(17n) as Coin.Coin | undefined

      // Accept both tag-258 (Conway) and plain array (Babbage) for reference inputs
      const referenceInputsRaw = fromA.get(18n) as
        | { _tag: "Tag"; tag: 258; value: ReadonlyArray<typeof TransactionInput.CDDLSchema.Type> }
        | ReadonlyArray<typeof TransactionInput.CDDLSchema.Type>
        | undefined
      const referenceInputsArray: ReadonlyArray<typeof TransactionInput.CDDLSchema.Type> | undefined = referenceInputsRaw
        ? (referenceInputsRaw as any)._tag === "Tag"
          ? (referenceInputsRaw as any).value
          : referenceInputsRaw
        : undefined
      let referenceInputs: NonEmptyArray<TransactionInput.TransactionInput> | undefined
      if (referenceInputsArray) {
        const len = referenceInputsArray.length
        const arr = new Array(len)
        for (let i = 0; i < len; i++) {
          arr[i] = yield* decodeTxInput(referenceInputsArray[i])
        }
        referenceInputs = arr as NonEmptyArray<TransactionInput.TransactionInput>
      }
      const votingProceduresData = fromA.get(19n) as typeof VotingProcedures.CDDLSchema.Type | undefined
      const votingProcedures = votingProceduresData ? yield* decodeVotingProcedures(votingProceduresData) : undefined
      // Accept both tag-258 (Conway) and plain array (Babbage) for proposal procedures
      const proposalProceduresRaw = fromA.get(20n) as
        | { _tag: "Tag"; tag: 258; value: ReadonlyArray<typeof ProposalProcedure.CDDLSchema.Type> }
        | ReadonlyArray<typeof ProposalProcedure.CDDLSchema.Type>
        | undefined
      const proposalProceduresArray: ReadonlyArray<typeof ProposalProcedure.CDDLSchema.Type> | undefined = proposalProceduresRaw
        ? (proposalProceduresRaw as any)._tag === "Tag"
          ? (proposalProceduresRaw as any).value
          : proposalProceduresRaw
        : undefined
      const proposalProcedures = proposalProceduresArray
        ? new ProposalProcedures.ProposalProcedures({
            procedures: yield* E.all(proposalProceduresArray.map((pp) => decodeProposalProcedure(pp)))
          })
        : undefined
      const currentTreasuryValue = fromA.get(21n) as Coin.Coin | undefined
      const donation = fromA.get(22n) as Coin.Coin | undefined

      const result = new TransactionBody(
        {
          inputs,
          outputs,
          fee,
          ttl,
          certificates,
          withdrawals,
          auxiliaryDataHash,
          validityIntervalStart,
          mint,
          scriptDataHash,
          collateralInputs,
          requiredSigners,
          networkId,
          collateralReturn,
          totalCollateral,
          referenceInputs,
          votingProcedures,
          proposalProcedures,
          currentTreasuryValue,
          donation
        },
        { disableValidation: true }
      )
      return result
    })
})

/**
 * CBOR bytes transformation schema for TransactionBody.
 * Transforms between CBOR bytes and TransactionBody using Conway CDDL specification.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(CBOR.FromBytes(options), FromCDDL).annotations({
    identifier: "TransactionBody.FromCBORBytes",
    title: "TransactionBody from CBOR bytes",
    description: "Decode TransactionBody from CBOR-encoded bytes using Conway CDDL specification"
  })

/**
 * CBOR hex transformation schema for TransactionBody.
 * Transforms between CBOR hex string and TransactionBody using Conway CDDL specification.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(CBOR.FromHex(options), FromCDDL).annotations({
    identifier: "TransactionBody.FromCBORHex",
    title: "TransactionBody from CBOR hex",
    description: "Decode TransactionBody from CBOR-encoded hex string using Conway CDDL specification"
  })

export const isTransactionBody = Schema.is(TransactionBody)

/**
 * Convert CBOR bytes to TransactionBody.
 *
 * @since 2.0.0
 * @category conversion
 */
export const fromCBORBytes = (bytes: Uint8Array, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORBytes(options))(bytes)

/**
 * Convert CBOR hex string to TransactionBody.
 *
 * @since 2.0.0
 * @category conversion
 */
export const fromCBORHex = (hex: string, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORHex(options))(hex)

/**
 * Convert TransactionBody to CBOR bytes.
 *
 * @since 2.0.0
 * @category conversion
 */
export const toCBORBytes = (data: TransactionBody, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORBytes(options))(data)

/**
 * Convert TransactionBody to CBOR hex string.
 *
 * @since 2.0.0
 * @category conversion
 */
export const toCBORHex = (data: TransactionBody, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORHex(options))(data)

/**
 * Parse a TransactionBody from CBOR bytes and return the root format tree.
 *
 * @since 2.0.0
 * @category conversion
 */
export const fromCBORBytesWithFormat = (
  bytes: Uint8Array
): CBOR.DecodedWithFormat<TransactionBody> => {
  const decoded = CBOR.fromCBORBytesWithFormat(bytes)
  const value = Schema.decodeSync(FromCDDL)(decoded.value as Map<bigint, CBOR.CBOR>)
  return { value, format: decoded.format }
}

/**
 * Parse a TransactionBody from CBOR hex string and return the root format tree.
 *
 * @since 2.0.0
 * @category conversion
 */
export const fromCBORHexWithFormat = (
  hex: string
): CBOR.DecodedWithFormat<TransactionBody> => {
  const decoded = CBOR.fromCBORHexWithFormat(hex)
  const value = Schema.decodeSync(FromCDDL)(decoded.value as Map<bigint, CBOR.CBOR>)
  return { value, format: decoded.format }
}

/**
 * Convert a TransactionBody to CBOR bytes using an explicit root format tree.
 *
 * @since 2.0.0
 * @category conversion
 */
export const toCBORBytesWithFormat = (
  data: TransactionBody,
  format: CBOR.CBORFormat
): Uint8Array => {
  const cborMap = Schema.encodeSync(FromCDDL)(data)
  return CBOR.toCBORBytesWithFormat(cborMap, format)
}

/**
 * Convert a TransactionBody to CBOR hex string using an explicit root format tree.
 *
 * @since 2.0.0
 * @category conversion
 */
export const toCBORHexWithFormat = (
  data: TransactionBody,
  format: CBOR.CBORFormat
): string => {
  const cborMap = Schema.encodeSync(FromCDDL)(data)
  return CBOR.toCBORHexWithFormat(cborMap, format)
}

// ============================================================================
// FastCheck Arbitrary
// ============================================================================

/**
 * FastCheck arbitrary for generating random TransactionBody instances.
 * Used for property-based testing to generate valid test data.
 *
 * Generates basic TransactionBody instances with required fields (inputs, outputs, fee)
 * and optionally includes some other common fields.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary: FastCheck.Arbitrary<TransactionBody> =
  // First, generate core fields
  FastCheck.record({
    inputs: FastCheck.uniqueArray(TransactionInput.arbitrary, {
      minLength: 1,
      maxLength: 5,
      selector: (i) => `${Bytes.toHex(i.transactionId.hash)}:${i.index.toString()}`
    }),
    outputs: FastCheck.array(TxOut.arbitrary, { minLength: 1, maxLength: 5 }),
    fee: Coin.arbitrary,
    networkId: FastCheck.option(FastCheck.integer({ min: 0, max: 1 }), { nil: undefined }),
    // Optional extra (added first for iterative hardening)
    auxiliaryDataHash: FastCheck.option(AuxiliaryDataHash.arbitrary, { nil: undefined }),
    // Second optional extra: donation (positive_coin)
    donation: FastCheck.option(PositiveCoin.arbitrary, { nil: undefined }),
    // Third optional extra: script_data_hash
    scriptDataHash: FastCheck.option(ScriptDataHash.arbitrary, { nil: undefined }),
    // Fourth optional extra: mint
    mint: FastCheck.option(Mint.arbitrary, { nil: undefined }),
    // Fifth optional extra: current_treasury_value (coin)
    currentTreasuryValue: FastCheck.option(Coin.arbitrary, { nil: undefined }),
    // Sixth optional extra: required_signers (nonempty unique KeyHash[])
    requiredSigners: FastCheck.option(
      FastCheck.uniqueArray(KeyHash.arbitrary, {
        minLength: 1,
        maxLength: 5,
        selector: (k) => Bytes.toHex(k.hash)
      }),
      { nil: undefined }
    ),
    // Seventh optional extra: withdrawals
    withdrawals: FastCheck.option(Withdrawals.arbitrary, { nil: undefined }),
    // Eighth optional extra: certificates
    certificates: FastCheck.option(FastCheck.array(Certificate.arbitrary, { minLength: 1, maxLength: 5 }), {
      nil: undefined
    }),
    // Ninth optional extra: collateral_inputs (nonempty unique set)
    collateralInputs: FastCheck.option(
      FastCheck.uniqueArray(TransactionInput.arbitrary, {
        minLength: 1,
        maxLength: 3,
        selector: (i) => `${Bytes.toHex(i.transactionId.hash)}:${i.index.toString()}`
      }),
      { nil: undefined }
    ),
    // Tenth optional extra: reference_inputs (nonempty unique set)
    referenceInputs: FastCheck.option(
      FastCheck.uniqueArray(TransactionInput.arbitrary, {
        minLength: 1,
        maxLength: 3,
        selector: (i) => `${Bytes.toHex(i.transactionId.hash)}:${i.index.toString()}`
      }),
      { nil: undefined }
    ),
    // Eleventh optional extra: collateral_return (transaction_output)
    collateralReturn: FastCheck.option(TxOut.arbitrary, { nil: undefined }),
    // Twelfth optional extra: total_collateral (coin)
    totalCollateral: FastCheck.option(Coin.arbitrary, { nil: undefined }),
    // Thirteenth optional extra: voting_procedures
    votingProcedures: FastCheck.option(VotingProcedures.arbitrary, { nil: undefined }),
    // Fourteenth optional extra: proposal_procedures (nonempty set) with non-null anchors per CML parity
    proposalProcedures: FastCheck.option(
      FastCheck.record({
        procedures: FastCheck.array(
          FastCheck.record({
            deposit: Coin.arbitrary,
            rewardAccount: RewardAccount.arbitrary,
            governanceAction: GovernanceAction.arbitrary,
            anchor: Anchor.arbitrary
          }).map((params) => new ProposalProcedure.ProposalProcedure(params)),
          { minLength: 1, maxLength: 3 }
        )
      }).map((params) => new ProposalProcedures.ProposalProcedures(params)),
      { nil: undefined }
    )
  })
    // Then, stitch in ttl/vis with the invariant ttl ≥ vis when both present
    .chain((base) => {
      const visArb = FastCheck.bigInt({ min: 0n, max: 10_000_000n })
      const ttlArb = FastCheck.bigInt({ min: 0n, max: 10_000_000n })

      const both = FastCheck.tuple(visArb, ttlArb).map(([vis, ttl]) => {
        // Ensure ttl >= vis
        return ttl < vis ? { ttl: vis, validityIntervalStart: ttl } : { ttl, validityIntervalStart: vis }
      })

      const onlyVis = visArb.map((vis) => ({ ttl: undefined as bigint | undefined, validityIntervalStart: vis }))
      const onlyTtl = ttlArb.map((ttl) => ({ ttl, validityIntervalStart: undefined as bigint | undefined }))
      const none = FastCheck.constant({
        ttl: undefined as bigint | undefined,
        validityIntervalStart: undefined as bigint | undefined
      })

      return FastCheck.oneof({ arbitrary: both, weight: 2 }, onlyVis, onlyTtl, none).map(
        ({ ttl, validityIntervalStart }) => ({
          ...base,
          ttl,
          validityIntervalStart
        })
      )
    })
    .map((props) => {
      return new TransactionBody({
        inputs: props.inputs,
        outputs: props.outputs,
        fee: props.fee,
        ttl: props.ttl,
        certificates: props.certificates as NonEmptyArray<Certificate.Certificate> | undefined,
        withdrawals: props.withdrawals,
        auxiliaryDataHash: props.auxiliaryDataHash,
        validityIntervalStart: props.validityIntervalStart,
        mint: props.mint,
        scriptDataHash: props.scriptDataHash,
        collateralInputs: props.collateralInputs as NonEmptyArray<TransactionInput.TransactionInput> | undefined,
        requiredSigners: props.requiredSigners as NonEmptyArray<KeyHash.KeyHash> | undefined,
        networkId: props.networkId as NetworkId.NetworkId | undefined,
        collateralReturn: props.collateralReturn,
        totalCollateral: props.totalCollateral,
        referenceInputs: props.referenceInputs as NonEmptyArray<TransactionInput.TransactionInput> | undefined,
        votingProcedures: props.votingProcedures,
        proposalProcedures: props.proposalProcedures,
        currentTreasuryValue: props.currentTreasuryValue,
        donation: props.donation
      })
    })
