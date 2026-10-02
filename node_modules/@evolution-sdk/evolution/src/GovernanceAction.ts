import { Effect as Eff, Equal, FastCheck, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as Bytes from "./Bytes.js"
import * as CBOR from "./CBOR.js"
import * as Coin from "./Coin.js"
import * as CommiteeColdCredential from "./CommitteeColdCredential.js"
import * as Constituion from "./Constitution.js"
import * as Credential from "./Credential.js"
import * as EpochNo from "./EpochNo.js"
import * as ProtocolParamUpdate from "./ProtocolParamUpdate.js"
import * as ProtocolVersion from "./ProtocolVersion.js"
import * as RewardAccount from "./RewardAccount.js"
import * as ScriptHash from "./ScriptHash.js"
import * as TransactionHash from "./TransactionHash.js"
import * as TransactionIndex from "./TransactionIndex.js"
import * as UnitInterval from "./UnitInterval.js"

/**
 * Helper for array equality using element-by-element comparison.
 */
const arrayEquals = <A>(a: ReadonlyArray<A> | undefined, b: ReadonlyArray<A> | undefined): boolean => {
  if (a === b) return true
  if (a === undefined || b === undefined) return false
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (!Equal.equals(a[i], b[i])) return false
  }
  return true
}

/**
 * Helper for array hashing using element hashes.
 */
const arrayHash = <A>(arr: ReadonlyArray<A>): number => {
  let hash = 0
  for (const item of arr) {
    hash = Hash.combine(hash)(Hash.hash(item))
  }
  return hash
}

/**
 * Content-based Map equality helper.
 * Compares two Maps by content, handling nested Maps recursively.
 * Uses Equal.equals for key comparison since Map.has uses reference equality.
 */
const mapEquals = <K, V>(a: Map<K, V>, b: Map<K, V>): boolean => {
  if (a.size !== b.size) return false

  for (const [keyA, valueA] of a) {
    // Find matching key in b using Equal.equals
    let found = false
    for (const [keyB, valueB] of b) {
      if (Equal.equals(keyA, keyB)) {
        found = true
        // Handle nested Map values
        if (valueA instanceof Map && valueB instanceof Map) {
          if (!mapEquals(valueA as any, valueB as any)) return false
        } else if (!Equal.equals(valueA, valueB)) {
          return false
        }
        break
      }
    }
    if (!found) return false
  }

  return true
}

/**
 * Content-based Map hash helper.
 * XORs hashes of all entries for order-independent content-based hash.
 */
const mapHash = <K, V>(map: Map<K, V>): number => {
  let hash = 0
  for (const [key, value] of map) {
    const entryHash = Hash.combine(Hash.hash(key))(value instanceof Map ? mapHash(value as any) : Hash.hash(value))
    hash ^= entryHash
  }
  return hash
}

/**
 * GovActionId schema representing a governance action identifier.
 * ```
 * According to Conway CDDL: gov_action_id = [transaction_id : transaction_id, gov_action_index : uint .size 2]
 * ```
 *
 * @since 2.0.0
 * @category schemas
 */
export class GovActionId extends Schema.TaggedClass<GovActionId>()("GovActionId", {
  transactionId: TransactionHash.TransactionHash, // transaction_id (hash32)
  govActionIndex: TransactionIndex.TransactionIndex // uint .size 2 (governance action index)
}) {
  toJSON() {
    return {
      _tag: this._tag,
      transactionId: this.transactionId,
      govActionIndex: this.govActionIndex
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
      that instanceof GovActionId &&
      Equal.equals(this.transactionId, that.transactionId) &&
      Equal.equals(this.govActionIndex, that.govActionIndex)
    )
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.combine(Hash.hash(this.transactionId))(Hash.hash(this.govActionIndex)))
  }
}

/**
 * CDDL schema for GovActionId tuple structure.
 * ```
 * For CBOR encoding: [transaction_id: bytes, gov_action_index: uint]
 * ```
 *
 * @since 2.0.0
 * @category schemas
 */
export const GovActionIdCDDL = Schema.Tuple(
  CBOR.ByteArray, // transaction_id as bytes
  CBOR.Integer // gov_action_index as uint
)

/**
 * CDDL transformation schema for GovActionId.
 *
 * @since 2.0.0
 * @category schemas
 */
