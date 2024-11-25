import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";

/* eslint-disable no-console */
const client = new PythLazerClient("wss://pyth-lazer-staging.dourolabs.app/v1/stream", "my_token");
client.addMessageListener((message) => {
  console.log("got message:", message);
  switch (message.type) {
    case "json": {
      if (message.value.type == "streamUpdated") {
        console.log(
          "stream updated for subscription",
          message.value.subscriptionId,
          ":",
          message.value.parsed?.priceFeeds
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
client.ws.addEventListener("open", () => {
  client.send({
    type: "subscribe",
    subscriptionId: 1,
    priceFeedIds: [1, 2],
    properties: ["price"],
    chains: ["solana"],
    deliveryFormat: "json",
    channel: "fixed_rate@200ms",
    jsonBinaryEncoding: "hex",
  });
});
