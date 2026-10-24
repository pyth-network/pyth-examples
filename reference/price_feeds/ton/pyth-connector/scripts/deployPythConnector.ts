import { toNano, Address } from '@ton/core';
import {makeEmptyIds, PythConnector} from '../wrappers/PythConnector';
import { compile, NetworkProvider } from '@ton/blueprint';
import * as dotenv from 'dotenv';

dotenv.config();

export async function run(provider: NetworkProvider) {
    const PYTH_CONTRACT_ADDRESS = Address.parse(process.env.PYTH_CONTRACT_ADDRESS!);

    // Compile the contract
    const pythConnector = provider.open(
        PythConnector.createFromConfig(
            {
                pythAddress: PYTH_CONTRACT_ADDRESS,
                ids: makeEmptyIds(),
            },
            await compile('PythConnector'),
        ),
    );

    // Deploy contract
    const deployAmount = toNano('0.001');
    await pythConnector.sendDeploy(provider.sender(), deployAmount);

    // Get the contract address
    const address = pythConnector.address;
    console.log('Deploy transaction sent, waiting for confirmation...');

    // Wait for deployment
    await provider.waitForDeploy(pythConnector.address);
    console.log(`PYTH_CONNECTOR_CONTRACT_ADDRESS="${address.toString()}"`);
}
