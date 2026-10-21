# RaffleForGood - Decentralized Raffle System with Pyth Entropy

> A transparent crowdfunding platform that gamifies donations through blockchain-based raffles using Pyth Entropy for verifiable randomness.

## 🎯 Overview

RaffleForGood transforms traditional crowdfunding by creating raffles where participants buy tickets to support projects while having a chance to win prizes. The system uses **Pyth Entropy** to ensure fair and verifiable random winner selection.

## ✨ Key Features

- **Pyth Entropy Integration**: Verifiable random number generation for fair winner selection
- **Factory Pattern**: Easy raffle creation without code
- **Gas Optimized**: Binary search O(log n) for winner selection
- **Secure**: OpenZeppelin's PullPayment pattern for fund distribution
- **Transparent**: All operations on-chain and auditable
- **Low Fees**: Only 0.05% platform fee

## 🏗️ Architecture

```
User → RaffleFactory.createRaffle()
  ↓
ProjectRaffle Contract
  ↓
buyTickets() → Pyth Entropy Request → entropyCallback()
  ↓
Winner Selection (Binary Search) → Fund Distribution
```

## 📋 Contracts

### `ProjectRaffle.sol`
Main raffle contract that:
- Manages ticket purchases (1 wei = 1 ticket)
- Requests randomness from Pyth Entropy
- Selects winner using binary search
- Distributes funds via pull payment pattern

### `RaffleFactory.sol`
Factory contract for creating multiple raffles with custom parameters.

### Pyth Entropy Integration

```solidity
// Request entropy
function requestEntropy(bytes32 userRandomNumber) external payable {
    uint256 fee = entropy.getFee(entropyProvider);
    entropySequenceNumber = entropy.request{value: fee}(
        entropyProvider,
        userRandomNumber,
        true // use blockhash
    );
}

// Receive callback
function entropyCallback(
    uint64 sequenceNumber,
    address provider,
    bytes32 randomNumber
) external override {
    require(msg.sender == address(entropy), "Only entropy contract");
    winner = _selectWinner(randomNumber);
    state = RaffleState.DrawExecuted;
}
```

## 🚀 Deployment

### Prerequisites

```bash
npm install
```

### Environment Variables

Create `.env`:
```env
PRIVATE_KEY=your_private_key
BASE_SEPOLIA_RPC_URL=your_rpc_url
ENTROPY_ADDRESS=0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c
```

### Deploy Factory

```bash
npx hardhat ignition deploy ignition/modules/RaffleFactoryModule.ts --network baseSepolia
```

### Create a Raffle

```bash
npx tsx scripts/createNewRaffle.ts
```

## 📖 Usage Example

### 1. Create Raffle
```typescript
const tx = await factory.createRaffle(
  "Save the Ocean",           // name
  "Help clean our oceans",    // description
  3000,                        // 30% for project
  projectAddress,              // beneficiary
  604800                       // 7 days duration
);
```

### 2. Buy Tickets
```typescript
await raffle.buyTickets({ value: parseEther("0.01") });
```

### 3. Close Raffle & Select Winner
```typescript
// Request entropy (owner/admin only)
await raffle.requestEntropy(randomBytes32, { value: entropyFee });

// Pyth calls entropyCallback() automatically
// Winner is selected using binary search
```

### 4. Distribute Funds
```typescript
await raffle.distributeFunds();
// Beneficiaries withdraw with withdrawPayments()
```

## 🧪 Testing

```bash
npm test
```

Tests include:
- Ticket purchasing and range calculation
- Entropy request and callback simulation
- Winner selection accuracy
- Fund distribution correctness
- Edge cases and security scenarios

## 🎲 Pyth Entropy Benefits

1. **Verifiable Randomness**: Cryptographically secure and verifiable on-chain
2. **Tamper-Proof**: No party can manipulate the outcome
3. **Cost-Effective**: Low fee (~0.0001 ETH per request)
4. **Fast**: Callback within 2-5 minutes
5. **Reliable**: Backed by Pyth's oracle network

## 📊 Live Deployment

- **Network**: Base Sepolia
- **Factory**: `0x104032d5377be9b78441551e169f3C8a3d520672`
- **Entropy**: `0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c`
- **Active Raffles**: 10+

## 🔐 Security Features

- ReentrancyGuard on all state-changing functions
- PullPayment pattern prevents reentrancy in withdrawals
- Only authorized addresses can request entropy
- Time-locked raffle closure (optional)
- Comprehensive input validation

## 💡 Use Cases

- **Open Source Projects**: Fund development while rewarding community
- **Social Causes**: Transparent fundraising for NGOs
- **Content Creators**: Monetize audience without ads
- **Web3 Startups**: Community-driven fundraising with incentives

## 🛠️ Technical Highlights

### Binary Search Winner Selection

```solidity
function _selectWinner(bytes32 entropySeed) internal view returns (address) {
    uint256 randomTicket = uint256(entropySeed) % totalTickets;
    
    uint256 left = 0;
    uint256 right = participants.length - 1;
    
    while (left < right) {
        uint256 mid = (left + right) / 2;
        if (participants[mid].upperBound > randomTicket) {
            right = mid;
        } else {
            left = mid + 1;
        }
    }
    
    return participants[left].owner;
}
```

This O(log n) algorithm efficiently finds winners even with millions of participants.

## 📈 Project Structure

```
contract/
├── contracts/
│   ├── ProjectRaffle.sol          # Main raffle logic
│   ├── RaffleFactory.sol          # Factory for creating raffles
│   └── interfaces/
│       ├── IEntropyConsumer.sol   # Pyth callback interface
│       └── IEntropyV2.sol         # Pyth entropy interface
├── scripts/
│   ├── createNewRaffle.ts         # Deploy new raffle
│   ├── buyTickets.ts              # Purchase tickets
│   ├── closeRaffle.ts             # Request entropy & close
│   ├── distributeFunds.ts         # Distribute winnings
│   └── listRaffles.ts             # List all raffles
├── hardhat.config.ts
├── package.json
└── tsconfig.json
```

## 🔄 Raffle Lifecycle

1. **Creation**: Owner creates raffle with project details and percentages
2. **Active**: Users buy tickets (1 wei = 1 ticket)
3. **Close**: Owner requests Pyth Entropy for randomness
4. **Callback**: Pyth responds with random number, winner is selected
5. **Distribution**: Funds are split between project, winner, and platform
6. **Withdrawal**: Each beneficiary withdraws their share

## 💰 Fee Structure

- **Platform Fee**: 0.05% of total pool
- **Project**: Configurable percentage (e.g., 30%)
- **Winner**: Remaining pool after fees

Example with 1 ETH pool and 30% project:
- Platform: 0.0005 ETH (0.05%)
- Project: 0.2998 ETH (30% of 0.9995 ETH)
- Winner: 0.6997 ETH (remaining)

## 🚦 Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up `.env` with your keys
4. Deploy factory: `npx hardhat ignition deploy...`
5. Create your first raffle: `npx tsx scripts/createNewRaffle.ts`
6. Share raffle address with participants
7. Close raffle after duration expires
8. Distribute funds and celebrate! 🎉

## 📝 License

MIT

## 🙋 Support & Contact

- GitHub: [eth-global-hackathon](https://github.com/NicoCaz/eth-global-hackathon)
- Built for ETH Global Hackathon
- Powered by Pyth Network

---

**Built with ❤️ using Pyth Entropy for fair and transparent crowdfunding**

