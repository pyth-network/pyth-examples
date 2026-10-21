# Pharos Raffle

A decentralized raffle system powered by Pyth Entropy for provably fair randomness.

## What This Example Does

The Pharos Raffle system enables users to create and participate in raffles with verifiable randomness. Each raffle uses Pyth Entropy to ensure fair winner selection through a commit-reveal scheme that prevents manipulation.

### Key Features

- **Create Raffles**: Set up raffles with custom parameters (prize type, ticket price, duration, etc.)
- **Provably Fair**: Uses Pyth Entropy for verifiable random number generation
- **Multiple Prize Types**: Support for crypto prizes (PYUSD), physical items, and digital assets
- **Factory Pattern**: Efficient contract deployment through the factory pattern
- **Frontend Interface**: Next.js application for easy interaction

### How the Entropy Integration Works

1. **User Purchases Tickets**: Buy PYUSD-backed tickets for a raffle
2. **Raffle Closes**: When time expires or max tickets reached, the raffle closes
3. **Randomness Request**: Contract requests randomness from Pyth Entropy with a commitment
4. **Callback Delivery**: Entropy provider calls back with random number
5. **Winner Selection**: Contract uses weighted randomness (based on ticket count) to select winner
6. **Prize Distribution**: Winner receives crypto prize, or funds go to admin for physical/digital fulfillment

## Project Structure

```
entropy/Pharos/
├── contract/           # Smart contracts built with Hardhat
│   ├── contracts/
│   │   ├── RaffleFactory.sol    # Factory contract for creating raffles
│   │   ├── Raffle.sol           # Main raffle contract with Entropy integration
│   │   └── MockPYUSD.sol        # Mock PYUSD token for testing
│   ├── ignition/
│   │   └── modules/
│   │       └── App.ts           # Deployment configuration
│   ├── package.json
│   └── hardhat.config.ts
│
└── app/                # Next.js frontend application
    ├── app/
    │   └── page.tsx             # Main application page
    ├── components/              # UI components
    ├── contracts/               # Generated contract ABIs and types
    ├── providers/               # Wagmi and React Query providers
    ├── package.json
    └── wagmi.config.ts
```

## Prerequisites

Before running this example, ensure you have:

- **Node.js** (v18 or later)
- A Web3 wallet (e.g., MetaMask) with funds on the target network
- Access to the Pyth Entropy service on your chosen network

## Running the Example

### Step 1: Deploy the Smart Contracts

Navigate to the contract directory and install dependencies:

```bash
cd contract
npm install
```

Create a `.env` file with your private key and API key:

```bash
WALLET_KEY=your_private_key_here
BLAST_SCAN_API_KEY=your_api_key_here
```

Deploy the contracts to Blast Sepolia testnet:

```bash
npm run deploy
```

After deployment, note the deployed contract addresses, as you'll need to update them in the frontend configuration.

### Step 2: Configure the Frontend

Navigate to the app directory and install dependencies:

```bash
cd ../app
npm install
```

Update the contract addresses in `contracts/addresses.ts` with your deployed contract addresses.

If deploying to a different network, also update:
- `config.ts` with the correct chain configuration
- `ignition/modules/App.ts` with the appropriate Entropy contract and provider addresses for your network

### Step 3: Run the Frontend

Start the development server:

```bash
npm run dev
```

The application will be available at http://localhost:3000.

### Step 4: Interact with the Application

1. **Get Test Tokens**: Use the MockPYUSD contract to get test PYUSD tokens
2. **Deposit ETH**: Deposit ETH to the factory for entropy fees
3. **Create Raffle**: Create a new raffle with your desired parameters
4. **Buy Tickets**: Purchase tickets to participate in raffles
5. **Close Raffle**: Wait for the raffle to close (time expires or max tickets reached)
6. **Winner Selection**: Random winner is selected and prize is distributed

## Key Contract Functions

### RaffleFactory Contract

- **`createRaffle()`**: Creates a new raffle with specified parameters
- **`depositETH()`**: Deposit ETH to the factory for entropy fees
- **`getRaffles()`**: Get list of all created raffles

### Raffle Contract

- **`buyTicket(uint256 numTickets)`**: Purchase raffle tickets with PYUSD
- **`closeIfReady()`**: Automatically close raffle when ready and request randomness
- **`distributePrize()`**: Distribute prize to winner after selection

### Events

- **`RaffleCreated`**: Emitted when a new raffle is created
- **`TicketPurchased`**: Emitted when tickets are purchased
- **`WinnerSelected`**: Emitted when the winner is selected
- **`PrizeDistributed`**: Emitted when the prize is distributed

## Development Notes

### Technology Stack

**Smart Contracts**:
- Solidity ^0.8.20
- Hardhat for development and deployment
- OpenZeppelin contracts for security
- Pyth Entropy SDK for randomness

**Frontend**:
- Next.js 14 with App Router
- React 18
- Wagmi v2 for Ethereum interactions
- Viem for contract interactions
- TanStack React Query for state management
- Tailwind CSS for styling
- shadcn/ui for UI components

### Raffle Parameters

- **Prize Type**: Crypto, Physical, or Digital
- **Prize Amount**: Amount of PYUSD (for crypto) or description for physical/digital
- **Ticket Price**: Cost per ticket in PYUSD
- **Max Tickets**: Maximum number of tickets that can be sold
- **Max Tickets Per User**: Per-user ticket limit to prevent 51% attacks
- **Start Time**: Unix timestamp when raffle starts
- **End Time**: Unix timestamp when raffle ends
- **House Fee**: Percentage fee (in basis points, e.g., 300 = 3%)

### Testing Locally

To test the contracts without deploying:

```bash
cd contract
npm test
```

For frontend development with a local blockchain:

1. Start a local Hardhat node: `npx hardhat node`
2. Deploy contracts locally: `npm run deploy:local`
3. Update the frontend configuration to use the local network
4. Run the frontend: `cd ../app && npm run dev`

Note that testing with actual Entropy requires deploying to a network where Pyth Entropy is available.

## Supported Networks

This example is configured for **Blast Sepolia** testnet, but can be adapted for any EVM network that supports Pyth Entropy. You'll need to:

1. Find the Entropy contract and provider addresses for your target network in the Pyth documentation
2. Update `ignition/modules/App.ts` with the correct addresses
3. Configure the network in `hardhat.config.ts`
4. Update the frontend's `config.ts` with the chain configuration

For available networks and addresses, see the Pyth Entropy documentation at https://docs.pyth.network/entropy.

## Acknowledgments

This example demonstrates how Pyth Entropy can be used to create provably fair raffle systems with verifiable randomness.

## Additional Resources

- **Pyth Entropy Documentation**: https://docs.pyth.network/entropy
- **Pyth Network**: https://pyth.network
- **Source Repository**: https://github.com/pyth-network/pyth-examples

