import { Effect as Eff, Equal, FastCheck, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as Anchor from "./Anchor.js"
import * as CBOR from "./CBOR.js"
import * as Credential from "./Credential.js"
import * as DRep from "./DRep.js"
import * as GovernanceAction from "./GovernanceAction.js"
import * as KeyHash from "./KeyHash.js"
import * as PoolKeyHash from "./PoolKeyHash.js"
import * as ScriptHash from "./ScriptHash.js"
import * as TransactionHash from "./TransactionHash.js"
import * as TransactionIndex from "./TransactionIndex.js"

/**
 * Helper function for content-based Map equality using Equal.equals.
 * Compares two Maps by iterating entries and using Equal.equals for both keys and values.
 *
 * @since 2.0.0
 * @category equality
 */
const mapEquals = <K, V>(a: Map<K, V>, b: Map<K, V>): boolean => {
  if (a.size !== b.size) return false

  for (const [aKey, aValue] of a.entries()) {
    let found = false
    for (const [bKey, bValue] of b.entries()) {
      if (Equal.equals(aKey, bKey)) {
        if (aValue instanceof Map && bValue instanceof Map) {
          if (!mapEquals(aValue, bValue)) return false
        } else {
          if (!Equal.equals(aValue, bValue)) return false
        }
        found = true
        break
      }
    }
    if (!found) return false
  }

  return true
}

/**
 * Helper function for content-based Map hashing.
 * Computes hash by XORing hashes of all entries for order-independence.
 *
 * @since 2.0.0
 * @category hashing
 */
const mapHash = <K, V>(map: Map<K, V>): number => {
  let hash = Hash.hash(map.size)
  for (const [key, value] of map.entries()) {
    hash ^= Hash.hash(key) ^ Hash.hash(value)
  }
  return hash
}

/**
 * Voter types based on Conway CDDL specification.
 *
 * Conway / CML mapping:
 *  - [0, addr_keyhash]   ConstitutionalCommitteeHotKeyHash
 *  - [1, script_hash]    ConstitutionalCommitteeHotScriptHash
 *  - [2, addr_keyhash]   DRepKeyHash
 *  - [3, script_hash]    DRepScriptHash
 *  - [4, pool_keyhash]   StakingPoolKeyHash
 *
 * @since 2.0.0
 * @category schemas
 */
export class ConstitutionalCommitteeVoter extends Schema.TaggedClass<ConstitutionalCommitteeVoter>()(
  "ConstitutionalCommitteeVoter",
  {
    credential: Credential.Credential
  }
) {
  toJSON() {
    return {
      _tag: "ConstitutionalCommitteeVoter" as const,
      credential: this.credential
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof ConstitutionalCommitteeVoter && Equal.equals(this.credential, that.credential)
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.hash(this.credential))
  }
}

export class DRepVoter extends Schema.TaggedClass<DRepVoter>()("DRepVoter", {
  drep: DRep.DRep
}) {
  toJSON() {
    return {
      _tag: "DRepVoter" as const,
      drep: this.drep
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof DRepVoter && Equal.equals(this.drep, that.drep)
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.hash(this.drep))
  }
}

export class StakePoolVoter extends Schema.TaggedClass<StakePoolVoter>()("StakePoolVoter", {
  poolKeyHash: PoolKeyHash.PoolKeyHash
}) {
  toJSON() {
    return {
      _tag: "StakePoolVoter" as const,
      poolKeyHash: this.poolKeyHash
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof StakePoolVoter && Equal.equals(this.poolKeyHash, that.poolKeyHash)
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.hash(this.poolKeyHash))
  }
}

/**
 * Voter union schema.
 *
 * @since 2.0.0
 * @category schemas
 */
export const Voter = Schema.Union(ConstitutionalCommitteeVoter, DRepVoter, StakePoolVoter)

export type Voter = typeof Voter.Type

/**
 * CDDL schema for Voter as tuple structure.
 * ```
 * Maps to: [voter_type, voter_data]
 * ```
 *
 * @since 2.0.0
 * @category schemas
 */
// Match CML: split by concrete key/script variants for committee and drep, plus pool keyhash
// 0 = ConstitutionalCommitteeHotKeyHash (addr_keyhash)
// 1 = ConstitutionalCommitteeHotScriptHash (script_hash)
// 2 = DRepKeyHash (addr_keyhash)
// 3 = DRepScriptHash (script_hash)
// 4 = StakingPoolKeyHash (pool_keyhash)
export const VoterCDDL = Schema.Union(
  Schema.Tuple(Schema.Literal(0n), CBOR.ByteArray),
  Schema.Tuple(Schema.Literal(1n), CBOR.ByteArray),
  Schema.Tuple(Schema.Literal(2n), CBOR.ByteArray),
  Schema.Tuple(Schema.Literal(3n), CBOR.ByteArray),
  Schema.Tuple(Schema.Literal(4n), CBOR.ByteArray)
)

/**
 * CDDL transformation schema for Voter.
 *
 * @since 2.0.0
 * @category schemas
 */
export const VoterFromCDDL = Schema.transformOrFail(VoterCDDL, Schema.typeSchema(Voter), {
  strict: true,
  encode: (voter) =>
    Eff.gen(function* () {
      switch (voter._tag) {
        case "ConstitutionalCommitteeVoter": {
          if (voter.credential._tag === "KeyHash") {
            return [0n, voter.credential.hash] as const
          } else {
            return [1n, voter.credential.hash] as const
          }
        }
        case "DRepVoter": {
          if (voter.drep._tag === "KeyHashDRep") {
            return [2n, voter.drep.keyHash.hash] as const
          } else if (voter.drep._tag === "ScriptHashDRep") {
            return [3n, voter.drep.scriptHash.hash] as const
          } else {
            return yield* ParseResult.fail(
              new ParseResult.Type(VoterCDDL.ast, voter, "Always* DRep variants are not valid Voter identifiers")
            )
          }
        }
        case "StakePoolVoter": {
          return [4n, voter.poolKeyHash.hash] as const
        }
      }
    }),
  decode: (cddl) =>
    Eff.gen(function* () {
      const [voterType, voterData] = cddl
      switch (voterType) {
        case 0n: {
          const keyHash = yield* ParseResult.decode(KeyHash.FromBytes)(voterData)
          return new ConstitutionalCommitteeVoter({ credential: keyHash })
        }
        case 1n: {
          const scriptHash = yield* ParseResult.decode(ScriptHash.FromBytes)(voterData)
          return new ConstitutionalCommitteeVoter({ credential: scriptHash })
        }
        case 2n: {
          const keyHash = yield* ParseResult.decode(KeyHash.FromBytes)(voterData)
          return new DRepVoter({ drep: new DRep.KeyHashDRep({ keyHash }) })
        }
        case 3n: {
          const scriptHash = yield* ParseResult.decode(ScriptHash.FromBytes)(voterData)
          return new DRepVoter({ drep: new DRep.ScriptHashDRep({ scriptHash }) })
        }
        case 4n: {
          const poolKeyHash = yield* ParseResult.decode(PoolKeyHash.FromBytes)(voterData)
          return new StakePoolVoter({ poolKeyHash })
        }
        default:
          return yield* ParseResult.fail(new ParseResult.Type(VoterCDDL.ast, cddl))
      }
    })
})

/**
 * Vote types based on Conway CDDL specification.
 *
 * ```
 * vote = 0 / 1 / 2  ; No / Yes / Abstain
 * ```
 *
 * @since 2.0.0
 * @category schemas
 */
export class NoVote extends Schema.TaggedClass<NoVote>()("NoVote", {}) {
  toJSON() {
    return { _tag: "NoVote" as const }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof NoVote
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.string("NoVote"))
  }
}

