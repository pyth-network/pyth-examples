import lendingPoolAbi from "./LendingPool.json";
import erc20Abi from "./ERC20.json";
import ipythAbi from "./IPyth.json";

// Export ABIs with proper TypeScript typing
export const LENDING_POOL_ABI = lendingPoolAbi;
export const ERC20_ABI = erc20Abi;
export const IPYTH_ABI = ipythAbi;

// Type exports for TypeScript integration
export type LendingPoolAbi = typeof lendingPoolAbi;
export type ERC20Abi = typeof erc20Abi;     
export type IPYTHAbi = typeof ipythAbi;