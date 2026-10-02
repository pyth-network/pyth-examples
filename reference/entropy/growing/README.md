# NFT Growth with Pyth Entropy

This example demonstrates how to build an interactive NFT growth system using Pyth Entropy for verifiable randomness. The application combines smart contracts with a Next.js frontend to create an engaging experience where NFTs can "grow" and level up based on provably fair random outcomes.

## What This Example Does

The NFT Growth example showcases a game-like mechanic where users can mint NFTs and attempt to grow them through multiple levels. Each growth attempt uses Pyth Entropy to generate verifiable randomness, determining one of three possible outcomes:

- **Success (40% chance)**: The NFT levels up by 1
- **Failure (40% chance)**: The NFT remains at the current level
- **Death (20% chance)**: The NFT permanently dies and cannot grow further

NFTs start at level 1 and can grow up to level 5. Each growth attempt requires paying a fee to the Entropy provider and locks the NFT during the randomness request to prevent double-spending or race conditions. Once the random number is delivered via callback, the NFT is automatically unlocked and the result is applied.

### Key Components

**Smart Contracts** (`contract/`):
- **NFTGrowth.sol**: Main contract implementing the growth mechanics with Entropy integration. It extends a basic NFT contract and uses the `IEntropyConsumer` interface to receive random numbers via callbacks.
- **NFT.sol**: Base ERC721A NFT contract with ownership management and utilities.

**Frontend Application** (`app/`):
- Next.js 14 application built with React, Wagmi, Tailwind CSS, and shadcn/ui components.
- Provides an intuitive interface for minting NFTs and initiating growth attempts.
- Listens to blockchain events to update the UI in real-time as growth results are processed.

### How the Entropy Integration Works

1. **User Initiates Growth**: The user calls the `grow()` function with their NFT token ID and contributes user-generated randomness.

2. **Request Sent to Entropy**: The contract requests randomness from Pyth Entropy by calling `entropy.requestWithCallback()`, paying the required fee. The NFT is locked to prevent concurrent requests.

3. **Callback Delivers Randomness**: After the Entropy provider generates randomness, it calls back the contract's `entropyCallback()` function with the random number.

4. **Result Applied**: The contract uses the random number to determine the outcome (success, failure, or death), updates the NFT's state, unlocks it, and emits an event.

5. **Frontend Updates**: The application listens for the `NFTResult` event and updates the UI to show the user the outcome.

This commit-reveal pattern ensures that neither the user nor the contract can predict or manipulate the outcome, providing provably fair randomness for the growth mechanic.

## Project Structure

```
entropy/growing/
├── contract/           # Smart contracts built with Hardhat
│   ├── contracts/
│   │   ├── NFTGrowth.sol    # Main growth contract with Entropy integration
│   │   └── NFT.sol          # Base ERC721A NFT contract
│   ├── ignition/
│   │   └── modules/
│   │       └── App.ts       # Deployment configuration
│   ├── package.json
│   └── hardhat.config.ts
│
└── app/                # Next.js frontend application
    ├── app/
    │   └── (home)/
    │       └── page.tsx      # Main application page
    ├── components/           # UI components
    ├── contracts/            # Generated contract ABIs and types
    ├── providers/            # Wagmi and React Query providers
    ├── package.json
    └── wagmi.config.ts
```

## Prerequisites

Before running this example, ensure you have:

