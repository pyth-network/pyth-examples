import {Account, Contract, RpcProvider, shortString} from 'starknet';
import {PriceServiceConnection} from '@pythnetwork/price-service-client';
import {
  ByteBuffer,
  ERC20_ABI,
  ETH_TOKEN_ADDRESS,
} from '@pythnetwork/pyth-starknet-js';
import {default as SEND_USD_ABI} from './abi/send_usd.json';

async function main() {
  // Create a provider for interacting with Starknet RPC.
  const provider = new RpcProvider({nodeUrl: 'http://127.0.0.1:5050/rpc'});
  console.log(
    'chain id: ',
    shortString.decodeShortString(await provider.getChainId())
  );
  console.log('rpc version: ', await provider.getSpecVersion());

  const destination = '0x42';

  const sendUsdAddress = process.env.SEND_USD_CONTRACT_ADDRESS;
  if (sendUsdAddress === undefined) {
    throw new Error('missing SEND_USD_CONTRACT_ADDRESS env var');
  }

  // Create a `Contract` instance to interact with ETH token contract on Starknet.
  const ethErc0Contract = new Contract(ERC20_ABI, ETH_TOKEN_ADDRESS, provider);

  // Create a `Contract` instance to interact with send_usd contract on Starknet.
  const sendUsdContract = new Contract(SEND_USD_ABI, sendUsdAddress, provider);

  // Import your account data from environment variables.
  // You'll need to set them before running the code.
  const privateKey0 = process.env.ACCOUNT_PRIVATE_KEY;
  if (privateKey0 === undefined) {
    throw new Error('missing ACCOUNT_PRIVATE_KEY');
  }
  const account0Address = process.env.ACCOUNT_ADDRESS;
  if (account0Address === undefined) {
    throw new Error('missing ACCOUNT_ADDRESS');
  }
  const account0 = new Account(provider, account0Address, privateKey0);

  const balanceInitial = await ethErc0Contract.balanceOf(account0Address);
  console.log('account0 balance:', balanceInitial);

  const initialDestinationBalance =
    await ethErc0Contract.balanceOf(destination);
  console.log('destination balance:', initialDestinationBalance);

  // Create a client for pulling price updates from Hermes.
  const connection = new PriceServiceConnection('https://hermes.pyth.network', {
    priceFeedRequestConfig: {
      // Provide this option to retrieve signed price updates for on-chain contracts.
      // Ignore this option for off-chain use.
      binary: true,
    },
  });

  const priceId =
    '0x6a182399ff70ccf3e06024898942028204125a819e519a335ffa4579e66cd870'; // STRK/USD

  console.log('querying pyth update');
  // Get the latest values of the price feeds as json objects.
  const currentPrices = await connection.getLatestPriceFeeds([priceId]);
  if (currentPrices === undefined) {
    throw new Error('failed to get prices');
  }
  console.log('current price:', currentPrices[0]);

  if (!currentPrices[0].vaa) {
    throw new Error('missing vaa in response');
  }

  // Convert the price update to Starknet format.
  const pythUpdate = ByteBuffer.fromBase64(currentPrices[0].vaa);

  // Allow send_usd contract to withdraw ETH.
  console.log('approving transfer');
  ethErc0Contract.connect(account0);
  let tx = await ethErc0Contract.approve(
    sendUsdAddress,
    '1000000000000000000000'
  );
  console.log('waiting for tx');
  await provider.waitForTransaction(tx.transaction_hash);

  sendUsdContract.connect(account0);

  // Create a transaction and submit to your contract using the price update data.
  console.log('invoking our contract');
  tx = await sendUsdContract.send_usd(destination, 10, pythUpdate);
  console.log('waiting for tx');
  await provider.waitForTransaction(tx.transaction_hash);

  const newDestinationBalance = await ethErc0Contract.balanceOf(destination);
  console.log('new destination balance:', newDestinationBalance);
  console.log(
    'destination balance change:',
    newDestinationBalance - initialDestinationBalance
  );
}

main();
