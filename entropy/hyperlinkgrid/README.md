# Hyperlinkgrid x Pyth Entropy Example

This project demonstrates how to use **Pyth Entropy** to generate secure, verifiable on-chain randomness in a Solidity smart contract.

The example is based on **Hyperlinkgrid**, a decentralized grid where users purchase tiles. Once the grid is full (sold out), Pyth Entropy is used to fairly select beneficiaries who split the accumulated pot.

## Features

- **ERC-721 NFT Grid**: Users buy tiles (NFTs) with USDC.
- **Pyth Entropy Integration**: Secure randomness generation for selecting winners.
- **Automated Payouts**: Winners are automatically paid out in USDC.

## Prerequisites

- Node.js (v18 or later)
- npm or pnpm

## Installation

1. Clone this repository and navigate to the directory.
2. Install dependencies:

```bash
npm install
```

## Project Structure

- `contracts/HyperlinkgridEntropy.sol`: The main contract integrating Pyth Entropy.
- `contracts/MockUSDC.sol`: A simple ERC20 token for testing payments.
- `contracts/mocks/EntropyMock.sol`: A mock of the Pyth Entropy contract for local testing.
- `test/HyperlinkgridEntropy.test.ts`: Hardhat tests demonstrating the full flow.

## How it Works

### 1. Purchase Phase
Users purchase tiles on the grid by paying 100 USDC. The USDC is held in the contract.

### 2. Triggering Randomness
Once `MAX_SUPPLY` (10 in this example) is reached, any user can call `triggerEndGame`.
This function:
- Requests a random number from the Pyth Entropy contract.
- Pays the required fee (in native ETH/GAS token).
- Stores the sequence number.

```solidity
uint64 seq = entropy.requestWithCallback{value: fee}(
    entropyProvider,
    userRandomNumber
);
```

### 3. Entropy Callback
Pyth's off-chain provider generates a random number and submits it back to the Entropy contract, which verifies it and calls `entropyCallback` on our contract.

```solidity
function entropyCallback(
    uint64 sequenceNumber,
    address provider,
    bytes32 randomNumber
) internal override {
    // Use randomNumber to select winners
}
```

We use the generated `randomNumber` to perform a Fisher-Yates shuffle and select unique winners from the pool of tile owners.

## Running Tests

To see the example in action, run the test suite:

```bash
npx hardhat test
```

This will:
1. Deploy the contracts (including mocks).
2. Simulate users buying all tiles.
3. Trigger the Pyth Entropy request.
4. Mock the provider callback.
5. Verify that winners were selected and funds distributed.

## Deployment (Base Sepolia)

To deploy to a live network like Base Sepolia:

1. Set up your `.env` file:
   ```
   PRIVATE_KEY=your_private_key
   ```

2. Deploy using Hardhat:
   ```bash
   npx hardhat run scripts/deploy.ts --network baseSepolia
   ```

   *Note: You will need to pass the actual Pyth Entropy addresses for the target network in the constructor.*

   **Base Sepolia Pyth Entropy Address**: `0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c`

## License

MIT
