# Lottery with Pyth Entropy

This example demonstrates how to build a provably fair lottery application using Pyth Entropy for verifiable randomness. The application showcases a complete implementation where each lottery ticket draws its own random number from Entropy, and a winner is selected based on which ticket's random number is closest to a final target number.

## What This Example Does

The Lottery example implements a complete lottery system with three distinct phases:

### Phase 1: Ticket Sales (ACTIVE)
Users can purchase lottery tickets during the active phase. Each ticket purchase triggers a request to Pyth Entropy for a unique random number. The process works as follows:
- User pays the ticket price plus the Entropy fee
- Contract requests a random number from Pyth Entropy using `IEntropyV2.requestV2()`
- Each ticket is assigned a sequence number that uniquely identifies its random number request
- The ticket price is added to the prize pool

### Phase 2: Drawing (DRAWING)
When the lottery owner decides to end the lottery:
- The owner calls `endLottery()` which triggers one final random number request
- This final number serves as the "target" for determining the winner
- The contract status changes to DRAWING while waiting for the final random number

### Phase 3: Winner Selection (ENDED)
Once the final target random number is revealed through Entropy's callback:
- The contract automatically calculates which ticket's random number is closest to the target
- The winner is determined based on the absolute difference: `|ticket_random - target_random|`
- The winner can then claim the entire prize pool

### Key Features

**True Randomness Per Ticket**: Unlike simple lottery systems that draw one random number at the end, this implementation ensures each ticket gets its own verifiable random number from Pyth Entropy. This provides transparency and fairness, as all random numbers are generated independently and can be verified on-chain.

**Entropy V2 Integration**: The contract uses the latest `IEntropyV2` interface from Pyth, utilizing the simplified `requestV2()` method that leverages in-contract PRNG for user contribution.

**Automatic Winner Selection**: The winner is automatically determined when the final random number callback is received, eliminating the need for additional transactions.

**Complete Frontend**: A Next.js application with Web3 wallet integration allows users to buy tickets, view their tickets with real-time random number updates, and claim prizes.

## Project Structure

```
entropy/lottery/
├── contract/                 # Smart contracts built with Hardhat
│   ├── contracts/
│   │   └── Lottery.sol       # Main lottery contract with Entropy integration
│   ├── ignition/
│   │   └── modules/
│   │       └── Lottery.ts    # Deployment configuration
│   ├── package.json
│   └── hardhat.config.ts
│
├── app/                      # Next.js frontend application
│   ├── app/
│   │   ├── (home)/
│   │   │   ├── page.tsx              # Main lottery interface
│   │   │   └── components/           # Lottery-specific components
│   │   │       ├── buy-ticket.tsx    # Ticket purchase component
│   │   │       ├── my-tickets.tsx    # User tickets display
│   │   │       └── lottery-status.tsx # Lottery status and winner info
│   │   ├── layout.tsx        # App layout with providers
│   │   └── globals.css       # Global styles
│   ├── components/           # Reusable UI components
│   ├── contracts/            # Generated contract ABIs and types
│   ├── providers/            # Wagmi and React Query providers
│   ├── config.ts             # Chain configuration
│   └── package.json
│
└── README.md                 # This file
```

## Prerequisites

Before running this example, ensure you have:

- **Node.js** (v18 or later)
- **npm** or **bun** package manager
- A Web3 wallet (e.g., MetaMask) with testnet funds
- Access to a testnet where Pyth Entropy is deployed (e.g., Blast Sepolia, Optimism Sepolia, Arbitrum Sepolia)

## Running the Example

### Step 1: Deploy the Smart Contract

Navigate to the contract directory and install dependencies:

```bash
cd contract
npm install
```

Create a `.env` file in the contract directory with your wallet private key:

```env
WALLET_KEY=your_private_key_here
BLAST_SCAN_API_KEY=your_api_key_here  # Optional, for verification
```

Deploy the contract to Blast Sepolia testnet:

```bash
npx hardhat ignition deploy ignition/modules/Lottery.ts --network blast-sepolia --verify
```

