import {
  baseCapabilities,
  roleModel,
  type ChainCapabilities,
  type ChainId as CoreChainId,
  type RiskStage,
  type Role as CoreRole,
} from '../../core/src/index.js';
import { svmFixtures } from './fixtures.js';

export type Role = CoreRole;

export type ChainId = Extract<CoreChainId, 'svm'>;

export type VaultMode = RiskStage;

export interface TreasuryProfile {
  treasuryId: string;
  chainId: ChainId;
  vaultMode: VaultMode;
  governanceThreshold: number;
  approvedRiskOffAssets: readonly string[];
  protectedAssets: readonly string[];
}

export interface RouteSpec {
  routeId: string;
  fromAsset: string;
  toAsset: string;
  venue: string;
  maxSlippageBps: number;
}

export interface RouteSimulationInput {
  route: RouteSpec;
  amountIn: number;
  fromAssetPrice: number;
  toAssetPrice: number;
  haircutBps?: number;
}

export interface RouteSimulationResult {
  chainId: ChainId;
  routeId: string;
  canExecute: boolean;
  estimatedOutput: number;
  estimatedValueUsd: number;
  estimatedImpactBps: number;
  executionNotes: readonly string[];
}

export interface ExecutionConstraints {
  isLive: false;
  executionMode: 'scaffold';
  requiresPreapproval: true;
  routeSimulationOnly: true;
  maxRouteAgeSeconds: number;
  allowedRoles: readonly Role[];
  notes: readonly string[];
}

export interface TreasuryConnector {
  chainId: ChainId;
  roles: readonly Role[];
  capabilities: ChainCapabilities;
  executionConstraints: ExecutionConstraints;
  simulateRoute(input: RouteSimulationInput): RouteSimulationResult;
  describeAvailability(): string;
}

export const chainId: ChainId = 'svm';

export const capabilities: ChainCapabilities = baseCapabilities.svm;

export const executionConstraints: ExecutionConstraints = {
  isLive: false,
  executionMode: 'scaffold',
  requiresPreapproval: true,
  routeSimulationOnly: true,
  maxRouteAgeSeconds: 30,
  allowedRoles: ['governance', 'risk_manager', 'keeper', 'viewer'],
  notes: [
    'SVM support is scaffolded for phase 2.',
    'Route simulation is deterministic and does not submit real transactions.',
    'Execution must be approved by governance before any live adapter is added.',
  ],
};

export const roles: readonly Role[] = roleModel;

export const createSvmConnector = (): TreasuryConnector => ({
  chainId,
  roles,
  capabilities,
  executionConstraints,
  simulateRoute: (input) => {
    const validationNotes: string[] = [];

    if (!Number.isFinite(input.amountIn) || input.amountIn <= 0) {
      validationNotes.push('Invalid amountIn: must be finite and > 0.');
    }
    if (!Number.isFinite(input.fromAssetPrice) || input.fromAssetPrice <= 0) {
      validationNotes.push('Invalid fromAssetPrice: must be finite and > 0.');
    }
    if (!Number.isFinite(input.toAssetPrice) || input.toAssetPrice <= 0) {
      validationNotes.push('Invalid toAssetPrice: must be finite and > 0.');
    }

    if (validationNotes.length > 0) {
      return {
        chainId,
        routeId: input.route.routeId,
        canExecute: false,
        estimatedOutput: 0,
        estimatedValueUsd: 0,
        estimatedImpactBps: 0,
        executionNotes: [
          'Scaffold connector only.',
          `Venue ${input.route.venue} is simulated, not live.`,
          'Route blocked due to invalid simulation inputs.',
          ...validationNotes,
        ],
      };
    }

    const haircutBps = input.haircutBps ?? 125;
    const grossValue = input.amountIn * input.fromAssetPrice;
    const effectiveOutputValue = grossValue * (1 - haircutBps / 10_000);
    const estimatedOutput = effectiveOutputValue / input.toAssetPrice;
    const estimatedImpactBps = Math.min(input.route.maxSlippageBps, haircutBps);
    const canExecute = estimatedOutput > 0 && input.route.maxSlippageBps <= 250;

    return {
      chainId,
      routeId: input.route.routeId,
      canExecute,
      estimatedOutput,
      estimatedValueUsd: effectiveOutputValue,
      estimatedImpactBps,
      executionNotes: [
        'Scaffold connector only.',
        `Venue ${input.route.venue} is simulated, not live.`,
        canExecute ? 'Route is eligible for future live adapter work.' : 'Route blocked by constraint or invalid sizing.',
      ],
    };
  },
  describeAvailability: () =>
    'SVM connector is scaffold-only. It exposes policy, route simulation and role surfaces for future live integration.',
});

export const fixtures = svmFixtures;
