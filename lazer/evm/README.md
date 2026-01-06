# Pyth Lazer EVM Examples

This directory contains Solidity smart contract examples demonstrating how to integrate Pyth Lazer price feeds into your Ethereum applications using Foundry.

## What is Pyth Lazer?

Pyth Lazer is a high-performance, low-latency price feed protocol that provides real-time financial market data to blockchain applications. Unlike traditional pull-based oracles, Pyth Lazer uses ECDSA signatures for fast verification and delivers sub-second price updates via WebSocket streams.

Key features of Pyth Lazer include support for multiple blockchain networks, a tri-state property system that distinguishes between present values, applicable but missing values, and not applicable properties, and support for various price feed properties including price, confidence, bid/ask prices, funding rates, and market session information.

## Prerequisites

Before running these examples, make sure you have the following installed:

- **Foundry** - [Installation Guide](https://book.getfoundry.sh/getting-started/installation)
- Basic understanding of Solidity and smart contracts

## Installation

1. Navigate to the `lazer/evm` directory:
   ```bash
   cd lazer/evm
   ```

2. Install dependencies:
   ```bash
   forge install
   ```

3. Build the contracts:
   ```bash
   forge build
   ```

## Contract Architecture

The example uses three main components from the Pyth Lazer SDK:

**PythLazer.sol** is the main contract that verifies ECDSA signatures from trusted signers. It manages trusted signer keys with expiration times and collects verification fees for each update.

**PythLazerLib.sol** is a library that provides parsing functions for Lazer payloads:

| Function | Use Case | When to Use |
|----------|----------|-------------|
| `parseUpdateFromPayload()` | High-level parsing | **Recommended for most integrations.** Returns a complete `Update` struct with all feeds and properties parsed. Easiest to use. |
| `parsePayloadHeader()` | Low-level parsing | Use when you need fine-grained control or want to optimize gas by parsing only specific parts of the payload. |
| `parseFeedHeader()` | Low-level parsing | Use with `parsePayloadHeader()` to iterate through feeds manually. Useful for gas optimization when you only need specific feeds. |
| `parseFeedProperty()` | Low-level parsing | Use to parse individual properties from a feed. Most granular control for advanced gas optimization. |

For most applications, use `parseUpdateFromPayload()` as it handles all the complexity for you. Only use the low-level functions if you have specific gas optimization requirements.

**PythLazerStructs.sol** defines the data structures used by the library, including the `Update` struct containing timestamp, channel, and feeds array, the `Feed` struct with all price properties and a tri-state map, and enums for `Channel`, `PriceFeedProperty`, `PropertyState`, and `MarketSession`.

## Examples

### ExampleReceiver Contract (`src/ExampleReceiver.sol`)

This contract demonstrates how to receive, parse, and log Pyth Lazer price updates using the high-level struct-based parsing and the `PythLazerLib` helper methods.

**Key Features:**
- Verifies Pyth Lazer signatures on-chain via the PythLazer contract
- Uses `parseUpdateFromPayload()` for clean, structured parsing
- Demonstrates the `hasX()`/`getX()` pattern to safely extract price feed properties
- Handles verification fees and refunds excess payments
- Logs all parsed price data for demonstration

**Main Function:**
```solidity
function updatePrice(bytes calldata update) public payable
```

This function performs the following steps:
1. Pays the verification fee to PythLazer and verifies the signature
2. Parses the payload into a structured `Update` object
3. Iterates through all feeds and logs their properties
4. Uses safe getter functions like `hasPrice()` and `getPrice()` to extract values

**Using PythLazerLib Helper Methods:**

The contract demonstrates the recommended pattern for safely extracting feed properties:

```solidity
// Use hasPrice/getPrice pattern to safely extract price
if (PythLazerLib.hasPrice(feed)) {
    int64 price = PythLazerLib.getPrice(feed);
}

// Use hasExponent/getExponent pattern to get decimal places
if (PythLazerLib.hasExponent(feed)) {
    int16 exponent = PythLazerLib.getExponent(feed);
}

// Use hasPublisherCount/getPublisherCount pattern for data quality
if (PythLazerLib.hasPublisherCount(feed)) {
    uint16 publisherCount = PythLazerLib.getPublisherCount(feed);
}

// Use hasConfidence/getConfidence pattern for confidence interval
if (PythLazerLib.hasConfidence(feed)) {
    uint64 confidence = PythLazerLib.getConfidence(feed);
}

// Use hasBestBidPrice/getBestBidPrice pattern for bid price
if (PythLazerLib.hasBestBidPrice(feed)) {
    int64 bestBidPrice = PythLazerLib.getBestBidPrice(feed);
}

// Use hasBestAskPrice/getBestAskPrice pattern for ask price
if (PythLazerLib.hasBestAskPrice(feed)) {
    int64 bestAskPrice = PythLazerLib.getBestAskPrice(feed);
}
```

### Test Suite (`test/ExampleReceiver.t.sol`)

Tests demonstrating the contract functionality with real signed price data.

**Test Cases:**
- `test_updatePrice_parseAndLog()` - Tests parsing and logging price data
- `test_revert_insufficientFee()` - Verifies fee requirement

**How to run:**
```bash
forge test -vvv
```

**Expected output:**
```
Timestamp: 1738270008001000
Channel: 1
Number of feeds: 1
--- Feed ID: 6 ---
Price: 100000000
Exponent: 8
(negative)
Publisher count: 1
```

## Understanding Price Data

Pyth Lazer prices use a fixed-point representation where the actual price equals the raw price multiplied by 10 raised to the power of the exponent.

**Example from the test:**
- Raw price: `100000000`
- Exponent: `-8`
- Actual price: `100000000 × 10^-8 = $1.00`

### Available Feed Properties

The `Feed` struct can contain the following properties, each with a tri-state indicating whether it's present, applicable but missing, or not applicable:

| Property | Type | Description |
|----------|------|-------------|
| Price | int64 | Main price value |
| BestBidPrice | int64 | Highest bid price in the market |
| BestAskPrice | int64 | Lowest ask price in the market |
| Exponent | int16 | Decimal exponent for price normalization |
| PublisherCount | uint16 | Number of publishers contributing to this price |
| Confidence | uint64 | Confidence interval (1 standard deviation) |
| FundingRate | int64 | Perpetual funding rate (optional) |
| FundingTimestamp | uint64 | Timestamp of funding rate (optional) |
| FundingRateInterval | uint64 | Funding rate interval in seconds (optional) |
| MarketSession | enum | Market session status (Regular, PreMarket, PostMarket, OverNight, Closed) |

### Tri-State Property System

Each property in a feed has a tri-state that indicates its availability:

- **Present**: The property has a valid value for this timestamp
- **ApplicableButMissing**: The property was requested but no value is available
- **NotApplicable**: The property was not included in this update

Use the `has*()` functions (e.g., `hasPrice()`, `hasExponent()`) to check if a property is present before accessing it with the `get*()` functions.

## Integration Guide

To integrate Pyth Lazer into your own contract:

### Step 1: Import the required contracts

```solidity
import {PythLazer} from "pyth-lazer/PythLazer.sol";
import {PythLazerLib} from "pyth-lazer/PythLazerLib.sol";
import {PythLazerStructs} from "pyth-lazer/PythLazerStructs.sol";
```

### Step 2: Store the PythLazer contract reference

```solidity
PythLazer public pythLazer;

constructor(address pythLazerAddress) {
    pythLazer = PythLazer(pythLazerAddress);
}
```

### Step 3: Verify updates and parse the payload

```solidity
function updatePrice(bytes calldata update) public payable {
    // Pay fee and verify signature
    uint256 fee = pythLazer.verification_fee();
    require(msg.value >= fee, "Insufficient fee");
    (bytes memory payload, ) = pythLazer.verifyUpdate{value: fee}(update);
    
    // Parse the payload using helper (converts memory to calldata)
    PythLazerStructs.Update memory parsedUpdate = this.parsePayload(payload);
    
    // Process feeds...
}

// Helper to convert memory bytes to calldata for the library
function parsePayload(bytes calldata payload) external pure returns (PythLazerStructs.Update memory) {
    return PythLazerLib.parseUpdateFromPayload(payload);
}
```

> **Note:** The `parsePayload` helper function is needed because `verifyUpdate()` returns `bytes memory`, but `PythLazerLib.parseUpdateFromPayload()` expects `bytes calldata`. The external call pattern converts memory to calldata.

### Step 4: Extract price data using safe getters

```solidity
for (uint256 i = 0; i < parsedUpdate.feeds.length; i++) {
    PythLazerStructs.Feed memory feed = parsedUpdate.feeds[i];
    uint32 feedId = PythLazerLib.getFeedId(feed);
    
    if (PythLazerLib.hasPrice(feed)) {
        int64 price = PythLazerLib.getPrice(feed);
    }
    if (PythLazerLib.hasExponent(feed)) {
        int16 exponent = PythLazerLib.getExponent(feed);
    }
    // ... extract other properties as needed
}
```

## Deployed Contract Addresses

For production deployments, use the official PythLazer contract addresses. You can find the latest addresses in the [Pyth Network documentation](https://docs.pyth.network/price-feeds/contract-addresses).

## Troubleshooting

### Common Issues

**Build Errors**: Make sure all dependencies are installed with `forge install`. If you see missing file errors, try updating the pyth-crosschain submodule:
```bash
cd lib/pyth-crosschain && git fetch origin && git checkout origin/main
```

**InvalidInitialization Error in Tests**: The PythLazer contract uses OpenZeppelin's upgradeable pattern. Deploy it via a TransparentUpgradeableProxy as shown in the test file.

**Gas Optimization**: For gas-sensitive applications, consider using the low-level parsing functions (`parsePayloadHeader`, `parseFeedHeader`, `parseFeedProperty`) to parse only the properties you need.

## Resources

- [Pyth Network Documentation](https://docs.pyth.network/)
- [Pyth Lazer Documentation](https://docs.pyth.network/lazer)
- [Foundry Book](https://book.getfoundry.sh/)
- [Pyth Crosschain Repository](https://github.com/pyth-network/pyth-crosschain)

## License

This project is licensed under the Apache-2.0 license.
