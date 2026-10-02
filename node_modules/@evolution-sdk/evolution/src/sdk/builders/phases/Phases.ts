/**
 * Core type definitions for transaction builder phases.
 *
 * Each phase is modularized into its own file and executes as part
 * of the transaction state machine.
 *
 * @module Phases
 * @since 2.0.0
 */

/**
 * Build phases of the transaction state machine.
 *
 * @since 2.0.0
 */
export type Phase =
  | "selection"
  | "changeCreation"
  | "feeCalculation"
  | "balance"
  | "evaluation"
  | "collateral"
  | "fallback"
  | "complete"

/**
 * Result returned by a phase indicating the next phase to execute.
 *
 * @since 2.0.0
 */
export interface PhaseResult {
  readonly next: Phase
}
