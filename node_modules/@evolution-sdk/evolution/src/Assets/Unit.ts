import { Schema } from "effect"

import * as AssetName from "../AssetName.js"
import * as Bytes from "../Bytes.js"
import * as PolicyId from "../PolicyId.js"
import * as Label from "./Label.js"

/**
 * Unit represents the concatenation of PolicyId and AssetName as a single hex string.
 * Format: policyId (56 chars) + assetName (0-64 chars)
 * Special case: "lovelace" represents ADA
 *
 * @since 2.0.0
 * @category model
 */
export type Unit = string

/**
 * Result of parsing a Unit string.
 *
 * @since 2.0.0
 * @category model
 */
export interface UnitDetails {
  policyId: PolicyId.PolicyId
  assetName: AssetName.AssetName | null
  name: AssetName.AssetName | null
  label: number | null
}

/**
 * Parse a Unit string into its components.
 * Extracts policy ID, asset name, and CIP-67 label if present.
 *
 * @since 2.0.0
 * @category conversions
 */
export const fromUnit = (unit: Unit): UnitDetails => {
  const policyIdHex = unit.slice(0, 56)
  const assetNameHex = unit.slice(56) || null

  const policyId = Schema.decodeSync(PolicyId.FromHex)(policyIdHex)

  if (!assetNameHex) {
    return {
      policyId,
      assetName: null,
      name: null,
      label: null
    }
  }

  const assetName = Schema.decodeSync(AssetName.FromHex)(assetNameHex)

  // Check for CIP-67 label (first 8 chars of asset name)
  if (assetNameHex.length >= 8) {
    const potentialLabel = assetNameHex.slice(0, 8)
    const labelNum = Label.fromLabel(potentialLabel)

    if (labelNum !== undefined) {
      // Has valid label, extract name without label
      const nameHex = assetNameHex.slice(8)
      const name = nameHex ? Schema.decodeSync(AssetName.FromHex)(nameHex) : null
      return {
        policyId,
        assetName,
        name,
        label: labelNum
      }
    }
  }

  // No label found
  return {
    policyId,
    assetName,
    name: assetName,
    label: null
  }
}

/**
 * Construct a Unit string from components.
 * Combines policy ID, optional CIP-67 label, and asset name.
 *
 * @since 2.0.0
 * @category conversions
 * @throws {Error} If asset name exceeds 32 bytes
 * @throws {Error} If policy ID is invalid length
 */
export const toUnit = (
  policyId: PolicyId.PolicyId,
  name?: AssetName.AssetName | string | null,
  label?: number | null
): Unit => {
  const policyIdHex = Schema.encodeSync(PolicyId.FromHex)(policyId)

  if (policyIdHex.length !== 56) {
    throw new Error(`Policy id invalid: ${policyIdHex}`)
  }

  if (!name && !label) {
    return policyIdHex
  }

  const nameHex = name ? (typeof name === "string" ? name : Bytes.toHex(name.bytes)) : ""
  const labelHex = label !== null && label !== undefined ? Label.toLabel(label) : ""

  const totalHex = labelHex + nameHex
  if (totalHex.length > 64) {
    throw new Error("Asset name size exceeds 32 bytes.")
  }

  return policyIdHex + totalHex
}

/**
 * Check if a value is the special "lovelace" unit.
 *
 * @since 2.0.0
 * @category predicates
 */
export const isLovelace = (unit: Unit): boolean => unit === "lovelace"

/**
 * Schema for validating Unit strings.
 *
 * @since 2.0.0
 * @category schemas
 */
export const UnitSchema = Schema.String.pipe(
  Schema.filter((s) => s === "lovelace" || (s.length >= 56 && s.length <= 120 && /^[0-9a-fA-F]+$/.test(s)), {
    message: () => 'Unit must be "lovelace" or hex string (56-120 chars)'
  })
).annotations({
  identifier: "Assets.Unit",
  description: "Unit identifier for native assets (policyId + assetName)"
})
