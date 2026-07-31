import { describe, expect, it } from 'vitest';
import { chainId, capabilities, createSvmConnector, executionConstraints, fixtures, roles } from '../src/index.js';

describe('@anaconda/svm', () => {
  it('exposes a scaffold-only capability matrix', () => {
    expect(chainId).toBe('svm');
    expect(capabilities.live).toBe(false);
    expect(capabilities.supportsAutoSwap).toBe(true);
    expect(executionConstraints.isLive).toBe(false);
    expect(roles).toEqual(['governance', 'risk_manager', 'keeper', 'viewer']);
  });

  it('simulates routes using the fixture surface', () => {
    const connector = createSvmConnector();
    const result = connector.simulateRoute({
      route: fixtures.route,
      amountIn: 10,
      fromAssetPrice: fixtures.simulationPrice.fromAssetPrice,
      toAssetPrice: fixtures.simulationPrice.toAssetPrice,
    });

    expect(result.chainId).toBe('svm');
    expect(result.canExecute).toBe(true);
    expect(result.estimatedOutput).toBeGreaterThan(0);
    expect(result.executionNotes[0]).toContain('Scaffold connector only.');
  });

  it('blocks invalid or too-wide routes in simulation', () => {
    const connector = createSvmConnector();
    const result = connector.simulateRoute({
      route: {
        ...fixtures.route,
        maxSlippageBps: 400,
      },
      amountIn: 0,
      fromAssetPrice: fixtures.simulationPrice.fromAssetPrice,
      toAssetPrice: fixtures.simulationPrice.toAssetPrice,
    });

    expect(result.canExecute).toBe(false);
  });

  it('rejects invalid pricing inputs', () => {
    const connector = createSvmConnector();
    const result = connector.simulateRoute({
      route: fixtures.route,
      amountIn: 10,
      fromAssetPrice: fixtures.simulationPrice.fromAssetPrice,
      toAssetPrice: 0,
    });

    expect(result.canExecute).toBe(false);
    expect(result.estimatedOutput).toBe(0);
    expect(result.executionNotes.some((note) => note.includes('Invalid toAssetPrice'))).toBe(true);
  });
});