export const GovActionIdFromCDDL = Schema.transformOrFail(GovActionIdCDDL, Schema.typeSchema(GovActionId), {
  strict: true,
  encode: (_, __, ___, toA) =>
    Eff.gen(function* () {
      // Convert domain types to CBOR types
      const transactionIdBytes = toA.transactionId.hash
      const indexNumber = yield* ParseResult.encode(TransactionIndex.TransactionIndex)(toA.govActionIndex)
      return [transactionIdBytes, BigInt(indexNumber)] as const
    }),
  decode: (fromA) =>
    Eff.gen(function* () {
      const [transactionIdBytes, govActionIndex] = fromA
      // Convert CBOR types to domain types
      const transactionId = new TransactionHash.TransactionHash({ hash: transactionIdBytes })
      const govActionIndexParsed = yield* ParseResult.decode(Schema.typeSchema(TransactionIndex.TransactionIndex))(
        govActionIndex
      )
      const govActionId = new GovActionId({
        transactionId,
        govActionIndex: govActionIndexParsed
      })
      return govActionId
    })
})

/**
 * Parameter change governance action schema.
 * ```
 * According to Conway CDDL: parameter_change_action =
 *   (0, gov_action_id/ nil, protocol_param_update, policy_hash/ nil)
 * ```
 *
 * @since 2.0.0
 * @category schemas
 */
export class ParameterChangeAction extends Schema.TaggedClass<ParameterChangeAction>()("ParameterChangeAction", {
  govActionId: Schema.NullOr(GovActionId), // gov_action_id / nil
  protocolParamUpdate: ProtocolParamUpdate.ProtocolParamUpdate, // protocol_param_update
  policyHash: Schema.NullOr(ScriptHash.ScriptHash) // policy_hash / nil
}) {
  toJSON() {
    return {
      _tag: this._tag,
      govActionId: this.govActionId,
      protocolParamUpdate: this.protocolParamUpdate,
      policyHash: this.policyHash
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
      that instanceof ParameterChangeAction &&
      Equal.equals(this.govActionId, that.govActionId) &&
      Equal.equals(this.protocolParamUpdate, that.protocolParamUpdate) &&
      Equal.equals(this.policyHash, that.policyHash)
    )
  }

  [Hash.symbol](): number {
    return Hash.cached(
      this,
      Hash.combine(Hash.combine(Hash.hash(this.govActionId))(Hash.hash(this.protocolParamUpdate)))(
        Hash.hash(this.policyHash)
      )
    )
  }
}

/**
 * CDDL schema for ParameterChangeAction tuple structure.
 * Maps to: (0, gov_action_id/ nil, protocol_param_update, policy_hash/ nil)
 *
 * @since 2.0.0
 * @category schemas
 */
export const ParameterChangeActionCDDL = Schema.Tuple(
  Schema.Literal(0n), // action type
  Schema.NullOr(GovActionIdCDDL), // gov_action_id / nil
  ProtocolParamUpdate.CDDLSchema, // protocol_param_update
  Schema.NullOr(CBOR.ByteArray) // policy_hash / nil
)

/**
 * CDDL transformation schema for ParameterChangeAction.
 *
 * @since 2.0.0
 * @category schemas
 */
export const ParameterChangeActionFromCDDL = Schema.transformOrFail(
  ParameterChangeActionCDDL,
  Schema.typeSchema(ParameterChangeAction),
  {
    strict: true,
    encode: (action) =>
      Eff.gen(function* () {
        const govActionId = action.govActionId
          ? yield* ParseResult.encode(GovActionIdFromCDDL)(action.govActionId)
          : null
        const protocolParamUpdateRO = yield* ParseResult.encode(ProtocolParamUpdate.FromCDDL)(
          action.protocolParamUpdate
        )
        const protocolParamUpdate = new Map<bigint, CBOR.CBOR>()
        for (const [k, v] of protocolParamUpdateRO) protocolParamUpdate.set(k, v)
        const policyHash = action.policyHash ? yield* ParseResult.encode(ScriptHash.FromBytes)(action.policyHash) : null

        // Return as CBOR tuple
        return [0n, govActionId, protocolParamUpdate, policyHash] as const
      }),
    decode: (cddl) =>
      Eff.gen(function* () {
        const [, govActionIdCDDL, protocolParamUpdateCDDL, policyHash] = cddl
        const govActionId = govActionIdCDDL ? yield* ParseResult.decode(GovActionIdFromCDDL)(govActionIdCDDL) : null
        const protocolParamUpdate = yield* ParseResult.decode(ProtocolParamUpdate.FromCDDL)(protocolParamUpdateCDDL)
        const policyHashValue = policyHash ? yield* ParseResult.decode(ScriptHash.FromBytes)(policyHash) : null

        return new ParameterChangeAction({
          govActionId,
          protocolParamUpdate,
          policyHash: policyHashValue
        })
      })
  }
)

/**
 * Hard fork initiation governance action schema.
 * ```
 * According to Conway CDDL: hard_fork_initiation_action =
 *   (1, gov_action_id/ nil, protocol_version, policy_hash/ nil)
 * ```
 *
 * @since 2.0.0
 * @category schemas
 */
