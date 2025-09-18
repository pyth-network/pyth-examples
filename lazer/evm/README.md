# Pyth Lazer EVM Examples

This directory contains Solidity smart contract examples demonstrating how to integrate Pyth Lazer price feeds into your Ethereum applications using Foundry.

## What is Pyth Lazer?

Pyth Lazer is a high-performance, low-latency price feed service that provides real-time financial market data to blockchain applications. It supports multiple blockchain networks and offers both JSON and binary message formats for optimal performance.

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

## Examples

### 1. ExampleReceiver Contract (`src/ExampleReceiver.sol`)
Demonstrates how to receive and process Pyth Lazer price updates in a smart contract.

**What it does:**
- Verifies Pyth Lazer signatures on-chain
- Parses price feed payloads to extract price data
- Handles verification fees and refunds excess payments
- Extracts multiple price feed properties (price, timestamps, exponents, etc.)
- Filters updates by feed ID and timestamp

**Key Functions:**
```solidity
function updatePrice(bytes calldata update) public payable
```

**How to run the test:**
```bash
forge test -v
```

### 2. Test Suite (`test/ExampleReceiver.t.sol`)
Comprehensive test demonstrating the contract functionality with real price data.

**What it does:**
- Sets up a PythLazer contract with trusted signer
- Creates and funds test accounts
- Submits a price update with verification fee
- Validates parsed price data and fee handling

**How to run:**
```bash
forge test -v
```

**Expected output:**
- **Timestamp**: `1738270008001000` (microseconds since Unix epoch)
- **Price**: `100000000` (raw price value)  
- **Exponent**: `-8` (price = 100000000 × 10^-8 = $1.00)
- **Publisher Count**: `1`

## Understanding Price Data

Pyth Lazer prices use a fixed-point representation:
```
actual_price = price × 10^exponent
```

**Example from the test:**
- Raw price: `100000000`
- Exponent: `-8`
- Actual price: `100000000 × 10^-8 = $1.00`

### Feed Properties

The contract can extract multiple price feed properties:

- **Price**: Main price value
- **BestBidPrice**: Highest bid price in the market
- **BestAskPrice**: Lowest ask price in the market
- **Exponent**: Decimal exponent for price normalization
- **PublisherCount**: Number of publishers contributing to this price

## Integration Guide

To integrate Pyth Lazer into your own contract:

1. **Import the required libraries:**
   ```solidity
   import {PythLazer} from "pyth-lazer/PythLazer.sol";
   import {PythLazerLib} from "pyth-lazer/PythLazerLib.sol";
   ```

2. **Set up the PythLazer contract:**
   ```solidity
   PythLazer pythLazer;
   constructor(address pythLazerAddress) {
       pythLazer = PythLazer(pythLazerAddress);
   }
   ```

3. **Handle verification fees:**
   ```solidity
   uint256 verification_fee = pythLazer.verification_fee();
   require(msg.value >= verification_fee, "Insufficient fee");
   ```

4. **Verify and parse updates:**
   ```solidity
   (bytes memory payload,) = pythLazer.verifyUpdate{value: verification_fee}(update);
   // Parse payload using PythLazerLib functions
   ```

## Configuration

### Feed IDs

The example filters for feed ID `6`. To use different feeds:

1. Update the feed ID check in `updatePrice()`:
   ```solidity
   if (feedId == YOUR_FEED_ID && _timestamp > timestamp) {
       // Update logic
   }
   ```

2. Obtain feed IDs from the Pyth Lazer documentation or API

## Troubleshooting

### Common Issues

1. **Build Errors**: Make sure all dependencies are installed with `forge install`

2. **Test Failures**: Ensure you're using a compatible Foundry version and all submodules are properly initialized

3. **Gas Issues**: The contract includes gas optimization for parsing multiple feed properties

## Resources

- [Pyth Network Documentation](https://docs.pyth.network/)
- [Foundry Book](https://book.getfoundry.sh/)
- [Pyth Lazer SDK](https://github.com/pyth-network/pyth-crosschain)

## License

This project is licensed under the Apache-2.0 license.