The deployment module is configured with:
- **Entropy Contract**: `0x98046Bd286715D3B0BC227Dd7a956b83D8978603` (Blast Sepolia)
- **Entropy Provider**: `0x6CC14824Ea2918f5De5C2f75A9Da968ad4BD6344`
- **Ticket Price**: 0.001 ETH

After deployment, note the deployed contract address. You'll need to update this in the frontend.

### Step 2: Configure the Frontend

Navigate to the app directory and install dependencies:

```bash
cd ../app
npm install
```

Update the contract address in `contracts/addresses.ts` with your deployed contract address:

```typescript
export const lotteryAddress = "YOUR_DEPLOYED_CONTRACT_ADDRESS" as const;
```

Generate the contract types for TypeScript:

```bash
npx wagmi generate
```

### Step 3: Run the Frontend

Start the development server:

```bash
npm run dev
```

The application will be available at http://localhost:3000.

### Step 4: Interact with the Lottery

1. **Connect Wallet**: Click the wallet button to connect your Web3 wallet (make sure you're on the correct network)

2. **Buy Tickets**: In the "Buy Tickets" tab, purchase one or more lottery tickets. Each purchase will:
   - Charge you the ticket price (0.001 ETH) plus the Entropy fee
   - Request a random number from Pyth Entropy
   - Show your ticket with a "Waiting for random number..." status

3. **View Your Tickets**: Switch to the "My Tickets" tab to see all your purchased tickets. Once the Entropy callback completes (usually within a few seconds), you'll see the random number assigned to each ticket.

4. **End the Lottery** (Owner Only): If you're the contract owner, you can end the lottery after tickets have been sold. This triggers the final random number draw to determine the winner.

5. **Claim Prize**: If you're the winner, a "Claim Your Prize!" button will appear in the Lottery Status card. Click it to transfer the entire prize pool to your wallet.

## How It Works: Technical Details

### Smart Contract Architecture

The `Lottery.sol` contract implements the `IEntropyConsumer` interface to receive callbacks from Pyth Entropy:

```solidity
contract Lottery is IEntropyConsumer, Ownable, ReentrancyGuard {
    // Lottery states: ACTIVE -> DRAWING -> ENDED
    enum LotteryStatus { ACTIVE, DRAWING, ENDED }
    
    // Each ticket stores its buyer, sequence number, and random number
    struct Ticket {
        address buyer;
        uint64 sequenceNumber;
        bytes32 randomNumber;
        bool fulfilled;
    }
    
    // ...
}
```

### Buying a Ticket

When a user buys a ticket, the contract:

1. Validates the lottery is in ACTIVE status
2. Checks sufficient payment (ticket price + entropy fee)
3. Calls `entropy.requestV2()` to request a random number
4. Stores the ticket with its sequence number
5. Adds the ticket price to the prize pool

```solidity
function buyTicket() external payable nonReentrant {
    // ... validation ...
    
    uint64 sequenceNumber = entropy.requestV2{value: entropyFee}();
    
    tickets[ticketId] = Ticket({
        buyer: msg.sender,
        sequenceNumber: sequenceNumber,
        randomNumber: bytes32(0),
        fulfilled: false
    });
    
    // ...
}
```

### Entropy Callback

The Pyth Entropy protocol calls back the contract with random numbers:

```solidity
function entropyCallback(
    uint64 sequenceNumber,
    address,
    bytes32 randomNumber
) internal override {
    if (sequenceNumber == winningSequenceNumber) {
        // This is the final winning target number
        winningTargetNumber = randomNumber;
        
        // Find the ticket closest to the target
        for (uint256 i = 0; i < ticketCount; i++) {
            if (tickets[i].fulfilled) {
                uint256 difference = _calculateDifference(
                    tickets[i].randomNumber,
                    winningTargetNumber
                );
                // Track the closest ticket...
            }
        }
        
        status = LotteryStatus.ENDED;
    } else {
        // This is a ticket's random number
        uint256 ticketId = sequenceToTicketId[sequenceNumber];
        tickets[ticketId].randomNumber = randomNumber;
        tickets[ticketId].fulfilled = true;
    }
}
```

### Winner Determination

The winner is determined by calculating which ticket's random number has the smallest absolute difference from the target:

```solidity
function _calculateDifference(bytes32 a, bytes32 b) private pure returns (uint256) {
    uint256 aValue = uint256(a);
    uint256 bValue = uint256(b);
    return aValue > bValue ? aValue - bValue : bValue - aValue;
}
```

### Frontend Implementation

The frontend uses Wagmi v2 for Web3 interactions and React Query for state management:

- **BuyTicket Component**: Handles ticket purchases and displays the cost
- **MyTickets Component**: Lists user's tickets with real-time status updates
- **LotteryStatus Component**: Shows prize pool, ticket count, and winner information

The app automatically listens for blockchain events to update the UI when random numbers are revealed or the lottery ends.

## Supported Networks

This example is configured for multiple testnets:

- **Blast Sepolia** (default in deployment)
- **Optimism Sepolia**
- **Arbitrum Sepolia**

To deploy to a different network:

1. Find the Entropy contract and provider addresses for your target network at https://docs.pyth.network/entropy
2. Update `ignition/modules/Lottery.ts` with the correct addresses
3. Ensure the network is configured in `hardhat.config.ts` and `app/config.ts`
4. Deploy using `--network <network-name>`

## Security Considerations

**Randomness Source**: This implementation uses `IEntropyV2.requestV2()` without a user-provided random number. This method uses in-contract PRNG for the user contribution, which means you trust the validator to honestly generate random numbers. For applications requiring stronger guarantees against validator collusion, consider using the variant that accepts a `userRandomNumber` parameter.

**Reentrancy Protection**: The contract uses OpenZeppelin's `ReentrancyGuard` to prevent reentrancy attacks on critical functions like `buyTicket()` and `claimPrize()`.

**Access Control**: Only the contract owner can end the lottery using the `endLottery()` function, preventing premature lottery closures.

## Development Notes

### Technology Stack

**Smart Contracts**:
- Solidity ^0.8.24
- Hardhat for development and deployment
- OpenZeppelin contracts for security
- Pyth Entropy SDK v2.0.0 for randomness

**Frontend**:
- Next.js 14 with App Router
- React 18
- Wagmi v2 for Ethereum interactions
- Viem for contract interactions
- TanStack React Query for state management
- Tailwind CSS with shadcn/ui components

### Testing

To test the contract compilation:

```bash
cd contract
npx hardhat compile
```

To build the frontend:

```bash
cd app
npm run build
```

### Customization

You can customize the lottery parameters by modifying `ignition/modules/Lottery.ts`:

```typescript
const TicketPrice = parseEther("0.001");  // Change ticket price
```

You can also modify the contract to add features like:
- Multiple lottery rounds
- Automatic lottery duration limits
- Multiple winners or prize distribution
- Minimum ticket requirements

## Gas Costs

Approximate gas costs on testnets:

- **Deploy Contract**: ~2,000,000 gas
- **Buy Ticket**: ~150,000 gas (includes Entropy fee)
- **End Lottery**: ~100,000 gas (includes Entropy fee)
- **Claim Prize**: ~50,000 gas

Note: Gas costs vary by network and include the Entropy provider fee for randomness generation.

## Troubleshooting

### Common Issues

**"Lottery not active" error**: The lottery has already ended or is in drawing phase. Wait for a new round.

**"Insufficient fee" error**: Make sure you're sending enough ETH to cover both the ticket price and the Entropy fee. Use `getTotalCost()` to check the required amount.

**Random number not appearing**: Entropy callbacks typically complete within a few seconds, but may take longer during network congestion. Check the blockchain explorer for the callback transaction.

**Wallet not connecting**: Ensure your wallet is on the correct network (e.g., Blast Sepolia). The app will prompt you to switch networks if needed.

## Additional Resources

- **Pyth Entropy Documentation**: https://docs.pyth.network/entropy
- **IEntropyV2 Interface**: https://github.com/pyth-network/pyth-crosschain/blob/main/target_chains/ethereum/entropy_sdk/solidity/IEntropyV2.sol
- **Pyth Network**: https://pyth.network
- **Source Repository**: https://github.com/pyth-network/pyth-examples

## License

This example is provided under the MIT License.
