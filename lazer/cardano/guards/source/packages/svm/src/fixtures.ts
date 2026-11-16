import type { RouteSpec, TreasuryProfile } from './index.js';

export const svmFixtures = {
  treasury: {
    treasuryId: 'svm-demo-treasury',
    chainId: 'svm',
    vaultMode: 'watch',
    governanceThreshold: 2,
    approvedRiskOffAssets: ['USDC'],
    protectedAssets: ['SOL', 'BTC'],
  } satisfies TreasuryProfile,
  route: {
    fromAsset: 'SOL',
    toAsset: 'USDC',
    venue: 'simulated-svm-route',
    maxSlippageBps: 75,
    routeId: 'svm-route-01',
  } satisfies RouteSpec,
  simulationPrice: {
    fromAssetPrice: 178.25,
    toAssetPrice: 1,
  },
} as const;
