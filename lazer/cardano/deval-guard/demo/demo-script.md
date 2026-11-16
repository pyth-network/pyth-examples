# DevalGuard Demo Script (< 3 minutes)

## Setup
- Frontend running at localhost:5173
- Browser with Cardano wallet extension (Nami/Eternl) installed

## Flow

### 1. Introduction (30 sec)
> "DevalGuard is the first parametric devaluation insurance on any blockchain. Pay a small premium, and if the peso devalues past your threshold, you get paid automatically."

### 2. Connect Wallet (15 sec)
- Click "Connect Wallet"
- Approve connection in wallet extension

### 3. Show Current Price (15 sec)
> "The ARS/USD exchange rate is being read from Pyth oracle in real-time. Right now it's at 1215."

### 4. Subscribe to Policy (30 sec)
- Select **10% threshold**
- Select **30 days** coverage
- Enter **5 ADA** premium
- Point out confirmation message: _"If ARS devalues 10%, you receive 50 ADA"_
- Click **"Pay 5 ADA & Subscribe"**
> "I just paid 5 ADA. If the peso devalues 10% from now, I automatically get 50 ADA."

### 5. Show Policy Active (15 sec)
- Scroll to "Your Policies"
- Point out: strike price, threshold, devaluation meter at 0%
> "My policy is active. The strike price is locked at 1215. The meter shows current devaluation."

### 6. Simulate Devaluation (30 sec)
- Slowly drag the price slider to the right
- Watch the devaluation meter fill up
- At ~5%: "We're at 5% — not enough to trigger yet"
- At ~10%: meter turns green, **Claim button appears**
> "The peso just devalued 10%! The contract detected it from Pyth's price feed."

### 7. Claim Payout (15 sec)
- Click **"Claim 50 ADA"**
- Policy status changes to "Claimed"
> "50 ADA sent directly to my wallet. No paperwork, no phone calls, no claims adjustor. Just math and Pyth."

### 8. Closing (15 sec)
> "This is DevalGuard — parametric insurance that doesn't exist anywhere in DeFi. Built on Cardano with Pyth as the oracle. Thank you."

## Key Points to Emphasize
- **First of its kind**: no devaluation insurance exists in any blockchain
- **Pyth is central**: the entire protocol revolves around the price feed
- **Fully on-chain**: Aiken validators, no off-chain dependencies for execution
- **Real problem**: 1 in 3 Argentines uses crypto to hedge devaluation