export class HardForkInitiationAction extends Schema.TaggedClass<HardForkInitiationAction>()(
  "HardForkInitiationAction",
  {
    govActionId: Schema.NullOr(GovActionId), // gov_action_id / nil
    protocolVersion: ProtocolVersion.ProtocolVersion // protocol_version = [major, minor]
  }
) {
  toJSON() {
    return {
      _tag: this._tag,
      govActionId: this.govActionId,
      protocolVersion: this.protocolVersion
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
      that instanceof HardForkInitiationAction &&
      Equal.equals(this.govActionId, that.govActionId) &&
      Equal.equals(this.protocolVersion, that.protocolVersion)
    )
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.combine(Hash.hash(this.govActionId))(Hash.hash(this.protocolVersion)))
  }
}

/**
 * CDDL schema for HardForkInitiationAction tuple structure.
 * ```
 * Maps to: (1, gov_action_id/ nil, protocol_version, policy_hash/ nil)
 * ```
 *
 * @since 2.0.0
 * @category schemas
 */
export const HardForkInitiationActionCDDL = Schema.Tuple(
  Schema.Literal(1n), // action type
  Schema.NullOr(GovActionIdCDDL), // gov_action_id / nil
  ProtocolVersion.CDDLSchema // protocol_version = [major, minor]
)

/**
 * CDDL transformation schema for HardForkInitiationAction.
 *
 * @since 2.0.0
 * @category schemas
 */
export const HardForkInitiationActionFromCDDL = Schema.transformOrFail(
  HardForkInitiationActionCDDL,
  Schema.typeSchema(HardForkInitiationAction),
  {
    strict: true,
    encode: (action) =>
      Eff.gen(function* () {
        const govActionId = action.govActionId
          ? yield* ParseResult.encode(GovActionIdFromCDDL)(action.govActionId)
          : null
        const protocolVersion = yield* ParseResult.encode(ProtocolVersion.FromCDDL)(action.protocolVersion)

        // Return as CBOR tuple
        return [1n, govActionId, protocolVersion] as const
      }),
    decode: (cddl) =>
      Eff.gen(function* () {
        const [, govActionIdCDDL, protocolVersion] = cddl
        const govActionId = govActionIdCDDL ? yield* ParseResult.decode(GovActionIdFromCDDL)(govActionIdCDDL) : null
        const protocolVersionValue = yield* ParseResult.decode(ProtocolVersion.FromCDDL)(protocolVersion)

        return new HardForkInitiationAction({
          govActionId,
          protocolVersion: protocolVersionValue
        })
      })
  }
)

/**
 * Treasury withdrawals governance action schema.
 * ```
 * According to Conway CDDL: treasury_withdrawals_action =
 *   (2, { * reward_account => coin }, policy_hash/ nil)
 * ```
 *
 * @since 2.0.0
 * @category schemas
 */
export class TreasuryWithdrawalsAction extends Schema.TaggedClass<TreasuryWithdrawalsAction>()(
  "TreasuryWithdrawalsAction",
  {
    withdrawals: Schema.Map({
      key: RewardAccount.FromBech32,
      value: Coin.Coin
    }),
    policyHash: Schema.NullOr(ScriptHash.ScriptHash) // policy_hash / nil
  }
) {
  toJSON() {
    return {
      _tag: this._tag,
      withdrawals: this.withdrawals,
      policyHash: this.policyHash
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
      that instanceof TreasuryWithdrawalsAction &&
      mapEquals(this.withdrawals, that.withdrawals) &&
      Equal.equals(this.policyHash, that.policyHash)
    )
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.combine(mapHash(this.withdrawals))(Hash.hash(this.policyHash)))
  }
}

/**
 * CDDL schema for TreasuryWithdrawalsAction tuple structure.
 * ```
 * Maps to: (2, { * reward_account => coin }, policy_hash/ nil)
 * ```
 *
 * @since 2.0.0
 * @category schemas
 */
export const TreasuryWithdrawalsActionCDDL = Schema.Tuple(
  Schema.Literal(2n), // action type
  Schema.MapFromSelf({
    key: CBOR.ByteArray, // reward_account as bytes
    value: CBOR.Integer // coin as bigint
  }),
  Schema.NullOr(CBOR.ByteArray) // policy_hash / nil
)

/**
 * CDDL transformation schema for TreasuryWithdrawalsAction.
 *
 * @since 2.0.0
 * @category schemas
 */
