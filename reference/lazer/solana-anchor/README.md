# Solana Anchor Example Program for Pyth Lazer

This is a simple Solana program built using the Anchor framework that uses Pyth Lazer prices and stores them on-chain.

## Prerequisites

- [Rust](https://rustup.rs/)
- [Solana CLI Tools](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor Framework](https://www.anchor-lang.com/docs/installation)
- [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/)

## Project Structure

```
solana-anchor/
├── programs/       # Solana program source code
├── tests/          # Test files
└── fixtures/       # Lazer Program artifacts
```

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Build the program:
```bash
anchor build
```

## Testing

Run the test suite:
```bash
pnpm test:anchor
```

## Development

- The program is configured to run on Localnet by default
- Program ID: `FpmpVrP57C6ADT8d4dQp9TkM1vmxohZJ5WEQQc9RGLPY`
- Uses Pyth Lazer with address: `pytd2yyk641x7ak7mkaasSJVXh6YYZnC7wTmtgAyxPt`