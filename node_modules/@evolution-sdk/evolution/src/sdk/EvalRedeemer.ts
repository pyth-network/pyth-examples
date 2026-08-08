// EvalRedeemer types and utilities for transaction evaluation

import type * as Redeemer from "../Redeemer.js"

/**
 * Evaluation result for a single redeemer from transaction evaluation.
 *
 * Uses Core CDDL terminology ("cert"/"reward") for consistency.
 * Provider implementations map from their API formats (e.g., Ogmios "publish"/"withdraw").
 *
 * @since 2.0.0
 * @category model
 */
export type EvalRedeemer = {
  readonly ex_units: Redeemer.ExUnits
  readonly redeemer_index: number
  readonly redeemer_tag: Redeemer.RedeemerTag
}