export class YesVote extends Schema.TaggedClass<YesVote>()("YesVote", {}) {
  toJSON() {
    return { _tag: "YesVote" as const }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof YesVote
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.string("YesVote"))
  }
}

export class AbstainVote extends Schema.TaggedClass<AbstainVote>()("AbstainVote", {}) {
  toJSON() {
    return { _tag: "AbstainVote" as const }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof AbstainVote
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.string("AbstainVote"))
  }
}

/**
 * Vote union schema.
 *
 * @since 2.0.0
 * @category schemas
 */
export const Vote = Schema.Union(NoVote, YesVote, AbstainVote)

export type Vote = typeof Vote.Type

/**
 * CDDL schema for Vote.
 *
 * @since 2.0.0
 * @category schemas
 */
export const VoteCDDL = Schema.Union(
  Schema.Literal(0n), // No
  Schema.Literal(1n), // Yes
  Schema.Literal(2n) // Abstain
)

/**
 * CDDL transformation schema for Vote.
 *
 * @since 2.0.0
 * @category schemas
 */
export const VoteFromCDDL = Schema.transformOrFail(VoteCDDL, Schema.typeSchema(Vote), {
  strict: true,
  encode: (vote) =>
    Eff.gen(function* () {
      switch (vote._tag) {
        case "NoVote":
          return 0n as const
        case "YesVote":
          return 1n as const
        case "AbstainVote":
          return 2n as const
      }
    }),
  decode: (cddl) =>
    Eff.gen(function* () {
      switch (cddl) {
        case 0n:
          return new NoVote()
        case 1n:
          return new YesVote()
        case 2n:
          return new AbstainVote()
        default:
          return yield* ParseResult.fail(new ParseResult.Type(VoteCDDL.ast, cddl))
      }
    })
})