- **Node.js** (v18 or later)
- **Bun** package manager installed (https://bun.sh)
- A Web3 wallet (e.g., MetaMask) with funds on the target network
- Access to the Pyth Entropy service on your chosen network

## Running the Example

### Step 1: Deploy the Smart Contracts

Navigate to the contract directory and install dependencies:

```bash
cd contract
bun install
```

Deploy the contracts to Blast Sepolia testnet:

```bash
bunx hardhat ignition deploy ignition/modules/App.ts --network blast-sepolia --verify
```

The deployment script in `ignition/modules/App.ts` uses the following addresses:
- **Entropy Contract**: `0x98046Bd286715D3B0BC227Dd7a956b83D8978603`
- **Entropy Provider**: `0x6CC14824Ea2918f5De5C2f75A9Da968ad4BD6344`

After deployment, note the deployed contract address, as you'll need to update it in the frontend configuration.

### Step 2: Configure the Frontend

Navigate to the app directory and install dependencies:

```bash
cd ../app
bun install
```

Update the contract address in `contracts/addresses.ts` with your deployed contract address.

If deploying to a different network, also update:
- `config.ts` with the correct chain configuration
- `ignition/modules/App.ts` with the appropriate Entropy contract and provider addresses for your network

### Step 3: Run the Frontend

Start the development server:

```bash
bun dev
```

The application will be available at http://localhost:3000.

### Step 4: Interact with the Application

1. **Connect Wallet**: Click the wallet button to connect your Web3 wallet to the application.

2. **Mint an NFT**: Navigate to the "Mint" tab and click the mint button to create your first NFT. It will start at level 1.

3. **Grow Your NFT**: Switch to the "Grow" tab, select your NFT, and click "Grow" to attempt leveling it up. The application will prompt you to pay the Entropy fee.

4. **Wait for Results**: After submitting the transaction, wait for the Entropy callback to complete. The UI will update automatically when the result is available, showing whether your NFT succeeded, failed, or died.

5. **Unlock if Needed**: If a growth request gets stuck (e.g., the callback fails), you can manually unlock your NFT after 10 minutes using the unlock function.

## Key Contract Functions

### NFTGrowth Contract

- **`mint()`**: Mints a new NFT starting at level 1
- **`grow(uint256 tokenId, bytes32 userRandomNumber)`**: Initiates a growth request using Entropy randomness
- **`getGrowFee()`**: Returns the current fee required for a growth attempt
- **`unlock(uint256 tokenId)`**: Manually unlocks an NFT after the 10-minute lock period
- **`ownerUnlock(uint256 tokenId)`**: Owner-only function to unlock any NFT

### Events

- **`NftGrowthRequested`**: Emitted when a growth request is submitted
- **`NFTResult`**: Emitted when the Entropy callback completes with the growth result

## Development Notes

### Technology Stack

**Smart Contracts**:
- Solidity ^0.8.24
- Hardhat for development and deployment
- OpenZeppelin contracts for security
- ERC721A for gas-efficient NFT minting
- Pyth Entropy SDK for randomness

**Frontend**:
- Next.js 14 with App Router
- React 18
- Wagmi v2 for Ethereum interactions
- Viem for contract interactions
- TanStack React Query for state management
- Tailwind CSS for styling
- shadcn/ui for UI components

### Locking Mechanism

The contract implements a locking system to prevent callback spam and ensure sequential growth attempts. When a user initiates growth, the NFT is locked. The lock prevents new growth requests until either:
- The callback completes and automatically unlocks the NFT, or
- 10 minutes pass, allowing manual unlock

This ensures that each growth step completes before the next one begins, maintaining the integrity of the NFT's state.

### Testing Locally

To test the contracts without deploying:

```bash
cd contract
bunx hardhat test
```

For frontend development with a local blockchain:

1. Start a local Hardhat node: `bunx hardhat node`
2. Deploy contracts locally: `bunx hardhat ignition deploy ignition/modules/App.ts --network localhost`
3. Update the frontend configuration to use the local network
4. Run the frontend: `cd ../app && bun dev`

Note that testing with actual Entropy requires deploying to a network where Pyth Entropy is available, as the randomness provider operates off-chain.

## Supported Networks

This example is configured for **Blast Sepolia** testnet, but can be adapted for any EVM network that supports Pyth Entropy. You'll need to:

1. Find the Entropy contract and provider addresses for your target network in the Pyth documentation
2. Update `ignition/modules/App.ts` with the correct addresses
3. Configure the network in `hardhat.config.ts`
4. Update the frontend's `config.ts` with the chain configuration

For available networks and addresses, see the Pyth Entropy documentation at https://docs.pyth.network/entropy.

## Acknowledgments

This example was created by [lualabs.xyz](https://lualabs.xyz) to demonstrate the capabilities of Pyth Entropy for NFT gaming mechanics. It showcases how verifiable randomness can create fair and engaging on-chain experiences.

## Additional Resources

- **Pyth Entropy Documentation**: https://docs.pyth.network/entropy
- **Pyth Network**: https://pyth.network
- **Source Repository**: https://github.com/pyth-network/pyth-examples