export const TreasuryWithdrawalsActionFromCDDL = Schema.transformOrFail(
  TreasuryWithdrawalsActionCDDL,
  Schema.typeSchema(TreasuryWithdrawalsAction),
  {
    strict: true,
    encode: (action) =>
      Eff.gen(function* () {
        const withdrawals = new Map<Uint8Array, bigint>()
        for (const [rewardAccount, coin] of action.withdrawals) {
          const rewardAccountBytes = yield* ParseResult.encode(RewardAccount.FromBytes)(rewardAccount)
          withdrawals.set(rewardAccountBytes, coin)
        }
        const policyHash = action.policyHash ? yield* ParseResult.encode(ScriptHash.FromBytes)(action.policyHash) : null

        // Return as CBOR tuple
        return [2n, withdrawals, policyHash] as const
      }),
    decode: (cddl) =>
      Eff.gen(function* () {
        const [, withdrawals, policyHash] = cddl
        const policyHashValue = policyHash ? yield* ParseResult.decode(ScriptHash.FromBytes)(policyHash) : null
        const withdrawalsMap = new Map<RewardAccount.RewardAccount, Coin.Coin>()
        for (const [rewardAccountBytes, coin] of withdrawals) {
          const rewardAccount = yield* ParseResult.decode(RewardAccount.FromBytes)(rewardAccountBytes)
          withdrawalsMap.set(rewardAccount, coin)
        }

        return new TreasuryWithdrawalsAction({
          withdrawals: withdrawalsMap,
          policyHash: policyHashValue
        })
      })
  }
)

/**
 * No confidence governance action schema.
 * ```
 * According to Conway CDDL: no_confidence =
 *   (3, gov_action_id/ nil)
 * ```
 *
 * @since 2.0.0
 * @category schemas
 */
export class NoConfidenceAction extends Schema.TaggedClass<NoConfidenceAction>()("NoConfidenceAction", {
  govActionId: Schema.NullOr(GovActionId) // gov_action_id / nil
}) {
  toJSON() {
    return {
      _tag: this._tag,
      govActionId: this.govActionId
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof NoConfidenceAction && Equal.equals(this.govActionId, that.govActionId)
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.hash(this.govActionId))
  }
}

/**
 * CDDL schema for NoConfidenceAction tuple structure.
 * Maps to: (3, gov_action_id/ nil)
 *
 * @since 2.0.0
 * @category schemas
 */
export const NoConfidenceActionCDDL = Schema.Tuple(
  Schema.Literal(3n), // action type
  Schema.NullOr(GovActionIdCDDL) // gov_action_id / nil
)

/**
 * CDDL transformation schema for NoConfidenceAction.
 *
 * @since 2.0.0
 * @category schemas
 */
export const NoConfidenceActionFromCDDL = Schema.transformOrFail(
  NoConfidenceActionCDDL,
  Schema.typeSchema(NoConfidenceAction),
  {
    strict: true,
    encode: (action) =>
      Eff.gen(function* () {
        const govActionId = action.govActionId
          ? yield* ParseResult.encode(GovActionIdFromCDDL)(action.govActionId)
          : null

        // Return as CBOR tuple
        return [3n, govActionId] as const
      }),
    decode: (cddl) =>
      Eff.gen(function* () {
        const [, govActionIdCDDL] = cddl
        const govActionId = govActionIdCDDL ? yield* ParseResult.decode(GovActionIdFromCDDL)(govActionIdCDDL) : null

        return new NoConfidenceAction({
          govActionId
        })
      })
  }
)

/**
 * Update committee governance action schema.
 * ```
 * According to Conway CDDL: update_committee =
 *   (4, gov_action_id/ nil, set<committee_cold_credential>, { * committee_cold_credential => committee_hot_credential }, unit_interval)
 * ```
 *
 * @since 2.0.0
 * @category schemas
 */
export class UpdateCommitteeAction extends Schema.TaggedClass<UpdateCommitteeAction>()("UpdateCommitteeAction", {
  govActionId: Schema.NullOr(GovActionId), // gov_action_id / nil
  membersToRemove: Schema.Array(CommiteeColdCredential.CommitteeColdCredential.Credential), // set<committee_cold_credential>
  membersToAdd: Schema.Map({
    key: CommiteeColdCredential.CommitteeColdCredential.Credential, // committee_cold_credential
    value: EpochNo.EpochNoSchema // epoch_no
  }),
  threshold: UnitInterval.UnitInterval
}) {
  toJSON() {
    return {
      _tag: this._tag,
      govActionId: this.govActionId,
      membersToRemove: this.membersToRemove,
      membersToAdd: this.membersToAdd,
      threshold: this.threshold
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
      that instanceof UpdateCommitteeAction &&
      Equal.equals(this.govActionId, that.govActionId) &&
      arrayEquals(this.membersToRemove, that.membersToRemove) &&
      mapEquals(this.membersToAdd, that.membersToAdd) &&
      Equal.equals(this.threshold, that.threshold)
    )
  }

  [Hash.symbol](): number {
    return Hash.cached(
      this,
      Hash.combine(
        Hash.combine(Hash.combine(Hash.hash(this.govActionId))(arrayHash(this.membersToRemove)))(
          mapHash(this.membersToAdd)
        )
      )(Hash.hash(this.threshold))
    )
  }
}