/**
 * Voting procedure based on Conway CDDL specification.
 *
 * ```
 * voting_procedure = [ vote, anchor / null ]
 * ```
 *
 * @since 2.0.0
 * @category schemas
 */
export class VotingProcedure extends Schema.Class<VotingProcedure>("VotingProcedure")({
  vote: Vote,
  anchor: Schema.NullOr(Anchor.Anchor)
}) {
  toJSON() {
    return {
      vote: this.vote,
      anchor: this.anchor
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
      that instanceof VotingProcedure && Equal.equals(this.vote, that.vote) && Equal.equals(this.anchor, that.anchor)
    )
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.combine(Hash.hash(this.vote))(Hash.hash(this.anchor)))
  }
}

/**
 * CDDL schema for VotingProcedure tuple structure.
 *
 * @since 2.0.0
 * @category schemas
 */
export const VotingProcedureCDDL = Schema.Tuple(
  VoteCDDL, // vote
  Schema.NullOr(Anchor.CDDLSchema) // anchor / null
)

/**
 * CDDL transformation schema for VotingProcedure.
 *
 * @since 2.0.0
 * @category schemas
 */
export const VotingProcedureFromCDDL = Schema.transformOrFail(VotingProcedureCDDL, Schema.typeSchema(VotingProcedure), {
  strict: true,
  encode: (procedure) =>
    Eff.gen(function* () {
      const voteCDDL = yield* ParseResult.encode(VoteFromCDDL)(procedure.vote)
      const anchorCDDL = procedure.anchor ? yield* ParseResult.encode(Anchor.FromCDDL)(procedure.anchor) : null
      return [voteCDDL, anchorCDDL] as const
    }),
  decode: ([voteCDDL, anchorCDDL]) =>
    Eff.gen(function* () {
      const vote = yield* ParseResult.decode(VoteFromCDDL)(voteCDDL)
      const anchor = anchorCDDL ? yield* ParseResult.decode(Anchor.FromCDDL)(anchorCDDL) : null
      return new VotingProcedure({ vote, anchor })
    })
})

