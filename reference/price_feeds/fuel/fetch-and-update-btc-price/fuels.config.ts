import { createConfig } from 'fuels';
import dotenv from 'dotenv';

dotenv.config({
  path: ['.env.local', '.env'],
});

export default createConfig({
  contracts: ['./sway-programs/contract'],
  output: './src/sway-api',
  providerUrl: 'https://testnet.fuel.network/v1/graphql',
  privateKey: process.env.PRIVATE_KEY,
  forcBuildFlags: ['--release'],
});
