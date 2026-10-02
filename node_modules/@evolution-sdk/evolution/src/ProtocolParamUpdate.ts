import { Effect as Eff, Equal, FastCheck, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as CBOR from "./CBOR.js"
import * as Coin from "./Coin.js"
import * as CostModel from "./CostModel.js"
import * as NonnegativeInterval from "./NonnegativeInterval.js"
import * as Numeric from "./Numeric.js"
import * as UnitInterval from "./UnitInterval.js"

/**
 * ex_unit_prices (domain) = [mem_price : NonnegativeInterval, step_price : NonnegativeInterval]
 */
export class ExUnitPrices extends Schema.Class<ExUnitPrices>("ExUnitPrices")({
  memPrice: NonnegativeInterval.NonnegativeInterval,
  stepPrice: NonnegativeInterval.NonnegativeInterval
}) {
  [Equal.symbol](that: unknown): boolean {
    return (
      that instanceof ExUnitPrices &&
      Equal.equals(this.memPrice, that.memPrice) &&
      Equal.equals(this.stepPrice, that.stepPrice)
    )
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.hash(this.memPrice))
  }
}

export const ExUnitPricesCDDL = Schema.Tuple(
  NonnegativeInterval.NonnegativeInterval,
  NonnegativeInterval.NonnegativeInterval
).annotations({ identifier: "ExUnitPricesCDDL" })

/**
 * ex_units = [mem : uint, steps : uint]
 */
export class ExUnits extends Schema.Class<ExUnits>("ExUnits")({
  mem: Numeric.Uint64Schema,
  steps: Numeric.Uint64Schema
}) {
  [Equal.symbol](that: unknown): boolean {
    return that instanceof ExUnits && this.mem === that.mem && this.steps === that.steps
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.hash(this.mem))
  }
}

export const ExUnitsCDDL = Schema.Tuple(Numeric.Uint64Schema, Numeric.Uint64Schema).annotations({
  identifier: "ExUnitsCDDL"
})

/**
 * pool_voting_thresholds (domain) = [u,u,u,u,u] (5 unit_intervals)
 */
export class PoolVotingThresholds extends Schema.Class<PoolVotingThresholds>("PoolVotingThresholds")({
  t1: UnitInterval.UnitInterval,
  t2: UnitInterval.UnitInterval,
  t3: UnitInterval.UnitInterval,
  t4: UnitInterval.UnitInterval,
  t5: UnitInterval.UnitInterval
}) {
  [Equal.symbol](that: unknown): boolean {
    return (
      that instanceof PoolVotingThresholds &&
      Equal.equals(this.t1, that.t1) &&
      Equal.equals(this.t2, that.t2) &&
      Equal.equals(this.t3, that.t3) &&
      Equal.equals(this.t4, that.t4) &&
      Equal.equals(this.t5, that.t5)
    )
  }

  [Hash.symbol](): number {
    // Only hash first threshold for performance
    return Hash.cached(this, Hash.hash(this.t1))
  }
}

export const PoolVotingThresholdsCDDL = Schema.Tuple(
  UnitInterval.UnitInterval,
  UnitInterval.UnitInterval,
  UnitInterval.UnitInterval,
  UnitInterval.UnitInterval,
  UnitInterval.UnitInterval
).annotations({ identifier: "PoolVotingThresholdsCDDL" })

/**
 * drep_voting_thresholds (domain) = [10 unit_intervals]
 */
