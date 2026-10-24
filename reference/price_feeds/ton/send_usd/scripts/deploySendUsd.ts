import { toNano, Address } from '@ton/core';
import { SendUsd } from '../wrappers/SendUsd';
import { compile, NetworkProvider } from '@ton/blueprint';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

export async function run(provider: NetworkProvider) {
    const PYTH_CONTRACT_ADDRESS = Address.parse(process.env.PYTH_CONTRACT_ADDRESS!);

    // Compile the contract
    const sendUsd = provider.open(
        SendUsd.createFromConfig(
            {
                pythAddress: PYTH_CONTRACT_ADDRESS,
            },
            await compile('SendUsd'),
        ),
    );

    // Deploy contract
    const deployAmount = toNano('0.001');
    await sendUsd.sendDeploy(provider.sender(), deployAmount);

    // Get the contract address
    const address = sendUsd.address;
    console.log('Deploy transaction sent, waiting for confirmation...');

    // Wait for deployment
    await provider.waitForDeploy(sendUsd.address);

    // Update .env file with new contract address
    const envPath = '.env';
    let envContent = fs.readFileSync(envPath, 'utf8');

    // Check if SEND_USD_CONTRACT_ADDRESS already exists
    if (envContent.includes('SEND_USD_CONTRACT_ADDRESS=')) {
        // Replace existing address
        envContent = envContent.replace(
            /SEND_USD_CONTRACT_ADDRESS=".+"/,
            `SEND_USD_CONTRACT_ADDRESS="${address.toString()}"`,
        );
    } else {
        // Add new address
        envContent += `\nSEND_USD_CONTRACT_ADDRESS="${address.toString()}"`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log('Contract address updated in .env file');
}