/**
 * CDDL schema for UpdateCommitteeAction tuple structure.
 * ```
 * Maps to: (4, gov_action_id/ nil, set<committee_cold_credential>, { * committee_cold_credential => committee_hot_credential }, unit_interval)
 * ```
 *
 * @since 2.0.0
 * @category schemas
 */
export const UpdateCommitteeActionCDDL = Schema.Tuple(
  Schema.Literal(4n), // action type
  Schema.NullOr(GovActionIdCDDL), // gov_action_id / nil
  // set<committee_cold_credential> = #6.258([* a0]) / [* a0]
  Schema.Union(
    CBOR.tag(258, Schema.Array(CommiteeColdCredential.CommitteeColdCredential.CDDLSchema)),
    Schema.Array(CommiteeColdCredential.CommitteeColdCredential.CDDLSchema)
  ),
  // { * committee_cold_credential => epoch_no }
  Schema.MapFromSelf({
    key: CommiteeColdCredential.CommitteeColdCredential.CDDLSchema,
    value: EpochNo.CDDLSchema
  }),
  UnitInterval.CDDLSchema // unit_interval
)

/**
 * CDDL transformation schema for UpdateCommitteeAction.
 *
 * @since 2.0.0
 * @category schemas
 */
export const UpdateCommitteeActionFromCDDL = Schema.transformOrFail(
  UpdateCommitteeActionCDDL,
  Schema.typeSchema(UpdateCommitteeAction),
  {
    strict: true,
    encode: (action) =>
      Eff.gen(function* () {
        const govActionId = action.govActionId
          ? yield* ParseResult.encode(GovActionIdFromCDDL)(action.govActionId)
          : null
        // Encode membersToRemove as tagged set (tag 258) per CDDL
        const removeArr: Array<typeof CommiteeColdCredential.CommitteeColdCredential.CDDLSchema.Type> = []
        for (const cred of action.membersToRemove) {
          const coldCred = yield* ParseResult.encode(CommiteeColdCredential.CommitteeColdCredential.FromCDDL)(cred)
          removeArr.push(coldCred)
        }
        const membersToRemove = CBOR.Tag.make({ tag: 258, value: removeArr }, { disableValidation: true }) as any

        // Encode membersToAdd as map<committee_cold_credential => epoch_no>
        const membersToAdd = new Map<
          typeof CommiteeColdCredential.CommitteeColdCredential.CDDLSchema.Type,
          typeof EpochNo.CDDLSchema.Type
        >()
        for (const [coldCred, epoch] of action.membersToAdd) {
          const coldCredBytes = yield* ParseResult.encode(CommiteeColdCredential.CommitteeColdCredential.FromCDDL)(
            coldCred
          )
          const epochNo = yield* ParseResult.encode(EpochNo.FromCDDL)(epoch)
          membersToAdd.set(coldCredBytes, epochNo)
        }
        // Encode threshold as UnitInterval
        const threshold = yield* ParseResult.encode(UnitInterval.FromCDDL)(action.threshold)

        // Return as CBOR tuple
        return [4n, govActionId, membersToRemove, membersToAdd, threshold] as const
      }),
    decode: (cddl) =>
      Eff.gen(function* () {
        const [, govActionIdCDDL, membersToRemoveCDDL, membersToAddCDDL, thresholdCDDL] = cddl
        const govActionId = govActionIdCDDL ? yield* ParseResult.decode(GovActionIdFromCDDL)(govActionIdCDDL) : null
        const threshold = yield* ParseResult.decode(UnitInterval.FromCDDL)(thresholdCDDL)
        // Decode set into an array of credentials (accept tag 258 or plain array)
        const membersToRemove: Array<typeof CommiteeColdCredential.CommitteeColdCredential.Credential.Type> = []
        const removeArr = CBOR.isTag(membersToRemoveCDDL)
          ? membersToRemoveCDDL.tag === 258
            ? (membersToRemoveCDDL.value as ReadonlyArray<any>)
            : []
          : (membersToRemoveCDDL as ReadonlyArray<any>)
        for (const coldCredCDDL of removeArr) {
          const coldCred = yield* ParseResult.decode(CommiteeColdCredential.CommitteeColdCredential.FromCDDL)(
            coldCredCDDL
          )
          membersToRemove.push(coldCred)
        }
        const membersToAdd = new Map<
          typeof CommiteeColdCredential.CommitteeColdCredential.Credential.Type,
          EpochNo.EpochNo
        >()
        for (const [coldCredCDDL, epochNoCDDL] of membersToAddCDDL) {
          const coldCred = yield* ParseResult.decode(CommiteeColdCredential.CommitteeColdCredential.FromCDDL)(
            coldCredCDDL
          )
          const epoch = yield* ParseResult.decode(EpochNo.FromCDDL)(epochNoCDDL)
          membersToAdd.set(coldCred, epoch)
        }

        return new UpdateCommitteeAction({
          govActionId,
          membersToRemove,
          membersToAdd,
          threshold
        })
      })
  }
)

