import { Effect as Eff, Equal, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as Anchor from "./Anchor.js"
import * as CBOR from "./CBOR.js"
import * as Coin from "./Coin.js"
import * as GovernanceAction from "./GovernanceAction.js"
import * as RewardAccount from "./RewardAccount.js"

/**
 * Schema for a single proposal procedure based on Conway CDDL specification.
 *
 * ```
 * proposal_procedure = [
 *   deposit : coin,
 *   reward_account : reward_account,
 *   governance_action : governance_action,
 *   anchor : anchor / null
 * ]
 *
 * governance_action = [action_type, action_data]
 * ```
 *
 * @since 2.0.0
 * @category model
 */
export class ProposalProcedure extends Schema.Class<ProposalProcedure>("ProposalProcedure")({
  deposit: Coin.Coin,
  rewardAccount: RewardAccount.FromBech32,
  governanceAction: GovernanceAction.GovernanceAction,
  anchor: Schema.NullOr(Anchor.Anchor)
}) {
  /**
   * Convert to JSON representation.
   *
   * @since 2.0.0
   * @category conversions
   */
  toJSON() {
    return {
      _tag: "ProposalProcedure",
      deposit: this.deposit.toString(),
      rewardAccount: this.rewardAccount,
      governanceAction: this.governanceAction.toJSON ? this.governanceAction.toJSON() : this.governanceAction,
      anchor: this.anchor?.toJSON ? this.anchor.toJSON() : this.anchor
    }
  }

  /**
   * Convert to string representation.
   *
   * @since 2.0.0
   * @category conversions
   */
  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  /**
   * Custom inspect for Node.js REPL.
   *
   * @since 2.0.0
   * @category conversions
   */
  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  /**
   * Structural equality check.
   *
   * @since 2.0.0
   * @category equality
   */
  [Equal.symbol](that: unknown): boolean {
    return (
      that instanceof ProposalProcedure &&
      Equal.equals(this.deposit, that.deposit) &&
      Equal.equals(this.rewardAccount, that.rewardAccount) &&
      Equal.equals(this.governanceAction, that.governanceAction) &&
      Equal.equals(this.anchor, that.anchor)
    )
  }

  /**
   * Hash code generation.
   *
   * @since 2.0.0
   * @category hashing
   */
  [Hash.symbol](): number {
    return Hash.cached(
      this,
      Hash.combine(
        Hash.combine(Hash.combine(Hash.hash(this.deposit))(Hash.hash(this.rewardAccount)))(
          Hash.hash(this.governanceAction)
        )
      )(Hash.hash(this.anchor))
    )
  }
}

/**
 * CDDL schema for ProposalProcedure tuple structure.
 *
 * @since 2.0.0
 * @category schemas
 */
export const CDDLSchema = Schema.Tuple(
  CBOR.Integer, // deposit: coin
  CBOR.ByteArray, // reward_account (raw bytes)
  Schema.encodedSchema(GovernanceAction.CDDLSchema), // governance_action using proper CDDL schema
  Schema.NullOr(Anchor.CDDLSchema) // anchor / null
)

/**
 * CDDL transformation schema for individual ProposalProcedure.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCDDL = Schema.transformOrFail(CDDLSchema, Schema.typeSchema(ProposalProcedure), {
  strict: true,
  encode: (procedure) =>
    Eff.gen(function* () {
      const depositBigInt = BigInt(procedure.deposit)
      const rewardAccountBytes = yield* ParseResult.encode(RewardAccount.FromBytes)(procedure.rewardAccount)
      const governanceActionCDDL = yield* ParseResult.encode(GovernanceAction.FromCDDL)(procedure.governanceAction)
      const anchorCDDL = procedure.anchor ? yield* ParseResult.encode(Anchor.FromCDDL)(procedure.anchor) : null
      return [depositBigInt, rewardAccountBytes, governanceActionCDDL, anchorCDDL] as const
    }),
  decode: (procedureTuple) =>
    Eff.gen(function* () {
      const [depositBigInt, rewardAccountBytes, governanceActionCDDL, anchorCDDL] = procedureTuple as any
      const deposit = yield* ParseResult.decode(Schema.typeSchema(Coin.Coin))(depositBigInt)
      const rewardAccount = yield* ParseResult.decode(RewardAccount.FromBytes)(rewardAccountBytes)
      const governanceAction = yield* ParseResult.decode(GovernanceAction.FromCDDL)(governanceActionCDDL)
      const anchor = anchorCDDL ? yield* ParseResult.decode(Anchor.FromCDDL)(anchorCDDL) : null

      return new ProposalProcedure({
        deposit,
        rewardAccount,
        governanceAction,
        anchor
      })
    })
})

/**
 * CBOR bytes transformation schema for individual ProposalProcedure.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    CBOR.FromBytes(options), // Uint8Array → CBOR
    FromCDDL // CBOR → ProposalProcedure
  ).annotations({
    identifier: "ProposalProcedure.FromCBORBytes",
    title: "ProposalProcedure from CBOR Bytes",
    description: "Transforms CBOR bytes to ProposalProcedure"
  })

/**
 * CBOR hex transformation schema for individual ProposalProcedure.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    Schema.Uint8ArrayFromHex, // string → Uint8Array
    FromCBORBytes(options) // Uint8Array → ProposalProcedure
  ).annotations({
    identifier: "ProposalProcedure.FromCBORHex",
    title: "ProposalProcedure from CBOR Hex",
    description: "Transforms CBOR hex string to ProposalProcedure"
  })

// ============================================================================
// Root Functions
// ============================================================================

/**
 * Parse individual ProposalProcedure from CBOR bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORBytes = (bytes: Uint8Array, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORBytes(options))(bytes)

/**
 * Parse individual ProposalProcedure from CBOR hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORHex = (hex: string, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORHex(options))(hex)

/**
 * Encode individual ProposalProcedure to CBOR bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORBytes = (procedure: ProposalProcedure, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORBytes(options))(procedure)

/**
 * Encode individual ProposalProcedure to CBOR hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHex = (procedure: ProposalProcedure, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORHex(options))(procedure)
