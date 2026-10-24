import type { RouteSpec, TreasuryProfile } from './index.js';

export const evmFixtures = {
  treasury: {
    treasuryId: 'evm-demo-treasury',
    chainId: 'evm',
    vaultMode: 'watch',
    governanceThreshold: 3,
    approvedRiskOffAssets: ['USDC', 'USDT'],
    protectedAssets: ['ETH', 'BTC'],
  } satisfies TreasuryProfile,
  route: {
    fromAsset: 'ETH',
    toAsset: 'USDC',
    venue: 'simulated-evm-route',
    maxSlippageBps: 100,
    routeId: 'evm-route-01',
  } satisfies RouteSpec,
  simulationPrice: {
    fromAssetPrice: 3200,
    toAssetPrice: 1,
  },
} as const;
