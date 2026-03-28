/**
 * Vote operation - submit voting procedures for governance actions.
 *
 * @module operations/Vote
 * @since 2.0.0
 */

import { Effect, Ref } from "effect"

import type * as GovernanceAction from "../../../GovernanceAction.js"
import * as VotingProcedures from "../../../VotingProcedures.js"
import { voterToKey } from "../phases/utils.js"
import * as RedeemerBuilder from "../RedeemerBuilder.js"
import { TransactionBuilderError, TxContext } from "../TransactionBuilder.js"
import type { VoteParams } from "./Operations.js"

/**
 * Check if a voter is script-controlled (requires redeemer).
 */
const isScriptVoter = (voter: VotingProcedures.Voter): boolean => {
  switch (voter._tag) {
    case "ConstitutionalCommitteeVoter":
      return voter.credential._tag === "ScriptHash"
    case "DRepVoter":
      return voter.drep._tag === "ScriptHashDRep"
    case "StakePoolVoter":
      // Pool operators are always key-hash based, never script-controlled
      return false
  }
}

/**
 * Creates a ProgramStep for vote operation.
 * Adds voting procedures to the transaction and tracks redeemers for script-controlled voters.
 *
 * Implementation:
 * 1. Validates voting procedures structure
 * 2. Merges with existing voting procedures if any
 * 3. Tracks redeemers for script-controlled voters (by voter key)
 *
 * **RedeemerBuilder Support:**
 * - Static: Direct Data value stored immediately
 * - Self: Callback stored for per-voter resolution after coin selection
 * - Batch: Callback + input set stored for multi-voter resolution
 *
 * @since 2.0.0
 * @category programs
 */
export const createVoteProgram = (params: VoteParams): Effect.Effect<void, TransactionBuilderError, TxContext> =>
  Effect.gen(function* () {
    const ctx = yield* TxContext

    // 1. Validate voting procedures
    if (params.votingProcedures.procedures.size === 0) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: "VotingProcedures must contain at least one voter",
          cause: params.votingProcedures
        })
      )
    }

    // 2. Collect script-controlled voters for redeemer tracking
    const scriptVoters = new Set<string>()
    for (const [voter, _] of params.votingProcedures.procedures.entries()) {
      if (isScriptVoter(voter)) {
        scriptVoters.add(voterToKey(voter))
      }
    }

    // 3. If redeemer provided but no script voters, warn
    if (params.redeemer && scriptVoters.size === 0) {
      yield* Effect.logWarning(
        "[Vote] Redeemer provided but no script-controlled voters found. Redeemer will be ignored."
      )
    }

    // 4. If script voters exist but no redeemer, fail
    if (scriptVoters.size > 0 && !params.redeemer) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: "Redeemer required for script-controlled voters",
          cause: Array.from(scriptVoters)
        })
      )
    }

    // 5. Update state: merge voting procedures and track redeemers
    yield* Ref.update(ctx, (state) => {
      // Merge voting procedures
      let mergedVotingProcedures =
        state.votingProcedures ||
        new VotingProcedures.VotingProcedures({
          procedures: new Map()
        })

      // Merge new procedures into existing
      const mergedMap = new Map<
        VotingProcedures.Voter,
        Map<GovernanceAction.GovActionId, VotingProcedures.VotingProcedure>
      >(mergedVotingProcedures.procedures)
      for (const [voter, govActionMap] of params.votingProcedures.procedures.entries()) {
        const existingGovActionMap = mergedMap.get(voter)
        if (existingGovActionMap) {
          // Merge gov action maps for this voter
          const mergedGovActionMap = new Map<GovernanceAction.GovActionId, VotingProcedures.VotingProcedure>(
            existingGovActionMap
          )
          for (const [govActionId, votingProcedure] of govActionMap.entries()) {
            mergedGovActionMap.set(govActionId, votingProcedure)
          }
          mergedMap.set(voter, mergedGovActionMap)
        } else {
          // New voter, copy entire gov action map
          mergedMap.set(voter, new Map(govActionMap))
        }
      }

      mergedVotingProcedures = new VotingProcedures.VotingProcedures({
        procedures: mergedMap
      })

      // Track redeemers for script voters
      let newRedeemers = state.redeemers
      let newDeferredRedeemers = state.deferredRedeemers

      if (params.redeemer && scriptVoters.size > 0) {
        const deferred = RedeemerBuilder.toDeferredRedeemer(params.redeemer)

        if (deferred._tag === "static") {
          // Static mode: store resolved data immediately
          newRedeemers = new Map(state.redeemers)
          for (const voterKey of scriptVoters) {
            newRedeemers.set(voterKey, {
              tag: "vote",
              data: deferred.data,
              exUnits: undefined,
              label: params.label
            })
          }
        } else {
          // Self or Batch mode: store deferred for resolution after coin selection
          newDeferredRedeemers = new Map(state.deferredRedeemers)
          for (const voterKey of scriptVoters) {
            newDeferredRedeemers.set(voterKey, {
              tag: "vote",
              deferred,
              exUnits: undefined,
              label: params.label
            })
          }
        }
      }

      return {
        ...state,
        votingProcedures: mergedVotingProcedures,
        redeemers: newRedeemers,
        deferredRedeemers: newDeferredRedeemers
      }
    })

    yield* Effect.logDebug(
      `[Vote] Added voting procedures for ${params.votingProcedures.procedures.size} voter(s), ${scriptVoters.size} script-controlled`
    )
  })
