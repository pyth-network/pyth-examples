import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";

const main = async () => {
  const client = await PythLazerClient.create({
    urls: ["wss://pyth-lazer.dourolabs.app/v1/stream"],
    token: process.env.ACCESS_TOKEN!,
  });

  client.addMessageListener((message) => {
    console.log("got message:", message);
    switch (message.type) {
      case "json": {
        if (message.value.type == "streamUpdated") {
          console.log(
            "stream updated for subscription",
            message.value.subscriptionId,
            ":",
            message.value.parsed?.priceFeeds,
          );
        }
        break;
      }
      case "binary": {
        if ("solana" in message.value) {
          console.log("solana message:", message.value.solana?.toString("hex"));
        }
        if ("evm" in message.value) {
          console.log("evm message:", message.value.evm?.toString("hex"));
        }
        break;
      }
    }
  });

  client.addAllConnectionsDownListener(() => {
    console.log("All connections are down");
  });

  client.subscribe({
    type: "subscribe",
    subscriptionId: 1,
    priceFeedIds: [1, 2],
    properties: ["price"],
    formats: ["solana"],
    deliveryFormat: "json",
    channel: "fixed_rate@200ms",
    jsonBinaryEncoding: "hex",
  });

  // shutdown client after 10 seconds
  setTimeout(() => client.shutdown(), 10000);
};

main();
