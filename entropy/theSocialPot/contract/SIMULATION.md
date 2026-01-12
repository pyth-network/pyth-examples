# 🎰 Simulazione Lotteria MegaYield

Questa guida ti mostra come simulare una lotteria completa per testare il sistema.

## 🚀 Simulazione Locale Completa

La simulazione locale deploya tutti i contratti su una rete Hardhat locale e simula un ciclo completo di lotteria.

### Prerequisiti

1. Assicurati di avere tutte le dipendenze installate:
```bash
cd backend
npm install
```

2. Compila i contratti:
```bash
npm run compile
```

### Eseguire la Simulazione

```bash
npm run simulate:local
```

### Cosa fa lo script:

1. **Deploy dei Contratti**:
   - Mock USDC (token per i pagamenti)
   - Mock Pyth (per la generazione di numeri casuali)
   - PythIntegration
   - Mock Aave Pool
   - AaveIntegration
   - MegaYieldVesting
   - MegaYieldLottery

2. **Setup**:
   - Mint di USDC per tutti gli utenti
   - Approvazioni per spendere USDC
   - Collegamento dei contratti

3. **Simulazione Acquisti**:
   - 5 utenti diversi comprano ticket
   - Il jackpot cresce con ogni acquisto
   - Vengono mostrati i dettagli di ogni transazione

4. **Estrazione Vincitore**:
   - Richiesta di numero casuale da Pyth
   - Esecuzione del callback
   - Selezione del vincitore
   - Calcolo dei premi

### Output Esempio

```
🎰 Starting Complete Local Lottery Simulation...

👥 Participants:
  Owner: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  User1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
  ...

📦 Deploying Mock USDC...
  ✅ USDC deployed: 0x5FbDB2315678afecb367f032d93F642f64180aa3

🎫 Simulating Ticket Purchases...
  🎟️  User1 buying 5 ticket(s)...
     ✅ Purchased! Jackpot: 3.5 USDC, Tickets: 1
  ...

🎲 Drawing Winner...
  🎉 Winner Drawn!
  🏆 Winner: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
  👤 Winner Name: User1
  💵 First Payment: $0.29 USDC (immediate)
  📊 Monthly Payment: $0.29 USDC (120 months)
  🎁 Total Prize: $35.00 USDC
```

## 🌐 Simulazione su Testnet

Per simulare su Base Sepolia (dopo aver deployato i contratti):

```bash
npm run simulate:testnet
```

**Nota**: Questo script richiede che i contratti siano già deployati su Base Sepolia. Assicurati di:
1. Aver deployato i contratti con `npm run deploy:testnet`
2. Aver configurato le variabili d'ambiente nel `.env`
3. Aver abbastanza ETH per le fees

## 🔍 Cosa Osservare

Durante la simulazione, presta attenzione a:

1. **Crescita del Jackpot**: Ogni acquisto aggiunge il 70% del costo al jackpot
2. **Conteggio Ticket**: Solo gli acquirenti unici vengono contati (non il numero di ticket)
3. **Selezione Vincitore**: Il vincitore viene selezionato casualmente tra tutti i partecipanti
4. **Calcolo Premi**: 
   - Primo pagamento: 1/120 del jackpot (immediato)
   - Pagamenti mensili: 119/120 del jackpot distribuiti su 120 mesi

## 🐛 Troubleshooting

### Errore: "Contract not deployed"
- Assicurati di aver compilato i contratti: `npm run compile`

### Errore: "Insufficient funds"
- Per la simulazione locale, Hardhat fornisce automaticamente fondi
- Per testnet, assicurati di avere ETH nel wallet

### Callback non eseguito
- Nella simulazione locale, il callback viene eseguito automaticamente dopo 1 blocco
- Se non funziona, verifica che MockPyth sia deployato correttamente

## 📝 Personalizzazione

Puoi modificare `scripts/simulate-local.ts` per:
- Cambiare il numero di utenti
- Modificare le quantità di ticket acquistati
- Aggiungere referral codes
- Testare scenari diversi

## 🎯 Prossimi Passi

Dopo aver visto la simulazione funzionare:
1. Testa il frontend con dati reali
2. Verifica che i vincitori appaiano nella dashboard
3. Testa il sistema di vesting
4. Simula più giorni consecutivi

