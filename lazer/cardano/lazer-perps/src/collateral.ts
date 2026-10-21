/**
 * Lazer Perps — USDCx Collateral configuration
 *
 * USDCx is treated as a standard Cardano native token (policy ID + asset name).
 * All collateral amounts are in micro USDCx (6 decimals, 1 USDCx = 1_000_000 micro).
 *
 * On mainnet: use the real USDCx/USDC policy ID.
 * On PreProd: use a test token or ADA-as-collateral for testing.
 */

// USDCx token identification on Cardano
// Mainnet policy ID: 1f3aec8bfe7ea4fe14c5f121e2a92e301afe414147860d557cac7e34
// Mainnet asset name: 5553444378 ("USDCx")
// PreProd: USDCx is not deployed, using ADA (lovelace) as collateral stand-in
export const USDCX_POLICY_ID = process.env.USDCX_POLICY_ID || "";
export const USDCX_ASSET_NAME = process.env.USDCX_ASSET_NAME || "5553444378"; // "USDCx" in hex

// When policy ID is empty, we use ADA (lovelace) as collateral
export const USE_ADA_COLLATERAL = USDCX_POLICY_ID === "";

// Decimals: USDCx has 6 decimals (same as USDC)
export const USDCX_DECIMALS = 6;

/**
 * Format micro USDCx to human-readable string.
 * 100_000000 → "100.00 USDCx"
 */
export function formatCollateral(microAmount: number): string {
  const amount = microAmount / 10 ** USDCX_DECIMALS;
  const label = USE_ADA_COLLATERAL ? "ADA" : "USDCx";
  return `${amount.toFixed(2)} ${label}`;
}

/**
 * Parse human-readable amount to micro USDCx.
 * "100" → 100_000000
 */
export function parseCollateral(amount: string): number {
  return Math.round(parseFloat(amount) * 10 ** USDCX_DECIMALS);
}

/**
 * Get the asset unit string for Evolution SDK.
 * If using ADA: returns "lovelace"
 * If using USDCx: returns policyId + assetName
 */
export function collateralUnit(): string {
  if (USE_ADA_COLLATERAL) return "lovelace";
  return `${USDCX_POLICY_ID}${USDCX_ASSET_NAME}`;
}
