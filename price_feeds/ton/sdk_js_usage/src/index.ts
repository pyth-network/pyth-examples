import { TonClient, Address, WalletContractV4 } from "@ton/ton";
import { toNano } from "@ton/core";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { HermesClient } from "@pythnetwork/hermes-client";
import {
  PythContract,
  PYTH_CONTRACT_ADDRESS_TESTNET,
} from "@pythnetwork/pyth-ton-js";

const BTC_PRICE_FEED_ID =
  "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";

async function main() {
  const client = new TonClient({
    endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
    apiKey: "your-api-key-here", // Optional, but note that without api-key you need to send requests once per second
  });

  const contractAddress = Address.parse(PYTH_CONTRACT_ADDRESS_TESTNET);
  const contract = client.open(PythContract.createFromAddress(contractAddress));

  const guardianSetIndex = await contract.getCurrentGuardianSetIndex();
  console.log("Guardian Set Index:", guardianSetIndex);

  const price = await contract.getPriceUnsafe(BTC_PRICE_FEED_ID);
  console.log("BTC Price from TON contract:", price);

  const hermesEndpoint = "https://hermes.pyth.network";
  const hermesClient = new HermesClient(hermesEndpoint);

  const priceIds = [BTC_PRICE_FEED_ID];
  const latestPriceUpdates = await hermesClient.getLatestPriceUpdates(
    priceIds,
    {
      encoding: "hex",
    }
  );
  console.log("Hermes BTC price:", latestPriceUpdates.parsed?.[0].price);

  const updateData = Buffer.from(latestPriceUpdates.binary.data[0], "hex");
  console.log("Update data:", updateData);

  const updateFee = await contract.getUpdateFee(updateData);
  console.log("Update fee:", updateFee);

  const mnemonic = "your mnemonic here";
  const key = await mnemonicToPrivateKey(mnemonic.split(" "));
  const wallet = WalletContractV4.create({
    publicKey: key.publicKey,
    workchain: 0,
  });
  const provider = client.open(wallet);

  await contract.sendUpdatePriceFeeds(
    provider.sender(key.secretKey),
    updateData,
    156000000 + Number(updateFee) // 156000000 = 390000 (estimated gas used for the transaction, this is defined in contracts/common/gas.fc as UPDATE_PRICE_FEEDS_GAS) * 400 (current settings in basechain are as follows: 1 unit of gas costs 400 nanotons)
  );
  console.log("Price feeds updated successfully.");
}

main().catch(console.error);