/**
 * New constitution governance action schema.
 * According to Conway CDDL: new_constitution =
 *   (5, gov_action_id/ nil, constitution)
 *
 * @since 2.0.0
 * @category schemas
 */
export class NewConstitutionAction extends Schema.TaggedClass<NewConstitutionAction>()("NewConstitutionAction", {
  govActionId: Schema.NullOr(GovActionId), // gov_action_id / nil
  constitution: Constituion.Constitution // constitution as CBOR
}) {
  toJSON() {
    return {
      _tag: this._tag,
      govActionId: this.govActionId,
      constitution: this.constitution
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
      that instanceof NewConstitutionAction &&
      Equal.equals(this.govActionId, that.govActionId) &&
      Equal.equals(this.constitution, that.constitution)
    )
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.combine(Hash.hash(this.govActionId))(Hash.hash(this.constitution)))
  }
}

/**
 * CDDL schema for NewConstitutionAction tuple structure.
 * ```
 * Maps to: (5, gov_action_id/ nil, constitution)
 * ```
 *
 * @since 2.0.0
 * @category schemas
 */
export const NewConstitutionActionCDDL = Schema.Tuple(
  Schema.Literal(5n), // action type
  Schema.NullOr(GovActionIdCDDL), // gov_action_id / nil
  Constituion.CDDLSchema // constitution as CBOR
)

/**
 * CDDL transformation schema for NewConstitutionAction.
 *
 * @since 2.0.0
 * @category schemas
 */
export const NewConstitutionActionFromCDDL = Schema.transformOrFail(
  NewConstitutionActionCDDL,
  Schema.typeSchema(NewConstitutionAction),
  {
    strict: true,
    encode: (action) =>
      Eff.gen(function* () {
        const govActionId = action.govActionId
          ? yield* ParseResult.encode(GovActionIdFromCDDL)(action.govActionId)
          : null
        const constitution = yield* ParseResult.encode(Constituion.FromCDDL)(action.constitution)

        // Return as CBOR tuple
        return [5n, govActionId, constitution] as const
      }),
    decode: (cddl) =>
      Eff.gen(function* () {
        const [, govActionIdCDDL, constitutionCDDL] = cddl
        const govActionId = govActionIdCDDL ? yield* ParseResult.decode(GovActionIdFromCDDL)(govActionIdCDDL) : null
        const constitution = yield* ParseResult.decode(Constituion.FromCDDL)(constitutionCDDL)

        return new NewConstitutionAction({
          govActionId,
          constitution
        })
      })
  }
)

/**
 * Info governance action schema.
 * ```
 * According to Conway CDDL: info_action = (6)
 * ```
 *
 * @since 2.0.0
 * @category schemas
 */
export class InfoAction extends Schema.TaggedClass<InfoAction>()("InfoAction", {
  // Info action has no additional data
}) {
  toJSON() {
    return {
      _tag: this._tag
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof InfoAction
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.string("InfoAction"))
  }
}

/**
 * CDDL schema for InfoAction tuple structure.
 * Maps to: (6)
 *
 * @since 2.0.0
 * @category schemas
 */
export const InfoActionCDDL = Schema.Tuple(
  Schema.Literal(6n) // action type
)

/**
 * CDDL transformation schema for InfoAction.
 *
 * @since 2.0.0
 * @category schemas
 */
export const InfoActionFromCDDL = Schema.transformOrFail(InfoActionCDDL, Schema.typeSchema(InfoAction), {
  strict: true,
  encode: (_action) =>
    Eff.gen(function* () {
      // Return as CBOR tuple
      return [6n] as const
    }),
  decode: (_cddl) =>
    Eff.gen(function* () {
      return new InfoAction({})
    })
})

/**
 * GovernanceAction union schema based on Conway CDDL specification.
 *
 * ```
 * governance_action =
 *   [ 0, parameter_change_action ]
 * / [ 1, hard_fork_initiation_action ]
 * / [ 2, treasury_withdrawals_action ]
 * / [ 3, no_confidence ]
 * / [ 4, update_committee ]
 * / [ 5, new_constitution ]
 * / [ 6, info_action ]
 * ```
 *
 * @since 2.0.0
 * @category schemas
 */
export const GovernanceAction = Schema.Union(
  ParameterChangeAction,
  HardForkInitiationAction,
  TreasuryWithdrawalsAction,
  NoConfidenceAction,
  UpdateCommitteeAction,
  NewConstitutionAction,
  InfoAction
)

/**
 * Type alias for GovernanceAction.
 *
 * @since 2.0.0
 * @category model
 */
export type GovernanceAction = Schema.Schema.Type<typeof GovernanceAction>

