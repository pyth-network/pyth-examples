// TODO: Replace with on-chain claim:
//
//   export async function claimWonShares(marketId: string, ownerAddress: string): Promise<void> {
//     const tx = await contract.claimShares(marketId, ownerAddress)
//     await tx.wait()
//   }

// ── MOCK ──────────────────────────────────────────────────────────────────────
export function claimWonShares(marketId: string, ownerAddress: string): void {
  // MOCK: no-op — in production this calls the settlement contract
  console.log(
    `[offchain] claimWonShares: market=${marketId} owner=${ownerAddress} (mock)`,
  );
}
// ── END MOCK ──────────────────────────────────────────────────────────────────