export class DRepVotingThresholds extends Schema.Class<DRepVotingThresholds>("DRepVotingThresholds")({
  t1: UnitInterval.UnitInterval,
  t2: UnitInterval.UnitInterval,
  t3: UnitInterval.UnitInterval,
  t4: UnitInterval.UnitInterval,
  t5: UnitInterval.UnitInterval,
  t6: UnitInterval.UnitInterval,
  t7: UnitInterval.UnitInterval,
  t8: UnitInterval.UnitInterval,
  t9: UnitInterval.UnitInterval,
  t10: UnitInterval.UnitInterval
}) {
  [Equal.symbol](that: unknown): boolean {
    return (
      that instanceof DRepVotingThresholds &&
      Equal.equals(this.t1, that.t1) &&
      Equal.equals(this.t2, that.t2) &&
      Equal.equals(this.t3, that.t3) &&
      Equal.equals(this.t4, that.t4) &&
      Equal.equals(this.t5, that.t5) &&
      Equal.equals(this.t6, that.t6) &&
      Equal.equals(this.t7, that.t7) &&
      Equal.equals(this.t8, that.t8) &&
      Equal.equals(this.t9, that.t9) &&
      Equal.equals(this.t10, that.t10)
    )
  }

  [Hash.symbol](): number {
    // Only hash first threshold for performance
    return Hash.cached(this, Hash.hash(this.t1))
  }
}

/**
 * ProtocolParamUpdate CDDL record with optional fields keyed by indexes.
 * Mirrors Conway CDDL `protocol_param_update`.
 */
// Map-based CDDL: { * uint => value }
// We keep the value loosely typed as CBOR to allow nested encoded schemas where needed.
export const CDDLSchema = Schema.MapFromSelf({
  key: CBOR.Integer,
  value: CBOR.CBORSchema
}).annotations({ identifier: "ProtocolParamUpdate.CDDL" })

export type CDDLSchema = typeof CDDLSchema.Type

/**
 * Convenience domain class mirroring the same structure.
 */
