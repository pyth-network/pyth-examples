# 📝 Indirizzi Contratti Deployati su Base Sepolia

## ✅ Deploy Completato!

**Data Deploy**: $(date)  
**Network**: Base Sepolia (Chain ID: 84532)  
**Wallet Deployer**: `0x8b1C2B3E79Ca44C0862d7B3cfCC0F792dDB1B167`

## 📋 Contratti Deployati

### 1. PythIntegration
- **Indirizzo**: `0x71ab3BCf5df12bC46B932aAe7f6e6369393614c4`
- **Explorer**: https://sepolia.basescan.org/address/0x71ab3BCf5df12bC46B932aAe7f6e6369393614c4
- **Funzione**: Wrapper per Pyth Entropy random number generation

### 2. AaveIntegration
- **Indirizzo**: `0xCf434323d1Dc9367fd6cAc79458565FF0C5250dD`
- **Explorer**: https://sepolia.basescan.org/address/0xCf434323d1Dc9367fd6cAc79458565FF0C5250dD
- **⚠️ Note**: Usa indirizzo dummy per Aave Pool - Aave non funziona

### 3. MegaYieldVesting
- **Indirizzo**: `0xB86965556f85FdE426B98184304427aC964b1b16`
- **Explorer**: https://sepolia.basescan.org/address/0xB86965556f85FdE426B98184304427aC964b1b16
- **Funzione**: Gestione 10-year monthly vesting per il vincitore

### 4. MegaYieldLottery ⭐ (Contratto Principale)
- **Indirizzo**: `0xbC5EBBe3E9B2f5624B93327005979C494aBCaE2D`
- **Explorer**: https://sepolia.basescan.org/address/0xbC5EBBe3E9B2f5624B93327005979C494aBCaE2D
- **Funzione**: Contratto principale della lotteria

## 🔗 Contratti Esterni

- **USDC Base Sepolia**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **Pyth Entropy Base Sepolia**: `0x41c9e39574f40ad34c79f1c99b66a45efb830d4c`

## 🔍 Comandi Verifica

```bash
# PythIntegration
npx hardhat verify --network baseSepolia 0x71ab3BCf5df12bC46B932aAe7f6e6369393614c4 "0x41c9e39574f40ad34c79f1c99b66a45efb830d4c"

# AaveIntegration
npx hardhat verify --network baseSepolia 0xCf434323d1Dc9367fd6cAc79458565FF0C5250dD "0x1111111111111111111111111111111111111111" "0x036CbD53842c5426634e7929541eC2318f3dCF7e"

# MegaYieldVesting
npx hardhat verify --network baseSepolia 0xB86965556f85FdE426B98184304427aC964b1b16 "0xCf434323d1Dc9367fd6cAc79458565FF0C5250dD" "0x036CbD53842c5426634e7929541eC2318f3dCF7e"

# MegaYieldLottery
npx hardhat verify --network baseSepolia 0xbC5EBBe3E9B2f5624B93327005979C494aBCaE2D "0x036CbD53842c5426634e7929541eC2318f3dCF7e" "0x71ab3BCf5df12bC46B932aAe7f6e6369393614c4" "1000000"
```

## ⚠️ Note Importanti

1. **Aave Pool è dummy** - Il deposito ad Aave fallirà (come previsto)
2. **Pyth funziona** - Il flusso random generation è completamente funzionale
3. **Vesting funziona** - I fondi rimangono nel contratto vesting se Aave fallisce

