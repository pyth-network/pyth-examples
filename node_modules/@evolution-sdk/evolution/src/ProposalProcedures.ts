import { Effect as Eff, Equal, FastCheck, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as Anchor from "./Anchor.js"
import * as CBOR from "./CBOR.js"
import * as Coin from "./Coin.js"
import * as GovernanceAction from "./GovernanceAction.js"
import * as ProposalProcedure from "./ProposalProcedure.js"
import * as RewardAccount from "./RewardAccount.js"

/**
 * Helper for array equality using element-by-element comparison.
 */
const arrayEquals = <A>(a: ReadonlyArray<A>, b: ReadonlyArray<A>): boolean => {
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
 * ProposalProcedures based on Conway CDDL specification.
 *
 * ```
 * CDDL: proposal_procedures = nonempty_set<proposal_procedure>
 * ```
 *
 * @since 2.0.0
 * @category model
 */
export class ProposalProcedures extends Schema.TaggedClass<ProposalProcedures>()("ProposalProcedures", {
  procedures: Schema.Array(ProposalProcedure.ProposalProcedure).pipe(
    Schema.filter((arr) => arr.length > 0, {
      message: () => "ProposalProcedures must contain at least one procedure"
    })
  )
}) {
  toJSON() {
    return {
      _tag: "ProposalProcedures" as const,
      procedures: this.procedures.map((p) => p.toJSON())
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof ProposalProcedures && arrayEquals(this.procedures, that.procedures)
  }

  [Hash.symbol](): number {
    return Hash.cached(this, arrayHash(this.procedures))
  }
}

/**
 * CDDL schema for ProposalProcedures that produces CBOR-compatible types.
 *
 * @since 2.0.0
 * @category schemas
 */
export const CDDLSchema = Schema.Array(ProposalProcedure.CDDLSchema)

/**
 * CDDL transformation schema for ProposalProcedures.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCDDL = Schema.transformOrFail(CDDLSchema, Schema.typeSchema(ProposalProcedures), {
  strict: true,
  encode: (toA) =>
    Eff.all(toA.procedures.map((procedure) => ParseResult.encode(ProposalProcedure.FromCDDL)(procedure))),
  decode: (fromA) =>
    Eff.gen(function* () {
      const procedures = yield* Eff.all(
        fromA.map((procedureTuple) => ParseResult.decode(ProposalProcedure.FromCDDL)(procedureTuple))
      )

      return new ProposalProcedures({ procedures })
    })
})

/**
 * CBOR bytes transformation schema for ProposalProcedures.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    CBOR.FromBytes(options), // Uint8Array → CBOR
    FromCDDL // CBOR → ProposalProcedures
  ).annotations({
    identifier: "ProposalProcedures.FromCBORBytes",
    title: "ProposalProcedures from CBOR Bytes",
    description: "Transforms CBOR bytes to ProposalProcedures"
  })

/**
 * CBOR hex transformation schema for ProposalProcedures.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    Schema.Uint8ArrayFromHex, // string → Uint8Array
    FromCBORBytes(options) // Uint8Array → ProposalProcedures
  ).annotations({
    identifier: "ProposalProcedures.FromCBORHex",
    title: "ProposalProcedures from CBOR Hex",
    description: "Transforms CBOR hex string to ProposalProcedures"
  })

/**
 * FastCheck arbitrary for ProposalProcedures.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = FastCheck.record({
  procedures: FastCheck.array(
    FastCheck.record({
      deposit: Coin.arbitrary,
      rewardAccount: RewardAccount.arbitrary,
      governanceAction: GovernanceAction.arbitrary,
      anchor: FastCheck.option(Anchor.arbitrary, { nil: null })
    }).map((params) => new ProposalProcedure.ProposalProcedure(params)),
    { minLength: 1, maxLength: 5 }
  )
}).map((params) => new ProposalProcedures(params))

// ============================================================================
// Root Functions
// ============================================================================

/**
 * Parse ProposalProcedures from CBOR bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORBytes = (bytes: Uint8Array, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORBytes(options))(bytes)

/**
 * Parse ProposalProcedures from CBOR hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORHex = (hex: string, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORHex(options))(hex)

/**
 * Encode ProposalProcedures to CBOR bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORBytes = (data: ProposalProcedures, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORBytes(options))(data)

/**
 * Encode ProposalProcedures to CBOR hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHex = (data: ProposalProcedures, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORHex(options))(data)

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create ProposalProcedures for a single proposal.
 *
 * Convenience function for the common case of submitting one governance action.
 *
 * @since 2.0.0
 * @category helpers
 */
export const single = (
  deposit: Coin.Coin,
  rewardAccount: RewardAccount.RewardAccount,
  governanceAction: GovernanceAction.GovernanceAction,
  anchor: Anchor.Anchor | null
): ProposalProcedures => {
  return new ProposalProcedures({
    procedures: [
      new ProposalProcedure.ProposalProcedure({
        deposit,
        rewardAccount,
        governanceAction,
        anchor
      })
    ]
  })
}