export class ProtocolParamUpdate extends Schema.TaggedClass<ProtocolParamUpdate>()("ProtocolParamUpdate", {
  minfeeA: Schema.optional(Coin.Coin), // 0
  minfeeB: Schema.optional(Coin.Coin), // 1
  maxBlockBodySize: Schema.optional(Numeric.Uint32Schema), // 2
  maxTxSize: Schema.optional(Numeric.Uint32Schema), // 3
  maxBlockHeaderSize: Schema.optional(Numeric.Uint16Schema), // 4
  keyDeposit: Schema.optional(Coin.Coin), // 5
  poolDeposit: Schema.optional(Coin.Coin), // 6
  maxEpoch: Schema.optional(Numeric.Uint32Schema), // 7
  nOpt: Schema.optional(Numeric.Uint16Schema), // 8
  poolPledgeInfluence: Schema.optional(NonnegativeInterval.NonnegativeInterval), // 9
  expansionRate: Schema.optional(UnitInterval.UnitInterval), // 10
  treasuryGrowthRate: Schema.optional(UnitInterval.UnitInterval), // 11
  minPoolCost: Schema.optional(Coin.Coin), // 16
  adaPerUtxoByte: Schema.optional(Coin.Coin), // 17
  costModels: Schema.optional(CostModel.CostModels), // 18
  exUnitPrices: Schema.optional(ExUnitPrices), // 19
  maxTxExUnits: Schema.optional(ExUnits), // 20
  maxBlockExUnits: Schema.optional(ExUnits), // 21
  maxValueSize: Schema.optional(Numeric.Uint32Schema), // 22
  collateralPercentage: Schema.optional(Numeric.Uint16Schema), // 23
  maxCollateralInputs: Schema.optional(Numeric.Uint16Schema), // 24
  poolVotingThresholds: Schema.optional(PoolVotingThresholds), // 25
  drepVotingThresholds: Schema.optional(DRepVotingThresholds), // 26
  minCommitteeSize: Schema.optional(Numeric.Uint16Schema), // 27
  committeeTermLimit: Schema.optional(Numeric.Uint32Schema), // 28
  governanceActionValidity: Schema.optional(Numeric.Uint32Schema), // 29
  governanceActionDeposit: Schema.optional(Coin.Coin), // 30
  drepDeposit: Schema.optional(Coin.Coin), // 31
  drepInactivityPeriod: Schema.optional(Numeric.Uint32Schema), // 32
  minfeeRefScriptCoinsPerByte: Schema.optional(NonnegativeInterval.NonnegativeInterval) // 33
}) {
  toJSON() {
    return {
      _tag: this._tag,
      minfeeA: this.minfeeA,
      minfeeB: this.minfeeB,
      maxBlockBodySize: this.maxBlockBodySize,
      maxTxSize: this.maxTxSize,
      maxBlockHeaderSize: this.maxBlockHeaderSize,
      keyDeposit: this.keyDeposit,
      poolDeposit: this.poolDeposit,
      maxEpoch: this.maxEpoch,
      nOpt: this.nOpt,
      poolPledgeInfluence: this.poolPledgeInfluence,
      expansionRate: this.expansionRate,
      treasuryGrowthRate: this.treasuryGrowthRate,
      minPoolCost: this.minPoolCost,
      adaPerUtxoByte: this.adaPerUtxoByte,
      costModels: this.costModels,
      exUnitPrices: this.exUnitPrices,
      maxTxExUnits: this.maxTxExUnits,
      maxBlockExUnits: this.maxBlockExUnits,
      maxValueSize: this.maxValueSize,
      collateralPercentage: this.collateralPercentage,
      maxCollateralInputs: this.maxCollateralInputs,
      poolVotingThresholds: this.poolVotingThresholds,
      drepVotingThresholds: this.drepVotingThresholds,
      minCommitteeSize: this.minCommitteeSize,
      committeeTermLimit: this.committeeTermLimit,
      governanceActionValidity: this.governanceActionValidity,
      governanceActionDeposit: this.governanceActionDeposit,
      drepDeposit: this.drepDeposit,
      drepInactivityPeriod: this.drepInactivityPeriod,
      minfeeRefScriptCoinsPerByte: this.minfeeRefScriptCoinsPerByte
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
      that instanceof ProtocolParamUpdate &&
      Equal.equals(this.minfeeA, that.minfeeA) &&
      Equal.equals(this.minfeeB, that.minfeeB) &&
      Equal.equals(this.maxBlockBodySize, that.maxBlockBodySize) &&
      Equal.equals(this.maxTxSize, that.maxTxSize) &&
      Equal.equals(this.maxBlockHeaderSize, that.maxBlockHeaderSize) &&
      Equal.equals(this.keyDeposit, that.keyDeposit) &&
      Equal.equals(this.poolDeposit, that.poolDeposit) &&
      Equal.equals(this.maxEpoch, that.maxEpoch) &&
      Equal.equals(this.nOpt, that.nOpt) &&
      Equal.equals(this.poolPledgeInfluence, that.poolPledgeInfluence) &&
      Equal.equals(this.expansionRate, that.expansionRate) &&
      Equal.equals(this.treasuryGrowthRate, that.treasuryGrowthRate) &&
      Equal.equals(this.minPoolCost, that.minPoolCost) &&
      Equal.equals(this.adaPerUtxoByte, that.adaPerUtxoByte) &&
      Equal.equals(this.costModels, that.costModels) &&
      Equal.equals(this.exUnitPrices, that.exUnitPrices) &&
      Equal.equals(this.maxTxExUnits, that.maxTxExUnits) &&
      Equal.equals(this.maxBlockExUnits, that.maxBlockExUnits) &&
      Equal.equals(this.maxValueSize, that.maxValueSize) &&
      Equal.equals(this.collateralPercentage, that.collateralPercentage) &&
      Equal.equals(this.maxCollateralInputs, that.maxCollateralInputs) &&
      Equal.equals(this.poolVotingThresholds, that.poolVotingThresholds) &&
      Equal.equals(this.drepVotingThresholds, that.drepVotingThresholds) &&
      Equal.equals(this.minCommitteeSize, that.minCommitteeSize) &&
      Equal.equals(this.committeeTermLimit, that.committeeTermLimit) &&
      Equal.equals(this.governanceActionValidity, that.governanceActionValidity) &&
      Equal.equals(this.governanceActionDeposit, that.governanceActionDeposit) &&
      Equal.equals(this.drepDeposit, that.drepDeposit) &&
      Equal.equals(this.drepInactivityPeriod, that.drepInactivityPeriod) &&
      Equal.equals(this.minfeeRefScriptCoinsPerByte, that.minfeeRefScriptCoinsPerByte)
    )
  }

  [Hash.symbol](): number {
    // Only hash 1-2 most frequently changing fields for performance
    // This allows hash collisions to trigger full equality check
    // Most common updates are fee-related parameters and cost models
    return Hash.cached(this, Hash.combine(Hash.hash(this.minfeeA))(Hash.hash(this.costModels)))
  }
}

