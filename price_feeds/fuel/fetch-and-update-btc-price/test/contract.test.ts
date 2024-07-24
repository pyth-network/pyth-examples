import { launchTestNode } from 'fuels/test-utils';
import { FuelError, WalletUnlocked } from 'fuels';

import { describe, test, expect } from 'vitest';

import { PythContractAbi__factory as CrosschainContractFactory } from '../src/pyth-crosschain-api';
import crossChainContractBytecode from '../src/pyth-crosschain-api/contracts/PythContractAbi.hex';

import { TestContractAbi__factory as ContractFactory } from '../src/sway-api';
import testContractBytecode from '../src/sway-api/contracts/TestContractAbi.hex';

describe('Contract', () => {
  const deployCrossChainContract = async (wallet: WalletUnlocked) => {
    const { waitForResult } = await CrosschainContractFactory.deployContract(crossChainContractBytecode, wallet);
    const { contract } = await waitForResult();
    return contract;
  };

  const deployContract = async (wallet: WalletUnlocked, pythContractId: string) => {
    const { waitForResult } = await ContractFactory.deployContract(testContractBytecode, wallet, { configurableConstants: {
      PYTH_CONTRACT_ID: pythContractId,
    }});
    const { contract } = await waitForResult();
    return contract;
  }

  test('Deploy and Call', async () => {
    using launched = await launchTestNode();
    const {
      wallets: [wallet],
      provider,
    } = launched;

    const crossChainContract = await deployCrossChainContract(wallet);
    const contract = await deployContract(wallet, crossChainContract.id.toB256());

    const updateData = [new Uint8Array([0x01, 0x02, 0x03, 0x04])];

    const { waitForResult: feeWaitForResult } = await contract.functions
      .update_fee(updateData).addContracts([crossChainContract]).call();
    const { value: fee } = await feeWaitForResult();
    expect(fee.toNumber()).toBe(0);

    const assetId = provider.getBaseAssetId();

    try { 
      await contract.functions.get_price(assetId).addContracts([crossChainContract]).get()
    }
    catch (error: unknown) {
      expect(error).toBeInstanceOf(FuelError);
      if (error instanceof FuelError) {
        expect(error.message).toBe(`The transaction reverted because a "require" statement has thrown "PriceFeedNotFound".`);
      }
    }
  });
});
