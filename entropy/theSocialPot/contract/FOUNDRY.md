# Foundry Setup

Questo progetto ora usa **Foundry** per compilare e deployare i contratti, seguendo il pattern del [tutorial Pyth Network](https://docs.pyth.network/entropy/entropy-sol/coinflip-tutorial).

## Installazione

Foundry è già installato. Se necessario, installa con:
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

## Compilazione

```bash
forge build
```

## Deploy

### Deploy su Base Sepolia

```bash
# Assicurati che .env contenga PRIVATE_KEY
forge script script/DeployLottery.s.sol:DeployLottery \
  --rpc-url https://sepolia.base.org \
  --broadcast \
  --verify \
  -vvvv
```

### Deploy su Base Mainnet

```bash
forge script script/DeployLottery.s.sol:DeployLottery \
  --rpc-url https://mainnet.base.org \
  --broadcast \
  --verify \
  -vvvv
```

## Test

```bash
forge test
```

## Vantaggi di Foundry

- ⚡ **Velocità**: Compilazione molto più veloce di Hardhat
- 🔧 **Tooling**: Forge, Cast, Anvil, Chisel tutti integrati
- 📝 **Scripting**: Script in Solidity (come nel tutorial Pyth)
- 🧪 **Testing**: Framework di test integrato con cheatcodes

## Struttura

- `src/` - Contratti Solidity
- `script/` - Script di deploy (Solidity)
- `test/` - Test (Solidity)
- `lib/` - Dipendenze (OpenZeppelin, forge-std)
- `foundry.toml` - Configurazione Foundry

## Note

- I contratti usano `IEntropy` e `requestWithCallback()` come nel tutorial Pyth
- Il remapping per OpenZeppelin punta a `lib/openzeppelin-contracts`
- Il remapping per Pyth SDK punta a `node_modules/@pythnetwork`

