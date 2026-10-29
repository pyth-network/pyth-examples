/**
 * Off-chain transaction builders for the DevalGuard liquidity pool.
 *
 * Provides helpers to construct deposit and withdraw transactions
 * against the pool validator.
 */

// --- Types ---

export interface PoolDatum {
  totalDeposits: bigint;
  totalReserved: bigint;
  totalPremiumsEarned: bigint;
}

export interface PoolConfig {
  /** Pool validator script hash (hex) */
  validatorHash: string;
  /** Pool NFT policy ID (same as validator hash for multi-purpose validator) */
  poolNftPolicy: string;
  /** Pool NFT token name */
  poolNftName: string;
  /** LP token name */
  lpTokenName: string;
  /** Current pool UTxO reference (txHash#index) */
  poolUtxoRef: { txHash: string; outputIndex: number };
}

export const POOL_NFT_NAME = "DevalGuard Pool";
export const LP_TOKEN_NAME = "DG-LP";

// --- Transaction parameter builders ---

export interface DepositTxParams {
  /** Amount of lovelace to deposit */
  depositAmount: bigint;
  /** Current pool datum */
  currentDatum: PoolDatum;
  /** New pool datum after deposit */
  newDatum: PoolDatum;
  /** LP tokens to mint (= depositAmount) */
  lpMintAmount: bigint;
}

export function buildDepositParams(
  currentDatum: PoolDatum,
  depositAmount: bigint,
): DepositTxParams {
  if (depositAmount <= 0n) {
    throw new Error("Deposit amount must be positive");
  }

  const newDatum: PoolDatum = {
    totalDeposits: currentDatum.totalDeposits + depositAmount,
    totalReserved: currentDatum.totalReserved,
    totalPremiumsEarned: currentDatum.totalPremiumsEarned,
  };

  return {
    depositAmount,
    currentDatum,
    newDatum,
    lpMintAmount: depositAmount,
  };
}

export interface WithdrawTxParams {
  /** Amount of lovelace to withdraw */
  withdrawAmount: bigint;
  /** Current pool datum */
  currentDatum: PoolDatum;
  /** New pool datum after withdrawal */
  newDatum: PoolDatum;
  /** LP tokens to burn (negative = burn) */
  lpBurnAmount: bigint;
}

export function buildWithdrawParams(
  currentDatum: PoolDatum,
  withdrawAmount: bigint,
): WithdrawTxParams {
  if (withdrawAmount <= 0n) {
    throw new Error("Withdraw amount must be positive");
  }

  const available =
    currentDatum.totalDeposits - currentDatum.totalReserved;
  if (withdrawAmount > available) {
    throw new Error(
      `Insufficient available liquidity: ${available} available, ${withdrawAmount} requested. ` +
      `${currentDatum.totalReserved} is reserved for active policies.`,
    );
  }

  const newDatum: PoolDatum = {
    totalDeposits: currentDatum.totalDeposits - withdrawAmount,
    totalReserved: currentDatum.totalReserved,
    totalPremiumsEarned: currentDatum.totalPremiumsEarned,
  };

  return {
    withdrawAmount,
    currentDatum,
    newDatum,
    lpBurnAmount: -withdrawAmount,
  };
}

// --- Pool state helpers ---

export function availableLiquidity(datum: PoolDatum): bigint {
  return datum.totalDeposits - datum.totalReserved;
}

export function utilizationRate(datum: PoolDatum): number {
  if (datum.totalDeposits === 0n) return 0;
  return Number(datum.totalReserved * 10000n / datum.totalDeposits) / 100;
}

export function formatPoolStats(datum: PoolDatum): string {
  const toAda = (l: bigint) => `${Number(l) / 1_000_000} ADA`;
  return [
    `Total deposits: ${toAda(datum.totalDeposits)}`,
    `Reserved: ${toAda(datum.totalReserved)}`,
    `Available: ${toAda(availableLiquidity(datum))}`,
    `Utilization: ${utilizationRate(datum).toFixed(1)}%`,
    `Premiums earned: ${toAda(datum.totalPremiumsEarned)}`,
  ].join("\n");
}
