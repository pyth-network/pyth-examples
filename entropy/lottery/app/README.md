# Lottery Frontend Application

This Next.js application provides the user interface for the Pyth Entropy lottery system.

## Features

- **Connect Wallet**: Web3 wallet integration with support for multiple chains
- **Buy Tickets**: Purchase lottery tickets with automatic Entropy fee calculation
- **View Tickets**: See all your tickets with real-time random number updates
- **Lottery Status**: Monitor prize pool, ticket sales, and winner announcements
- **Claim Prizes**: Winners can claim their prizes directly through the UI

## Technology Stack

- **Next.js 14** with App Router
- **React 18** for UI components
- **Wagmi v2** for Ethereum interactions
- **Viem** for contract interactions
- **TanStack React Query** for state management
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **Lucide React** for icons

## Setup

Install dependencies:

```bash
npm install
```

## Configuration

1. Update the contract address in `contracts/addresses.ts`:

```typescript
export const lotteryAddress = "YOUR_DEPLOYED_CONTRACT_ADDRESS" as const;
```

2. The app supports multiple chains configured in `config.ts`:
   - Blast Sepolia (default)
   - Optimism Sepolia
   - Arbitrum Sepolia

3. Generate TypeScript types from the contract ABI:

```bash
npx wagmi generate
```

## Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Building

Build the production application:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Project Structure

```
app/
├── app/
│   ├── (home)/
│   │   ├── page.tsx                    # Main lottery page
│   │   └── components/
│   │       ├── buy-ticket.tsx          # Ticket purchase component
│   │       ├── my-tickets.tsx          # User tickets display
│   │       └── lottery-status.tsx      # Status and winner info
│   ├── layout.tsx                      # Root layout with providers
│   └── globals.css                     # Global styles
├── components/
│   ├── ui/                             # shadcn/ui components
│   └── wagmi/                          # Wallet connection components
├── contracts/
│   ├── Lottery.json                    # Contract ABI
│   ├── addresses.ts                    # Contract addresses
│   └── generated.ts                    # Generated hooks (from wagmi)
├── providers/
│   └── app-provider.tsx                # Wagmi and React Query setup
├── config.ts                           # Chain configuration
└── wagmi.config.ts                     # Wagmi CLI configuration
```

## Components

### BuyTicket
Handles ticket purchases:
- Displays total cost (ticket price + Entropy fee)
- Shows loading states during transaction
- Provides success feedback

### MyTickets
Lists all user's tickets:
- Shows ticket ID and sequence number
- Displays random numbers when revealed
- Highlights winning tickets
- Real-time updates via blockchain events

### LotteryStatus
Shows lottery information:
- Current status (Active/Drawing/Ended)
- Prize pool amount
- Number of tickets sold
- Winner address
- Claim prize button for winners

## Wallet Integration

The app uses Wagmi's wallet connection system with support for:
- MetaMask
- WalletConnect
- Coinbase Wallet
- And other injected providers

Users are automatically prompted to switch to the correct network if needed.

## Contract Interactions

The app uses generated hooks from Wagmi CLI:

```typescript
// Read contract state
const { data: status } = useLotteryStatus({ address: lotteryAddress });
const { data: prizePool } = useLotteryPrizePool({ address: lotteryAddress });

// Write to contract
const { writeContract } = useWriteLotteryBuyTicket();
writeContract({ address: lotteryAddress, value: totalCost });
```

## Styling

The app uses Tailwind CSS with the shadcn/ui component library for a consistent, modern design. The color scheme and components can be customized in:

- `tailwind.config.ts` - Tailwind configuration
- `app/globals.css` - Global styles and CSS variables
- `components.json` - shadcn/ui configuration

## License

MIT
