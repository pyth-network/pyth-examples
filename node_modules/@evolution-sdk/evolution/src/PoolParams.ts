import { BigDecimal, Effect as Eff, Equal, FastCheck, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as CBOR from "./CBOR.js"
import * as Coin from "./Coin.js"
import * as KeyHash from "./KeyHash.js"
import * as PoolKeyHash from "./PoolKeyHash.js"
import * as PoolMetadata from "./PoolMetadata.js"
import * as Relay from "./Relay.js"
import * as RewardAccount from "./RewardAccount.js"
import * as UnitInterval from "./UnitInterval.js"
import * as VrfKeyHash from "./VrfKeyHash.js"

/**
 * Schema for PoolParams representing stake pool registration parameters.
 *
 * ```
 * pool_params =
 *   ( operator       : pool_keyhash
 *   , vrf_keyhash    : vrf_keyhash
 *   , pledge         : coin
 *   , cost           : coin
 *   , margin         : unit_interval
 *   , reward_account : reward_account
 *   , pool_owners    : set<addr_keyhash>
 *   , relays         : [* relay]
 *   , pool_metadata  : pool_metadata/ nil
 *   )
 * ```
 *
 * @since 2.0.0
 * @category model
 */
export class PoolParams extends Schema.TaggedClass<PoolParams>()("PoolParams", {
  operator: PoolKeyHash.PoolKeyHash,
  vrfKeyhash: VrfKeyHash.VrfKeyHash,
  pledge: Coin.Coin,
  cost: Coin.Coin,
  margin: UnitInterval.UnitInterval,
  rewardAccount: RewardAccount.RewardAccount,
  poolOwners: Schema.Array(KeyHash.KeyHash),
  relays: Schema.Array(Relay.Relay),
  poolMetadata: Schema.optionalWith(PoolMetadata.PoolMetadata, {
    nullable: true
  })
}) {
  /**
   * Convert to JSON-serializable object.
   * Converts bigint fields to strings and delegates to contained types' toJSON methods.
   *
   * @since 2.0.0
   * @category encoding
   */
  toJSON() {
    return {
      _tag: "PoolParams" as const,
      operator: this.operator.toJSON(),
      vrfKeyhash: this.vrfKeyhash.toJSON(),
      pledge: String(this.pledge),
      cost: String(this.cost),
      margin: {
        numerator: String(this.margin.numerator),
        denominator: String(this.margin.denominator)
      },
      rewardAccount: this.rewardAccount.toJSON(),
      poolOwners: this.poolOwners.map((owner) => owner.toJSON()),
      relays: this.relays.map((relay) => relay.toJSON()),
      poolMetadata: this.poolMetadata ? this.poolMetadata.toJSON() : null
    }
  }

  /**
   * Encode to CBOR bytes.
   *
   * @since 2.0.0
   * @category encoding
   */
  toCBORBytes(): Uint8Array {
    return toBytes(this)
  }

  /**
   * Encode to CBOR hex string.
   *
   * @since 2.0.0
   * @category encoding
   */
  toCBORHex(): string {
    return toHex(this)
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    if (!(that instanceof PoolParams)) return false

    return (
      Equal.equals(this.operator, that.operator) &&
      Equal.equals(this.vrfKeyhash, that.vrfKeyhash) &&
      this.pledge === that.pledge &&
      this.cost === that.cost &&
      Equal.equals(this.margin, that.margin) &&
      Equal.equals(this.rewardAccount, that.rewardAccount) &&
      this.poolOwners.length === that.poolOwners.length &&
      this.poolOwners.every((owner, i) => Equal.equals(owner, that.poolOwners[i])) &&
      this.relays.length === that.relays.length &&
      this.relays.every((relay, i) => Equal.equals(relay, that.relays[i])) &&
      ((this.poolMetadata === undefined && that.poolMetadata === undefined) ||
        (this.poolMetadata !== undefined &&
          that.poolMetadata !== undefined &&
          Equal.equals(this.poolMetadata, that.poolMetadata)))
    )
  }

  [Hash.symbol](): number {
    return Hash.cached(
      this,
      Hash.combine(Hash.hash(this.operator))(
        Hash.combine(Hash.hash(this.vrfKeyhash))(
          Hash.combine(Hash.hash(this.pledge))(
            Hash.combine(Hash.hash(this.cost))(
              Hash.combine(Hash.hash(this.margin))(
                Hash.combine(Hash.hash(this.rewardAccount))(
                  Hash.combine(Hash.array(this.poolOwners.map((o) => Hash.hash(o))))(
                    Hash.combine(Hash.array(this.relays.map((r) => Hash.hash(r))))(Hash.hash(this.poolMetadata))
                  )
                )
              )
            )
          )
        )
      )
    )
  }
}

export const CDDLSchema = Schema.Tuple(
  CBOR.ByteArray, // operator (pool_keyhash as bytes)
  CBOR.ByteArray, // vrf_keyhash (as bytes)
  CBOR.Integer, // pledge (coin)
  CBOR.Integer, // cost (coin)
  UnitInterval.CDDLSchema, // margin using UnitInterval CDDL schema
  CBOR.ByteArray, // reward_account (bytes)
  Schema.Array(CBOR.ByteArray), // pool_owners (set<addr_keyhash> as bytes array)
  Schema.Array(Schema.encodedSchema(Relay.FromCDDL)), // relays using Relay CDDL schema
  Schema.NullOr(Schema.encodedSchema(PoolMetadata.FromCDDL)) // pool_metadata using PoolMetadata CDDL schema
)

/**
 * CDDL schema for PoolParams.
 *
 * ```
 * pool_params = [
 *   operator       : pool_keyhash,
 *   vrf_keyhash    : vrf_keyhash,
 *   pledge         : coin,
 *   cost           : coin,
 *   margin         : unit_interval,
 *   reward_account : reward_account,
 *   pool_owners    : set<addr_keyhash>,
 *   relays         : [* relay],
 *   pool_metadata  : pool_metadata / nil
 * ]
 * ```
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCDDL = Schema.transformOrFail(CDDLSchema, Schema.typeSchema(PoolParams), {
  strict: true,
  encode: (toA) =>
    Eff.gen(function* () {
      const operatorBytes = yield* ParseResult.encode(PoolKeyHash.FromBytes)(toA.operator)
      const vrfKeyhashBytes = yield* ParseResult.encode(VrfKeyHash.FromBytes)(toA.vrfKeyhash)

      const marginEncoded = yield* ParseResult.encode(UnitInterval.FromCDDL)(toA.margin)
      const rewardAccountBytes = yield* ParseResult.encode(RewardAccount.FromBytes)(toA.rewardAccount)

      const poolOwnersBytes = yield* Eff.all(
        toA.poolOwners.map((owner) => ParseResult.encode(KeyHash.FromBytes)(owner))
      )

      const relaysEncoded = yield* Eff.all(toA.relays.map((relay) => ParseResult.encode(Relay.FromCDDL)(relay)))

      const poolMetadataEncoded = toA.poolMetadata
        ? yield* ParseResult.encode(PoolMetadata.FromCDDL)(toA.poolMetadata)
        : null

      return [
        operatorBytes,
        vrfKeyhashBytes,
        toA.pledge,
        toA.cost,
        marginEncoded,
        rewardAccountBytes,
        poolOwnersBytes,
        relaysEncoded,
        poolMetadataEncoded
      ] as const
    }),
  decode: ([
    operatorBytes,
    vrfKeyhashBytes,
    pledge,
    cost,
    marginEncoded,
    rewardAccountBytes,
    poolOwnersBytes,
    relaysEncoded,
    poolMetadataEncoded
  ]) =>
    Eff.gen(function* () {
      const operator = yield* ParseResult.decode(PoolKeyHash.FromBytes)(operatorBytes)
      const vrfKeyhash = yield* ParseResult.decode(VrfKeyHash.FromBytes)(vrfKeyhashBytes)
      const margin = yield* ParseResult.decode(UnitInterval.FromCDDL)(marginEncoded)
      const rewardAccount = yield* ParseResult.decode(RewardAccount.FromBytes)(rewardAccountBytes)

      const poolOwners = yield* Eff.all(
        poolOwnersBytes.map((ownerBytes) => ParseResult.decode(KeyHash.FromBytes)(ownerBytes))
      )

      const relays = yield* Eff.all(
        relaysEncoded.map((relayEncoded) => ParseResult.decode(Relay.FromCDDL)(relayEncoded))
      )

      const poolMetadata = poolMetadataEncoded
        ? yield* ParseResult.decode(PoolMetadata.FromCDDL)(poolMetadataEncoded)
        : undefined

      return yield* Eff.succeed(
        new PoolParams({
          operator,
          vrfKeyhash,
          pledge,
          cost,
          margin,
          rewardAccount,
          poolOwners,
          relays,
          poolMetadata
        })
      )
    })
})

/**
 * CBOR bytes transformation schema for PoolParams.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    CBOR.FromBytes(options), // Uint8Array → CBOR
    FromCDDL // CBOR → PoolParams
  )

/**
 * CBOR hex transformation schema for PoolParams.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    Schema.Uint8ArrayFromHex, // string → Uint8Array
    FromBytes(options) // Uint8Array → PoolParams
  )

/**
 * Get total effective stake for pool rewards calculation.
 *
 * @since 2.0.0
 * @category transformation
 */
export const getEffectiveStake = (params: PoolParams, totalStake: Coin.Coin): Coin.Coin => {
  // Effective stake is min(totalStake, pledge) for calculation purposes
  return totalStake < params.pledge ? totalStake : params.pledge
}

/**
 * Calculate pool operator rewards based on pool parameters.
 *
 * @since 2.0.0
 * @category transformation
 */
export const calculatePoolRewards = (
  params: PoolParams,
  totalRewards: Coin.Coin
): { operatorRewards: Coin.Coin; delegatorRewards: Coin.Coin } => {
  const fixedCost = params.cost
  const marginDecimal = UnitInterval.toBigDecimal(params.margin)

  if (totalRewards <= fixedCost) {
    return {
      operatorRewards: totalRewards,
      delegatorRewards: 0n
    }
  }

  const rewardsAfterCost = totalRewards - fixedCost
  const marginAsNumber = Number(BigDecimal.unsafeToNumber(marginDecimal))
  const operatorShare = BigInt(Math.floor(Number(rewardsAfterCost) * marginAsNumber))

  return {
    operatorRewards: fixedCost + operatorShare,
    delegatorRewards: rewardsAfterCost - operatorShare
  }
}

/**
 * Check if the pool has the minimum required cost.
 *
 * @since 2.0.0
 * @category predicates
 */
export const hasMinimumCost = (params: PoolParams, minPoolCost: Coin.Coin): boolean => params.cost >= minPoolCost

/**
 * Check if the pool margin is within valid range (0 to 1).
 *
 * @since 2.0.0
 * @category predicates
 */
export const hasValidMargin = (params: PoolParams): boolean =>
  params.margin.numerator <= params.margin.denominator && params.margin.denominator > 0n

/**
 * FastCheck arbitrary for generating random PoolParams instances for testing.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = FastCheck.record({
  operator: PoolKeyHash.arbitrary,
  vrfKeyhash: VrfKeyHash.arbitrary,
  pledge: FastCheck.bigInt({ min: 0n, max: 1000000000000n }),
  cost: FastCheck.bigInt({ min: 340000000n, max: 1000000000n }),
  margin: UnitInterval.arbitrary,
  rewardAccount: RewardAccount.arbitrary,
  poolOwners: FastCheck.array(KeyHash.arbitrary, {
    minLength: 1,
    maxLength: 5
  }),
  relays: FastCheck.array(Relay.arbitrary, { minLength: 0, maxLength: 3 }),
  poolMetadata: FastCheck.option(FastCheck.constant(undefined), {
    nil: undefined
  })
}).map((params) => new PoolParams(params))

// ============================================================================
// Root Functions
// ============================================================================

/**
 * Parse PoolParams from CBOR bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBytes = (bytes: Uint8Array, options?: CBOR.CodecOptions): PoolParams =>
  Schema.decodeSync(FromBytes(options))(bytes)

/**
 * Parse PoolParams from CBOR hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromHex = (hex: string, options?: CBOR.CodecOptions): PoolParams =>
  Schema.decodeSync(FromHex(options))(hex)

/**
 * Encode PoolParams to CBOR bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBytes = (params: PoolParams, options?: CBOR.CodecOptions): Uint8Array =>
  Schema.encodeSync(FromBytes(options))(params)

/**
 * Encode PoolParams to CBOR hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toHex = (params: PoolParams, options?: CBOR.CodecOptions): string =>
  Schema.encodeSync(FromHex(options))(params)