export const FromCDDL = Schema.transformOrFail(CDDLSchema, Schema.typeSchema(ProtocolParamUpdate), {
  strict: true,
  encode: (toA) =>
    Eff.gen(function* () {
      const out = new Map<bigint, CBOR.CBOR>()

      // Simple passthrough bigints
      if (toA.minfeeA !== undefined) out.set(0n, toA.minfeeA)
      if (toA.minfeeB !== undefined) out.set(1n, toA.minfeeB)
      if (toA.maxBlockBodySize !== undefined) out.set(2n, toA.maxBlockBodySize)
      if (toA.maxTxSize !== undefined) out.set(3n, toA.maxTxSize)
      if (toA.maxBlockHeaderSize !== undefined) out.set(4n, toA.maxBlockHeaderSize)
      if (toA.keyDeposit !== undefined) out.set(5n, toA.keyDeposit)
      if (toA.poolDeposit !== undefined) out.set(6n, toA.poolDeposit)
      if (toA.maxEpoch !== undefined) out.set(7n, toA.maxEpoch)
      if (toA.nOpt !== undefined) out.set(8n, toA.nOpt)

      // Intervals (encoded via tag 30)
      if (toA.poolPledgeInfluence !== undefined)
        out.set(9n, yield* ParseResult.encode(NonnegativeInterval.FromCDDL)(toA.poolPledgeInfluence))
      if (toA.expansionRate !== undefined)
        out.set(10n, yield* ParseResult.encode(UnitInterval.FromCDDL)(toA.expansionRate))
      if (toA.treasuryGrowthRate !== undefined)
        out.set(11n, yield* ParseResult.encode(UnitInterval.FromCDDL)(toA.treasuryGrowthRate))

      if (toA.minPoolCost !== undefined) out.set(16n, toA.minPoolCost)
      if (toA.adaPerUtxoByte !== undefined) out.set(17n, toA.adaPerUtxoByte)

      // Cost models (encoded schema)
      if (toA.costModels !== undefined) out.set(18n, yield* ParseResult.encode(CostModel.FromCDDL)(toA.costModels))

      // ExUnitPrices (tuple of two nonnegative intervals)
      if (toA.exUnitPrices !== undefined) {
        out.set(19n, [
          yield* ParseResult.encode(NonnegativeInterval.FromCDDL)(toA.exUnitPrices.memPrice),
          yield* ParseResult.encode(NonnegativeInterval.FromCDDL)(toA.exUnitPrices.stepPrice)
        ] as const)
      }

      // ExUnits (convert to tuple)
      if (toA.maxTxExUnits !== undefined) out.set(20n, [toA.maxTxExUnits.mem, toA.maxTxExUnits.steps] as const)
      if (toA.maxBlockExUnits !== undefined) out.set(21n, [toA.maxBlockExUnits.mem, toA.maxBlockExUnits.steps] as const)

      if (toA.maxValueSize !== undefined) out.set(22n, toA.maxValueSize)
      if (toA.collateralPercentage !== undefined) out.set(23n, toA.collateralPercentage)
      if (toA.maxCollateralInputs !== undefined) out.set(24n, toA.maxCollateralInputs)

      // PoolVotingThresholds (5 unit intervals)
      if (toA.poolVotingThresholds !== undefined) {
        out.set(25n, [
          yield* ParseResult.encode(UnitInterval.FromCDDL)(toA.poolVotingThresholds.t1),
          yield* ParseResult.encode(UnitInterval.FromCDDL)(toA.poolVotingThresholds.t2),
          yield* ParseResult.encode(UnitInterval.FromCDDL)(toA.poolVotingThresholds.t3),
          yield* ParseResult.encode(UnitInterval.FromCDDL)(toA.poolVotingThresholds.t4),
          yield* ParseResult.encode(UnitInterval.FromCDDL)(toA.poolVotingThresholds.t5)
        ] as const)
      }

      // DRepVotingThresholds (10 unit intervals)
      if (toA.drepVotingThresholds !== undefined) {
        const d = toA.drepVotingThresholds
        out.set(26n, [
          yield* ParseResult.encode(UnitInterval.FromCDDL)(d.t1),
          yield* ParseResult.encode(UnitInterval.FromCDDL)(d.t2),
          yield* ParseResult.encode(UnitInterval.FromCDDL)(d.t3),
          yield* ParseResult.encode(UnitInterval.FromCDDL)(d.t4),
          yield* ParseResult.encode(UnitInterval.FromCDDL)(d.t5),
          yield* ParseResult.encode(UnitInterval.FromCDDL)(d.t6),
          yield* ParseResult.encode(UnitInterval.FromCDDL)(d.t7),
          yield* ParseResult.encode(UnitInterval.FromCDDL)(d.t8),
          yield* ParseResult.encode(UnitInterval.FromCDDL)(d.t9),
          yield* ParseResult.encode(UnitInterval.FromCDDL)(d.t10)
        ] as const)
      }

      if (toA.minCommitteeSize !== undefined) out.set(27n, toA.minCommitteeSize)
      if (toA.committeeTermLimit !== undefined) out.set(28n, toA.committeeTermLimit)
      if (toA.governanceActionValidity !== undefined) out.set(29n, toA.governanceActionValidity)
      if (toA.governanceActionDeposit !== undefined) out.set(30n, toA.governanceActionDeposit)
      if (toA.drepDeposit !== undefined) out.set(31n, toA.drepDeposit)
      if (toA.drepInactivityPeriod !== undefined) out.set(32n, toA.drepInactivityPeriod)

      if (toA.minfeeRefScriptCoinsPerByte !== undefined)
        out.set(33n, yield* ParseResult.encode(NonnegativeInterval.FromCDDL)(toA.minfeeRefScriptCoinsPerByte))

      return out
    }),
  decode: (fromA) =>
    Eff.gen(function* () {
      const model: {
        minfeeA?: Coin.Coin
        minfeeB?: Coin.Coin
        maxBlockBodySize?: Numeric.Uint32
        maxTxSize?: Numeric.Uint32
        maxBlockHeaderSize?: Numeric.Uint16
        keyDeposit?: Coin.Coin
        poolDeposit?: Coin.Coin
        maxEpoch?: Numeric.Uint32
        nOpt?: Numeric.Uint16
        poolPledgeInfluence?: NonnegativeInterval.NonnegativeInterval
        expansionRate?: UnitInterval.UnitInterval
        treasuryGrowthRate?: UnitInterval.UnitInterval
        minPoolCost?: Coin.Coin
        adaPerUtxoByte?: Coin.Coin
        costModels?: CostModel.CostModels
        exUnitPrices?: ExUnitPrices
        maxTxExUnits?: ExUnits
        maxBlockExUnits?: ExUnits
        maxValueSize?: Numeric.Uint32
        collateralPercentage?: Numeric.Uint16
        maxCollateralInputs?: Numeric.Uint16
        poolVotingThresholds?: PoolVotingThresholds
        drepVotingThresholds?: DRepVotingThresholds
        minCommitteeSize?: Numeric.Uint16
        committeeTermLimit?: Numeric.Uint32
        governanceActionValidity?: Numeric.Uint32
        governanceActionDeposit?: Coin.Coin
        drepDeposit?: Coin.Coin
        drepInactivityPeriod?: Numeric.Uint32
        minfeeRefScriptCoinsPerByte?: NonnegativeInterval.NonnegativeInterval
      } = {}

      const get = <T = unknown>(k: bigint): T | undefined =>
        (fromA as ReadonlyMap<CBOR.CBOR, CBOR.CBOR>).get(k as any) as any

      const v0 = get<Coin.Coin>(0n)
      if (v0 !== undefined) model.minfeeA = v0
      const v1 = get<Coin.Coin>(1n)
      if (v1 !== undefined) model.minfeeB = v1
      const v2 = get<Numeric.Uint32>(2n)
      if (v2 !== undefined) model.maxBlockBodySize = v2
      const v3 = get<Numeric.Uint32>(3n)
      if (v3 !== undefined) model.maxTxSize = v3
      const v4 = get<Numeric.Uint16>(4n)
      if (v4 !== undefined) model.maxBlockHeaderSize = v4
      const v5 = get<Coin.Coin>(5n)
      if (v5 !== undefined) model.keyDeposit = v5
      const v6 = get<Coin.Coin>(6n)
      if (v6 !== undefined) model.poolDeposit = v6
      const v7 = get<Numeric.Uint32>(7n)
      if (v7 !== undefined) model.maxEpoch = v7
      const v8 = get<Numeric.Uint16>(8n)
      if (v8 !== undefined) model.nOpt = v8

      const v9 = get(9n)
      if (v9 !== undefined)
        model.poolPledgeInfluence = yield* ParseResult.decode(NonnegativeInterval.FromCDDL)(v9 as any)
      const v10 = get(10n)
      if (v10 !== undefined) model.expansionRate = yield* ParseResult.decode(UnitInterval.FromCDDL)(v10 as any)
      const v11 = get(11n)
      if (v11 !== undefined) model.treasuryGrowthRate = yield* ParseResult.decode(UnitInterval.FromCDDL)(v11 as any)

      const v16 = get<Coin.Coin>(16n)
      if (v16 !== undefined) model.minPoolCost = v16
      const v17 = get<Coin.Coin>(17n)
      if (v17 !== undefined) model.adaPerUtxoByte = v17

      const v18 = get(18n)
      if (v18 !== undefined) model.costModels = yield* ParseResult.decode(CostModel.FromCDDL)(v18 as any)

      const v19 = get<readonly [unknown, unknown]>(19n)
      if (v19 !== undefined) {
        const [mem, step] = v19 as any
        model.exUnitPrices = new ExUnitPrices({
          memPrice: yield* ParseResult.decode(NonnegativeInterval.FromCDDL)(mem),
          stepPrice: yield* ParseResult.decode(NonnegativeInterval.FromCDDL)(step)
        })
      }

      const v20 = get<readonly [bigint, bigint]>(20n)
      if (v20 !== undefined) model.maxTxExUnits = new ExUnits({ mem: v20[0], steps: v20[1] })
      const v21 = get<readonly [bigint, bigint]>(21n)
      if (v21 !== undefined) model.maxBlockExUnits = new ExUnits({ mem: v21[0], steps: v21[1] })

      const v22 = get<Numeric.Uint32>(22n)
      if (v22 !== undefined) model.maxValueSize = v22
      const v23 = get<Numeric.Uint16>(23n)
      if (v23 !== undefined) model.collateralPercentage = v23
      const v24 = get<Numeric.Uint16>(24n)
      if (v24 !== undefined) model.maxCollateralInputs = v24

      const v25 = get<readonly [unknown, unknown, unknown, unknown, unknown]>(25n)
      if (v25 !== undefined) {
        const [a, b, c, d, e] = v25 as any
        model.poolVotingThresholds = new PoolVotingThresholds({
          t1: yield* ParseResult.decode(UnitInterval.FromCDDL)(a),
          t2: yield* ParseResult.decode(UnitInterval.FromCDDL)(b),
          t3: yield* ParseResult.decode(UnitInterval.FromCDDL)(c),
          t4: yield* ParseResult.decode(UnitInterval.FromCDDL)(d),
          t5: yield* ParseResult.decode(UnitInterval.FromCDDL)(e)
        })
      }

      const v26 =
        get<readonly [unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown]>(26n)
      if (v26 !== undefined) {
        const [a, b, c, d, e, f, g, h, i, j] = v26 as any
        model.drepVotingThresholds = new DRepVotingThresholds({
          t1: yield* ParseResult.decode(UnitInterval.FromCDDL)(a),
          t2: yield* ParseResult.decode(UnitInterval.FromCDDL)(b),
          t3: yield* ParseResult.decode(UnitInterval.FromCDDL)(c),
          t4: yield* ParseResult.decode(UnitInterval.FromCDDL)(d),
          t5: yield* ParseResult.decode(UnitInterval.FromCDDL)(e),
          t6: yield* ParseResult.decode(UnitInterval.FromCDDL)(f),
          t7: yield* ParseResult.decode(UnitInterval.FromCDDL)(g),
          t8: yield* ParseResult.decode(UnitInterval.FromCDDL)(h),
          t9: yield* ParseResult.decode(UnitInterval.FromCDDL)(i),
          t10: yield* ParseResult.decode(UnitInterval.FromCDDL)(j)
        })
      }

      const v27 = get<Numeric.Uint16>(27n)
      if (v27 !== undefined) model.minCommitteeSize = v27
      const v28 = get<Numeric.Uint32>(28n)
      if (v28 !== undefined) model.committeeTermLimit = v28
      const v29 = get<Numeric.Uint32>(29n)
      if (v29 !== undefined) model.governanceActionValidity = v29
      const v30 = get<Coin.Coin>(30n)
      if (v30 !== undefined) model.governanceActionDeposit = v30
      const v31 = get<Coin.Coin>(31n)
      if (v31 !== undefined) model.drepDeposit = v31
      const v32 = get<Numeric.Uint32>(32n)
      if (v32 !== undefined) model.drepInactivityPeriod = v32

      const v33 = get(33n)
      if (v33 !== undefined)
        model.minfeeRefScriptCoinsPerByte = yield* ParseResult.decode(NonnegativeInterval.FromCDDL)(v33 as any)

      return new ProtocolParamUpdate(model)
    })
})