/**
 * CDDL schema for GovernanceAction tuple structure.
 * Maps action types to their data according to Conway specification.
 *
 * @since 2.0.0
 * @category schemas
 */
export const CDDLSchema = Schema.Union(
  ParameterChangeActionCDDL,
  HardForkInitiationActionCDDL,
  TreasuryWithdrawalsActionCDDL,
  NoConfidenceActionCDDL,
  UpdateCommitteeActionCDDL,
  NewConstitutionActionCDDL,
  InfoActionCDDL
)

/**
 * CDDL transformation schema for GovernanceAction.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCDDL = Schema.Union(
  ParameterChangeActionFromCDDL,
  HardForkInitiationActionFromCDDL,
  TreasuryWithdrawalsActionFromCDDL,
  NoConfidenceActionFromCDDL,
  UpdateCommitteeActionFromCDDL,
  NewConstitutionActionFromCDDL,
  InfoActionFromCDDL
)

/**
 * FastCheck arbitrary for GovernanceAction.
 *
 * @since 2.0.0
 * @category arbitrary
 */
// Per-variant arbitraries and main arbitrary

export const infoArbitrary: FastCheck.Arbitrary<InfoAction> = FastCheck.constant(new InfoAction({}))

export const govActionIdArbitrary: FastCheck.Arbitrary<GovActionId> = FastCheck.tuple(
  TransactionHash.arbitrary,
  TransactionIndex.arbitrary
).map(([transactionId, govActionIndex]) => new GovActionId({ transactionId, govActionIndex }))

export const parameterChangeArbitrary: FastCheck.Arbitrary<ParameterChangeAction> = FastCheck.tuple(
  FastCheck.option(govActionIdArbitrary, { nil: null }),
  ProtocolParamUpdate.arbitrary,
  FastCheck.option(ScriptHash.arbitrary, { nil: null })
).map(
  ([govActionId, protocolParamUpdate, policyHash]) =>
    new ParameterChangeAction({ govActionId, protocolParamUpdate, policyHash })
)

export const hardForkInitiationArbitrary: FastCheck.Arbitrary<HardForkInitiationAction> = FastCheck.tuple(
  FastCheck.option(govActionIdArbitrary, { nil: null }),
  ProtocolVersion.arbitrary
).map(([govActionId, protocolVersion]) => new HardForkInitiationAction({ govActionId, protocolVersion }))

const withdrawalsMapArbitrary: FastCheck.Arbitrary<Map<RewardAccount.RewardAccount, Coin.Coin>> = FastCheck.uniqueArray(
  RewardAccount.arbitrary,
  {
    maxLength: 5,
    selector: (ra) => RewardAccount.toHex(ra)
  }
).chain((accounts) =>
  FastCheck.array(Coin.arbitrary, { minLength: accounts.length, maxLength: accounts.length }).map(
    (coins) => new Map(accounts.map((a, i) => [a, coins[i]] as const))
  )
)

export const treasuryWithdrawalsArbitrary: FastCheck.Arbitrary<TreasuryWithdrawalsAction> = FastCheck.tuple(
  withdrawalsMapArbitrary,
  FastCheck.option(ScriptHash.arbitrary, { nil: null })
).map(([withdrawals, policyHash]) => new TreasuryWithdrawalsAction({ withdrawals, policyHash }))

export const noConfidenceArbitrary: FastCheck.Arbitrary<NoConfidenceAction> = FastCheck.option(govActionIdArbitrary, {
  nil: null
}).map((govActionId) => new NoConfidenceAction({ govActionId }))

const uniqueCredArray: FastCheck.Arbitrary<ReadonlyArray<Credential.Credential>> = FastCheck.uniqueArray(
  Credential.arbitrary,
  {
    maxLength: 5,
    selector: (c) => `${c._tag}:${Bytes.toHex(c.hash)}`
  }
)

const membersToAddMapArbitrary: FastCheck.Arbitrary<Map<Credential.Credential, EpochNo.EpochNo>> =
  uniqueCredArray.chain((colds) =>
    FastCheck.array(EpochNo.arbitrary, {
      minLength: colds.length,
      maxLength: colds.length
    }).map((epochsRaw) => {
      const epochs = epochsRaw
      const m = new Map<Credential.Credential, EpochNo.EpochNo>()
      for (let i = 0; i < colds.length; i++) m.set(colds[i], epochs[i])
      return m
    })
  )

export const updateCommitteeArbitrary: FastCheck.Arbitrary<UpdateCommitteeAction> = FastCheck.tuple(
  FastCheck.option(govActionIdArbitrary, { nil: null }),
  uniqueCredArray,
  membersToAddMapArbitrary,
  UnitInterval.arbitrary
).map(
  ([govActionId, membersToRemove, membersToAdd, threshold]) =>
    new UpdateCommitteeAction({ govActionId, membersToRemove, membersToAdd, threshold })
)

