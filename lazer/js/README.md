# Pyth Lazer SDK Example

This example demonstrates how to use the Pyth Lazer SDK to subscribe to real-time price feed data from the Pyth network.

## Prerequisites

Before running this example, make sure you have the following:

- Node.js installed (version 14 or higher)
- A Pyth Lazer access token (replace `"YOUR_ACCESS_TOKEN"` in the code with your actual token).Please fill out [this form](https://tally.so/r/nP2lG5) to contact the Pyth team and get the access token.

## Installation

Install the dependencies: 
```bash
npm install
```

## Usage

Please put your access token in the `src/index.ts` file.

```js
const client = await PythLazerClient.create(
    ["wss://pyth-lazer-staging.dourolabs.app/v1/stream"],
    "YOUR_ACCESS_TOKEN", // replace with your access token
  );
```

To run the example, use the following command:
```bash
npm start
```

The example will connect to the Pyth Lazer staging environment using the provided WebSocket URL and access token. It will then subscribe to price feed data for the specified `priceFeedIds` (in this case, IDs 1 and 2) and log the received messages to the console. Get the lazer price feed ids from the [Pyth Price Feeds](https://docs.pyth.network/lazer/price-feed-ids) documentation page.

You can customize the `priceFeedIds`, `properties`, `chains`, and other subscription options according to your requirements.
To know more about the subscription options, please refer to the [Pyth Lazer SDK Documentation](https://docs.pyth.network/lazer/subscribe-price-updates#2-adjust-subscription-parameters).

## Output

The example will output the received messages to the console, including:
- JSON messages with the subscription ID and parsed price feed data
- Binary messages with the raw binary data for Solana and EVM messages

Example output:
```
got message: {
  type: 'json',
  value: {
    type: 'streamUpdated',
    subscriptionId: 1,
    parsed: { timestampUs: '1737058486600000', priceFeeds: [Array] },
    solana: {
      encoding: 'hex',
      data: 'b9011a8254e9654152b8a69a070649239be1f06b5eb40f951026ec963fb14cae3d58178457e8b5e0fd5b228e34282e4bf5d6b3cf946e1a5b9e2e93656b34512da4f8b00ff65210bee4fcf5b1cee1e537fabcfd95010297653b94af04d454fc473e94834f2a0075d3c79340410c72d82b06000302010000000100d22071f6210900000200000001007f66eec54d000000'
    }
  }
}
stream updated for subscription 1 : [
  { priceFeedId: 1, price: '10041473179858' },
  { priceFeedId: 2, price: '334033217151' }
]
```

## Resources

- [Pyth Lazer Documentation](https://docs.pyth.network/lazer)
- [Pyth Network Website](https://pyth.network/)
- [Pyth Price Feeds](https://docs.pyth.network/lazer/price-feed-ids)
- [Lazer API Reference](https://pyth-lazer.dourolabs.app/docs)