export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(CBOR.FromBytes(options), FromCDDL).annotations({
    identifier: "ProtocolParamUpdate.FromCBORBytes"
  })

export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(Schema.Uint8ArrayFromHex, FromCBORBytes(options)).annotations({
    identifier: "ProtocolParamUpdate.FromCBORHex"
  })

export const toCBOR = (data: ProtocolParamUpdate, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORBytes(options))(data)

export const fromCBOR = (bytes: Uint8Array, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORBytes(options))(bytes)

export const toCBORBytes = toCBOR
export const fromCBORBytes = fromCBOR

export const toCBORHex = (data: ProtocolParamUpdate, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORHex(options))(data)

export const fromCBORHex = (hex: string, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORHex(options))(hex)

const coinArb = Coin.arbitrary
const costModelsArb = FastCheck.record({
  PlutusV1: CostModel.arbitrary,
  PlutusV2: CostModel.arbitrary,
  PlutusV3: CostModel.arbitrary
}).map((o) => new CostModel.CostModels(o))

export const arbitrary: FastCheck.Arbitrary<ProtocolParamUpdate> = FastCheck.record({
  minfeeA: FastCheck.option(coinArb, { nil: undefined }),
  minfeeB: FastCheck.option(coinArb, { nil: undefined }),
  maxBlockBodySize: FastCheck.option(Numeric.Uint32Arbitrary, { nil: undefined }),
  maxTxSize: FastCheck.option(Numeric.Uint32Arbitrary, { nil: undefined }),
  maxBlockHeaderSize: FastCheck.option(Numeric.Uint16Arbitrary, { nil: undefined }),
  keyDeposit: FastCheck.option(coinArb, { nil: undefined }),
  poolDeposit: FastCheck.option(coinArb, { nil: undefined }),
  maxEpoch: FastCheck.option(Numeric.Uint32Arbitrary, { nil: undefined }),
  nOpt: FastCheck.option(Numeric.Uint16Arbitrary, { nil: undefined }),
  poolPledgeInfluence: FastCheck.option(NonnegativeInterval.arbitrary, { nil: undefined }),
  expansionRate: FastCheck.option(UnitInterval.arbitrary, { nil: undefined }),
  treasuryGrowthRate: FastCheck.option(UnitInterval.arbitrary, { nil: undefined }),
  minPoolCost: FastCheck.option(coinArb, { nil: undefined }),
  adaPerUtxoByte: FastCheck.option(coinArb, { nil: undefined }),
  costModels: FastCheck.option(costModelsArb, { nil: undefined }),
  exUnitPrices: FastCheck.option(
    FastCheck.tuple(NonnegativeInterval.arbitrary, NonnegativeInterval.arbitrary).map(
      ([memPrice, stepPrice]) => new ExUnitPrices({ memPrice, stepPrice })
    ),
    { nil: undefined }
  ),
  maxTxExUnits: FastCheck.option(
    FastCheck.tuple(Numeric.Uint64Arbitrary, Numeric.Uint64Arbitrary).map(
      ([mem, steps]) => new ExUnits({ mem, steps })
    ),
    { nil: undefined }
  ),
  maxBlockExUnits: FastCheck.option(
    FastCheck.tuple(Numeric.Uint64Arbitrary, Numeric.Uint64Arbitrary).map(
      ([mem, steps]) => new ExUnits({ mem, steps })
    ),
    { nil: undefined }
  ),
  maxValueSize: FastCheck.option(Numeric.Uint32Arbitrary, { nil: undefined }),
  collateralPercentage: FastCheck.option(Numeric.Uint16Arbitrary, { nil: undefined }),
  maxCollateralInputs: FastCheck.option(Numeric.Uint16Arbitrary, { nil: undefined }),
  poolVotingThresholds: FastCheck.option(
    FastCheck.tuple(
      UnitInterval.arbitrary,
      UnitInterval.arbitrary,
      UnitInterval.arbitrary,
      UnitInterval.arbitrary,
      UnitInterval.arbitrary
    ).map(([t1, t2, t3, t4, t5]) => new PoolVotingThresholds({ t1, t2, t3, t4, t5 })),
    { nil: undefined }
  ),
  drepVotingThresholds: FastCheck.option(
    FastCheck.tuple(
      UnitInterval.arbitrary,
      UnitInterval.arbitrary,
      UnitInterval.arbitrary,
      UnitInterval.arbitrary,
      UnitInterval.arbitrary,
      UnitInterval.arbitrary,
      UnitInterval.arbitrary,
      UnitInterval.arbitrary,
      UnitInterval.arbitrary,
      UnitInterval.arbitrary
    ).map(
      ([t1, t2, t3, t4, t5, t6, t7, t8, t9, t10]) =>
        new DRepVotingThresholds({ t1, t2, t3, t4, t5, t6, t7, t8, t9, t10 })
    ),
    { nil: undefined }
  ),
  minCommitteeSize: FastCheck.option(Numeric.Uint16Arbitrary, { nil: undefined }),
  committeeTermLimit: FastCheck.option(Numeric.Uint32Arbitrary, { nil: undefined }),
  governanceActionValidity: FastCheck.option(Numeric.Uint32Arbitrary, { nil: undefined }),
  governanceActionDeposit: FastCheck.option(coinArb, { nil: undefined }),
  drepDeposit: FastCheck.option(coinArb, { nil: undefined }),
  drepInactivityPeriod: FastCheck.option(Numeric.Uint32Arbitrary, { nil: undefined }),
  minfeeRefScriptCoinsPerByte: FastCheck.option(NonnegativeInterval.arbitrary, { nil: undefined })
}).map((r) => new ProtocolParamUpdate(r))