export const newConstitutionArbitrary: FastCheck.Arbitrary<NewConstitutionAction> = FastCheck.tuple(
  FastCheck.option(govActionIdArbitrary, { nil: null }),
  Constituion.arbitrary
).map(([govActionId, constitution]) => new NewConstitutionAction({ govActionId, constitution }))

export const arbitrary: FastCheck.Arbitrary<GovernanceAction> = FastCheck.oneof(
  parameterChangeArbitrary,
  hardForkInitiationArbitrary,
  updateCommitteeArbitrary,
  treasuryWithdrawalsArbitrary,
  noConfidenceArbitrary,
  newConstitutionArbitrary,
  infoArbitrary
)

/**
 * Check if a value is a valid GovernanceAction.
 *
 * @since 2.0.0
 * @category predicates
 */
export const is = Schema.is(GovernanceAction)

/**
 * Type guards for each governance action variant.
 *
 * @since 2.0.0
 * @category type guards
 */
export const isParameterChangeAction = Schema.is(ParameterChangeAction)

export const isHardForkInitiationAction = Schema.is(HardForkInitiationAction)

export const isTreasuryWithdrawalsAction = Schema.is(TreasuryWithdrawalsAction)

export const isNoConfidenceAction = Schema.is(NoConfidenceAction)

export const isUpdateCommitteeAction = Schema.is(UpdateCommitteeAction)

export const isNewConstitutionAction = Schema.is(NewConstitutionAction)

export const isInfoAction = Schema.is(InfoAction)

/**
 * Pattern matching utility for GovernanceAction.
 *
 * @since 2.0.0
 * @category pattern matching
 */
export const match = <R>(
  action: GovernanceAction,
  patterns: {
    ParameterChangeAction: (
      govActionId: GovActionId | null,
      protocolParams: ProtocolParamUpdate.ProtocolParamUpdate,
      policyHash: ScriptHash.ScriptHash | null
    ) => R
    HardForkInitiationAction: (govActionId: GovActionId | null, protocolVersion: ProtocolVersion.ProtocolVersion) => R
    TreasuryWithdrawalsAction: (
      withdrawals: Map<RewardAccount.RewardAccount, Coin.Coin>,
      policyHash: ScriptHash.ScriptHash | null
    ) => R
    NoConfidenceAction: (govActionId: GovActionId | null) => R
    UpdateCommitteeAction: (
      govActionId: GovActionId | null,
      membersToRemove: ReadonlyArray<typeof CommiteeColdCredential.CommitteeColdCredential.Credential.Type>,
      membersToAdd: ReadonlyMap<typeof CommiteeColdCredential.CommitteeColdCredential.Credential.Type, EpochNo.EpochNo>,
      threshold: UnitInterval.UnitInterval
    ) => R
    NewConstitutionAction: (govActionId: GovActionId | null, constitution: Constituion.Constitution) => R
    InfoAction: () => R
  }
): R => {
  switch (action._tag) {
    case "ParameterChangeAction":
      return patterns.ParameterChangeAction(action.govActionId, action.protocolParamUpdate, action.policyHash)
    case "HardForkInitiationAction":
      return patterns.HardForkInitiationAction(action.govActionId, action.protocolVersion)
    case "TreasuryWithdrawalsAction":
      return patterns.TreasuryWithdrawalsAction(action.withdrawals, action.policyHash)
    case "NoConfidenceAction":
      return patterns.NoConfidenceAction(action.govActionId)
    case "UpdateCommitteeAction":
      return patterns.UpdateCommitteeAction(
        action.govActionId,
        action.membersToRemove,
        action.membersToAdd,
        action.threshold
      )
    case "NewConstitutionAction":
      return patterns.NewConstitutionAction(action.govActionId, action.constitution)
    case "InfoAction":
      return patterns.InfoAction()
  }
}

/**
 * Parse GovernanceAction from CBOR hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORHex = (hex: string, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS): GovernanceAction => {
  const bytes = Bytes.fromHex(hex)
  return fromCBOR(bytes, options)
}

/**
 * Encode GovernanceAction to CBOR hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHex = (data: GovernanceAction, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS): string => {
  const bytes = toCBOR(data, options)
  return Bytes.toHex(bytes)
}

/**
 * Parse GovernanceAction from CBOR bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBOR = (
  bytes: Uint8Array,
  options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS
): GovernanceAction => {
  const cddl = CBOR.fromCBORBytes(bytes, options)
  return Schema.decodeSync(FromCDDL)(cddl as any)
}

/**
 * Encode GovernanceAction to CBOR bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBOR = (data: GovernanceAction, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS): Uint8Array => {
  const cddl = Schema.encodeSync(FromCDDL)(data)
  return CBOR.toCBORBytes(cddl, options)
}