/**
 * VotingProcedures based on Conway CDDL specification.
 *
 * ```
 * voting_procedures = {+ voter => {+ gov_action_id => voting_procedure}}
 * ```
 *
 * A nested map structure where voters map to their votes on specific governance actions.
 *
 * @since 2.0.0
 * @category model
 */
export class VotingProcedures extends Schema.Class<VotingProcedures>("VotingProcedures")({
  procedures: Schema.Map({
    key: Voter,
    value: Schema.Map({
      key: GovernanceAction.GovActionId,
      value: VotingProcedure
    })
  })
}) {
  toJSON() {
    const serialized: Array<any> = []
    for (const [voter, actionMap] of this.procedures.entries()) {
      const voterJson = voter.toJSON()
      const actions: Array<any> = []
      for (const [govActionId, procedure] of actionMap.entries()) {
        const actionIdJson = govActionId.toJSON()
        actions.push([actionIdJson, procedure.toJSON()])
      }
      serialized.push([voterJson, actions])
    }
    return {
      procedures: serialized
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof VotingProcedures && mapEquals(this.procedures, that.procedures)
  }

  /**
   * @since 2.0.0
   * @category hashing
   */
  [Hash.symbol](): number {
    let hash = Hash.hash(this.procedures.size)
    for (const [voter, govActionMap] of this.procedures.entries()) {
      const voterHash = Hash.hash(voter)
      const govActionMapHash = mapHash(govActionMap)
      hash ^= voterHash ^ govActionMapHash
    }
    return Hash.cached(this, hash)
  }
}

/**
 * CDDL schema for VotingProcedures map structure.
 *
 * @since 2.0.0
 * @category schemas
 */
export const CDDLSchema = Schema.MapFromSelf({
  key: VoterCDDL, // voter
  value: Schema.MapFromSelf({
    key: GovernanceAction.GovActionIdCDDL, // gov_action_id
    value: VotingProcedureCDDL // voting_procedure
  })
})

/**
 * CDDL transformation schema for VotingProcedures.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCDDL = Schema.transformOrFail(CDDLSchema, Schema.typeSchema(VotingProcedures), {
  strict: true,
  encode: (toA) =>
    Eff.gen(function* () {
      const mapEntries = new Map()

      for (const [voter, govActionMap] of toA.procedures) {
        const voterCDDL = yield* ParseResult.encode(VoterFromCDDL)(voter)
        const innerMapEntries = new Map()

        for (const [govActionId, votingProcedure] of govActionMap) {
          const govActionIdCDDL = yield* ParseResult.encode(GovernanceAction.GovActionIdFromCDDL)(govActionId)
          const procedureCDDL = yield* ParseResult.encode(VotingProcedureFromCDDL)(votingProcedure)
          innerMapEntries.set(govActionIdCDDL, procedureCDDL)
        }

        mapEntries.set(voterCDDL, innerMapEntries)
      }

      return mapEntries
    }),
  decode: (fromA) =>
    Eff.gen(function* () {
      const proceduresMap = new Map<Voter, Map<GovernanceAction.GovActionId, VotingProcedure>>()

      for (const [voterCDDL, innerMapCDDL] of fromA) {
        const voter = yield* ParseResult.decode(VoterFromCDDL)(voterCDDL)
        const govActionMap = new Map<GovernanceAction.GovActionId, VotingProcedure>()

        for (const [govActionIdCDDL, procedureCDDL] of innerMapCDDL) {
          const govActionId = yield* ParseResult.decode(GovernanceAction.GovActionIdFromCDDL)(govActionIdCDDL)
          const procedure = yield* ParseResult.decode(VotingProcedureFromCDDL)(procedureCDDL)
          govActionMap.set(govActionId, procedure)
        }

        proceduresMap.set(voter, govActionMap)
      }

      return new VotingProcedures({ procedures: proceduresMap })
    })
})

/**
 * CBOR bytes transformation schema for VotingProcedures.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    CBOR.FromBytes(options), // Uint8Array → CBOR
    FromCDDL // CBOR → VotingProcedures
  ).annotations({
    identifier: "VotingProcedures.FromCBORBytes",
    title: "VotingProcedures from CBOR Bytes",
    description: "Transforms CBOR bytes to VotingProcedures"
  })

/**
 * CBOR hex transformation schema for VotingProcedures.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    Schema.Uint8ArrayFromHex, // string → Uint8Array
    FromCBORBytes(options) // Uint8Array → VotingProcedures
  ).annotations({
    identifier: "VotingProcedures.FromCBORHex",
    title: "VotingProcedures from CBOR Hex",
    description: "Transforms CBOR hex string to VotingProcedures"
  })

// ============================================================================
// Constructors
// ============================================================================
// Constructors - Simple helper functions
// ============================================================================

/**
 * Create a No vote.
 *
 * @since 2.0.0
 * @category constructors
 */
export const no = (): Vote => new NoVote()

/**
 * Create a Yes vote.
 *
 * @since 2.0.0
 * @category constructors
 */
export const yes = (): Vote => new YesVote()

/**
 * Create an Abstain vote.
 *
 * @since 2.0.0
 * @category constructors
 */
export const abstain = (): Vote => new AbstainVote()

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a voter is a Constitutional Committee voter.
 *
 * @since 2.0.0
 * @category predicates
 */
export const isConstitutionalCommitteeVoter = (
  voter: Voter
): voter is Schema.Schema.Type<typeof ConstitutionalCommitteeVoter> => voter._tag === "ConstitutionalCommitteeVoter"

/**
 * Check if a voter is a DRep voter.
 *
 * @since 2.0.0
 * @category predicates
 */
export const isDRepVoter = (voter: Voter): voter is Schema.Schema.Type<typeof DRepVoter> => voter._tag === "DRepVoter"

/**
 * Check if a voter is a Stake Pool voter.
 *
 * @since 2.0.0
 * @category predicates
 */
export const isStakePoolVoter = (voter: Voter): voter is Schema.Schema.Type<typeof StakePoolVoter> =>
  voter._tag === "StakePoolVoter"

/**
 * Check if a vote is a No vote.
 *
 * @since 2.0.0
 * @category predicates
 */
export const isNoVote = (vote: Vote): vote is Schema.Schema.Type<typeof NoVote> => vote._tag === "NoVote"

/**
 * Check if a vote is a Yes vote.
 *
 * @since 2.0.0
 * @category predicates
 */
export const isYesVote = (vote: Vote): vote is Schema.Schema.Type<typeof YesVote> => vote._tag === "YesVote"

/**
 * Check if a vote is an Abstain vote.
 *
 * @since 2.0.0
 * @category predicates
 */
export const isAbstainVote = (vote: Vote): vote is Schema.Schema.Type<typeof AbstainVote> => vote._tag === "AbstainVote"

// ============================================================================
// Pattern Matching
// ============================================================================

/**
 * Pattern match on a Voter.
 *
 * @since 2.0.0
 * @category pattern matching
 */
export const matchVoter =
  <R>(patterns: {
    ConstitutionalCommitteeVoter: (credential: Credential.Credential) => R
    DRepVoter: (drep: DRep.DRep) => R
    StakePoolVoter: (poolKeyHash: PoolKeyHash.PoolKeyHash) => R
  }) =>
  (voter: Voter): R => {
    switch (voter._tag) {
      case "ConstitutionalCommitteeVoter":
        return patterns.ConstitutionalCommitteeVoter(voter.credential)
      case "DRepVoter":
        return patterns.DRepVoter(voter.drep)
      case "StakePoolVoter":
        return patterns.StakePoolVoter(voter.poolKeyHash)
    }
  }

/**
 * Pattern match on a Vote.
 *
 * @since 2.0.0
 * @category pattern matching
 */
export const matchVote =
  <R>(patterns: { NoVote: () => R; YesVote: () => R; AbstainVote: () => R }) =>
  (vote: Vote): R => {
    switch (vote._tag) {
      case "NoVote":
        return patterns.NoVote()
      case "YesVote":
        return patterns.YesVote()
      case "AbstainVote":
        return patterns.AbstainVote()
    }
  }

// ============================================================================
// Arbitrary
// ============================================================================

/**
 * FastCheck arbitrary for VotingProcedures.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = FastCheck.array(
  FastCheck.tuple(
    // Reuse existing voter arbitraries
    FastCheck.oneof(
      Credential.arbitrary.map((credential) => new ConstitutionalCommitteeVoter({ credential })),
      // Only key/script DRep variants are valid Voter identifiers
      FastCheck.oneof(
        KeyHash.arbitrary.map((keyHash) => new DRep.KeyHashDRep({ keyHash })),
        ScriptHash.arbitrary.map((scriptHash) => new DRep.ScriptHashDRep({ scriptHash }))
      ).map((drep) => new DRepVoter({ drep })),
      PoolKeyHash.arbitrary.map((poolKeyHash) => new StakePoolVoter({ poolKeyHash }))
    ),
    FastCheck.array(
      FastCheck.tuple(
        // Create GovActionId instances using proper branded types
        FastCheck.tuple(
          FastCheck.uint8Array({ minLength: 32, maxLength: 32 }),
          FastCheck.bigInt({ min: 0n, max: 65535n })
        ).map(
          ([transactionId, govActionIndex]) =>
            new GovernanceAction.GovActionId({
              transactionId: new TransactionHash.TransactionHash({ hash: transactionId }),
              govActionIndex: Schema.decodeSync(Schema.typeSchema(TransactionIndex.TransactionIndex))(govActionIndex)
            })
        ),
        FastCheck.tuple(
          FastCheck.oneof(
            FastCheck.constant(new NoVote()),
            FastCheck.constant(new YesVote()),
            FastCheck.constant(new AbstainVote())
          ),
          FastCheck.option(Anchor.arbitrary, { nil: null })
        ).map(([vote, anchor]) => new VotingProcedure({ vote, anchor }))
      )
    ).map((arr) => new Map(arr))
  )
).map((arr) => new VotingProcedures({ procedures: new Map(arr) }))

// ============================================================================
// Root Functions
// ============================================================================

/**
 * Parse VotingProcedures from CBOR bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORBytes = (bytes: Uint8Array, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORBytes(options))(bytes)

/**
 * Parse VotingProcedures from CBOR hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORHex = (hex: string, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORHex(options))(hex)

/**
 * Encode VotingProcedures to CBOR bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORBytes = (data: VotingProcedures, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORBytes(options))(data)

/**
 * Encode VotingProcedures to CBOR hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHex = (data: VotingProcedures, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORHex(options))(data)

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create VotingProcedures for a single vote.
 *
 * Convenience function for the common case of one voter voting on one proposal.
 *
 * @since 2.0.0
 * @category helpers
 */
export const singleVote = (
  voter: Voter,
  govActionId: GovernanceAction.GovActionId,
  procedure: VotingProcedure
): VotingProcedures => {
  return new VotingProcedures({
    procedures: new Map([[voter, new Map([[govActionId, procedure]])]])
  })
}

/**
 * Create VotingProcedures for one voter voting on multiple proposals.
 *
 * Convenience function for submitting multiple votes from a single voter.
 *
 * @since 2.0.0
 * @category helpers
 */
export const multiVote = (
  voter: Voter,
  votes: ReadonlyArray<readonly [GovernanceAction.GovActionId, VotingProcedure]>
): VotingProcedures => {
  return new VotingProcedures({
    procedures: new Map([[voter, new Map(votes)]])
  })
}
