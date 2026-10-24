/**
 * Shared utilities for transaction builder phases
 *
 * @module phases/utils
 * @since 2.0.0
 */

import * as Bytes from "../../../Bytes.js"
import type * as Certificate from "../../../Certificate.js"
import * as PoolKeyHash from "../../../PoolKeyHash.js"

/**
 * Calculate certificate deposits and refunds from a list of certificates.
 *
 * Certificates with deposits (money OUT):
 * - RegCert: Stake registration deposit
 * - RegDrepCert: DRep registration deposit
 * - RegPoolCert: Pool registration deposit (PoolRegistration)
 * - StakeRegDelegCert: Combined stake registration + delegation deposit
 * - VoteRegDelegCert: Combined vote registration + delegation deposit
 * - StakeVoteRegDelegCert: Combined stake + vote registration + delegation deposit
 *
 * Certificates with refunds (money IN):
 * - UnregCert: Stake deregistration refund
 * - UnregDrepCert: DRep deregistration refund
 * - PoolRetirement: Pool retirement (no refund in Conway era; pool deposits are burned)
 *
 * @param certificates - Array of certificates to analyze
 * @param poolDeposits - Map of pool key hashes to their deposit amounts
 * @returns Object containing total deposits and refunds in lovelace
 *
 * @since 2.0.0
 * @category utilities
 */
export function calculateCertificateBalance(
  certificates: ReadonlyArray<Certificate.Certificate>,
  poolDeposits: ReadonlyMap<string, bigint>
): { deposits: bigint; refunds: bigint } {
  return certificates.reduce(
    (acc, cert) => {
      switch (cert._tag) {
        // Registration certificates with deposits (money goes OUT)
        case "RegCert":
        case "RegDrepCert":
        case "StakeRegDelegCert":
        case "VoteRegDelegCert":
        case "StakeVoteRegDelegCert":
          acc.deposits += cert.coin
          break

        // Deregistration certificates with refunds (money comes IN)
        case "UnregCert":
        case "UnregDrepCert":
          acc.refunds += cert.coin
          break

        // Pool registration - deposit tracked in state
        case "PoolRegistration": {
          const operatorHex = PoolKeyHash.toHex(cert.poolParams.operator)
          const deposit = poolDeposits.get(operatorHex)
          if (deposit !== undefined) {
            acc.deposits += deposit
          }
          break
        }

        // Pool retirement - no refund in Conway era (deposit is not refunded)
        // Pool deposits are burned upon retirement
        case "PoolRetirement":
          // No refund for pool retirement in Conway
          break

        // Delegation certificates with no deposit/refund
        case "StakeRegistration":
        case "StakeDeregistration":
        case "StakeDelegation":
        case "VoteDelegCert":
        case "StakeVoteDelegCert":
        case "AuthCommitteeHotCert":
        case "ResignCommitteeColdCert":
        case "UpdateDrepCert":
          // No deposit or refund
          break
      }
      return acc
    },
    { deposits: 0n, refunds: 0n }
  )
}

/**
 * Calculate total withdrawal amount from a map of reward accounts to withdrawal amounts.
 *
 * @param withdrawals - Map of reward accounts to withdrawal amounts
 * @returns Total withdrawal amount in lovelace
 *
 * @since 2.0.0
 * @category utilities
 */
export function calculateWithdrawals(withdrawals: ReadonlyMap<unknown, bigint>): bigint {
  let total = 0n
  for (const amount of withdrawals.values()) {
    total += amount
  }
  return total
}

/**
 * Calculate total proposal deposits from proposal procedures.
 *
 * Each proposal requires a deposit (govActionDeposit) which is tracked in the
 * ProposalProcedure structure. This deposit is deducted from transaction inputs
 * during balancing.
 *
 * @param proposalProcedures - ProposalProcedures containing one or more proposals (or undefined)
 * @returns Total proposal deposit amount in lovelace
 *
 * @since 2.0.0
 * @category utilities
 */
export function calculateProposalDeposits(
  proposalProcedures: { readonly procedures: ReadonlyArray<{ readonly deposit: bigint }> } | undefined
): bigint {
  if (!proposalProcedures || proposalProcedures.procedures.length === 0) {
    return 0n
  }

  return proposalProcedures.procedures.reduce((total, procedure) => total + procedure.deposit, 0n)
}

/**
 * Convert a Voter to a unique string key for redeemer tracking.
 *
 * Key formats:
 * - Constitutional Committee: `cc:{credentialHex}`
 * - DRep (KeyHash): `drep:{keyHashHex}`
 * - DRep (ScriptHash): `drep:{scriptHashHex}`
 * - DRep (Special): `drep:AlwaysAbstainDRep` or `drep:AlwaysNoConfidenceDRep`
 * - Stake Pool: `pool:{poolKeyHashHex}`
 *
 * This is used for:
 * 1. Tracking redeemers by voter in Vote.ts
 * 2. Computing vote redeemer indices in TxBuilderImpl.ts (assembly)
 * 3. Mapping evaluation results back to voters in Evaluation.ts
 *
 * The key format must match the sorting order used by Cardano ledger for
 * redeemer indexing (lexicographic sort of voter keys).
 *
 * @param voter - The voter to convert to a key
 * @returns Unique string key for the voter
 *
 * @since 2.0.0
 * @category utilities
 */
export function voterToKey(voter: {
  readonly _tag: "ConstitutionalCommitteeVoter" | "DRepVoter" | "StakePoolVoter"
  readonly credential?: { readonly hash: Uint8Array }
  readonly drep?: {
    readonly _tag: "KeyHashDRep" | "ScriptHashDRep" | "AlwaysAbstainDRep" | "AlwaysNoConfidenceDRep"
    readonly keyHash?: { readonly hash: Uint8Array }
    readonly scriptHash?: { readonly hash: Uint8Array }
  }
  readonly poolKeyHash?: { readonly hash: Uint8Array }
}): string {
  switch (voter._tag) {
    case "ConstitutionalCommitteeVoter":
      return `cc:${Bytes.toHex(voter.credential!.hash)}`
    case "DRepVoter":
      switch (voter.drep!._tag) {
        case "KeyHashDRep":
          return `drep:${Bytes.toHex(voter.drep!.keyHash!.hash)}`
        case "ScriptHashDRep":
          return `drep:${Bytes.toHex(voter.drep!.scriptHash!.hash)}`
        default:
          // AlwaysAbstain or AlwaysNoConfidence - shouldn't need redeemers
          return `drep:${voter.drep!._tag}`
      }
    case "StakePoolVoter":
      return `pool:${Bytes.toHex(voter.poolKeyHash!.hash)}`
  }
}
