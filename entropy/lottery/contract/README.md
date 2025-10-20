# Lottery Smart Contract

This directory contains the Solidity smart contracts for the lottery application.

## Contract Overview

The `Lottery.sol` contract implements a provably fair lottery system using Pyth Entropy for verifiable randomness. Each ticket purchase triggers a unique random number request, and the winner is determined by which ticket's random number is closest to a final target number.

## Key Features

- Uses Pyth Entropy V2 (`IEntropyV2`) for on-chain verifiable randomness
- Each ticket gets its own random number from Entropy
- Automatic winner selection based on closest random number match
- Built with OpenZeppelin contracts for security (Ownable, ReentrancyGuard)
- Supports multiple testnets (Blast Sepolia, Optimism Sepolia, Arbitrum Sepolia)

## Setup

Install dependencies:

```bash
npm install
```

## Deployment

Create a `.env` file with your configuration:

```env
WALLET_KEY=your_private_key_here
BLAST_SCAN_API_KEY=your_blast_api_key  # Optional
```

Deploy to Blast Sepolia:

```bash
npx hardhat ignition deploy ignition/modules/Lottery.ts --network blast-sepolia --verify
```

Deploy to other networks:

```bash
npx hardhat ignition deploy ignition/modules/Lottery.ts --network optimism-sepolia
npx hardhat ignition deploy ignition/modules/Lottery.ts --network arbitrum-sepolia
```

## Contract Functions

### User Functions

- `buyTicket()`: Purchase a lottery ticket (payable)
- `claimPrize()`: Claim prize if you're the winner
- `getUserTickets(address)`: Get all ticket IDs for a user
- `getTicket(uint256)`: Get details of a specific ticket
- `getTotalCost()`: Get total cost (ticket price + Entropy fee)

### Owner Functions

- `endLottery()`: End the lottery and trigger winner selection (owner only)

### View Functions

- `status()`: Current lottery status (ACTIVE, DRAWING, ENDED)
- `prizePool()`: Total prize pool amount
- `ticketCount()`: Number of tickets sold
- `getWinnerAddress()`: Address of the winner (if lottery ended)
- `winningTicketId()`: ID of the winning ticket
- `prizeClaimed()`: Whether the prize has been claimed

## Configuration

The deployment is configured in `ignition/modules/Lottery.ts`:

```typescript
const EntropyAddress = "0x98046Bd286715D3B0BC227Dd7a956b83D8978603";  // Blast Sepolia
const ProviderAddress = "0x6CC14824Ea2918f5De5C2f75A9Da968ad4BD6344";
const TicketPrice = parseEther("0.001");
```

Update these addresses for different networks. See [Pyth Entropy Documentation](https://docs.pyth.network/entropy) for addresses on other chains.

## Compile

```bash
npx hardhat compile
```

## Testing

The contract can be tested locally with Hardhat's built-in network. Future enhancements could include comprehensive test suites.

## License

MIT
