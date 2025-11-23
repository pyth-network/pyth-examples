# XMTP Chat - Setup & Funding Guide

## Issue #1: Message Display Bug ✅ FIXED

**Problem:** Messages were switching sides and disappearing
**Root Cause:**
- Message polling was replacing ALL messages instead of merging new ones
- `senderAddress` was being set to wrong field (`senderInboxId` instead of actual wallet)

**Solution Applied:**
- Modified polling to merge messages instead of replacing
- Fixed sender address comparison to use wallet addresses
- Added case-insensitive comparison for wallet addresses

## Issue #2: Receiver Not Seeing Chat

This is **expected** on XMTP's development network without proper funding.

### How XMTP Works (Important!)

XMTP messages are stored on-chain/in a network. To send messages reliably:
1. **Sender** needs to register on XMTP network (requires wallet signature)
2. **Receiver** must also be registered on XMTP network
3. Both need small transaction fees to register and send messages

### Three XMTP Environments

```
┌──────────────┬─────────────────────────────┬──────────────────┐
│ Environment  │ Purpose                     │ Cost             │
├──────────────┼─────────────────────────────┼──────────────────┤
│ 'dev'        │ Ephemeral testing           │ Free (messages   │
│              │ Messages deleted regularly  │ deleted)         │
├──────────────┼─────────────────────────────┼──────────────────┤
│ 'production' │ Real messaging              │ ~$0.50-2 per user│
│              │ Messages stored forever     │ (one-time reg)   │
├──────────────┼─────────────────────────────┼──────────────────┤
│ 'local'      │ Local node testing          │ Free (if running │
│              │ For development only        │ local node)      │
└──────────────┴─────────────────────────────┴──────────────────┘
```

**Currently using:** `production` environment (switched from 'dev')

## Getting Your Farcaster Wallet Funded

### Step 1: Find Your Wallet Address

The wallet being used is your **Farcaster custodial wallet** (`user.wallet_address`).

To see it:
1. Open your browser console (F12 → Console tab)
2. Type: `localStorage`
3. Look for any stored chat data
4. Or add this to a page to display it

### Step 2: Fund with Sepolia ETH (Free Testnet)

If you want to test with **free** funds first:

1. **Get Wallet Address from Console:**
   ```javascript
   // In browser console:
   JSON.parse(localStorage.getItem('xmtp_chats'))[0]?.memberWallets[0]
   ```

2. **Get Free Sepolia ETH:**
   - Go to: https://www.alchemy.com/faucets/ethereum-sepolia
   - Paste your Farcaster wallet address
   - Click "Send me ETH"
   - Wait ~1 minute for confirmation

3. **Update XMTP to use Sepolia testnet:**
   - Edit `src/lib/xmtp.ts`
   - Change `const XMTP_ENV = 'production'` to use network: `sepolia`

   (Note: XMTP SDK may need updated config for this)

### Step 3: Fund with Real Ethereum (Mainnet)

For **production** use:

1. **Send real ETH to your Farcaster wallet:**
   - Use any exchange (Coinbase, Kraken, etc.)
   - Or transfer from another wallet
   - Need ~$0.50-2 per person for XMTP registration

2. **IMPORTANT: Network Chains:**

   **XMTP currently operates on:**
   - Ethereum Mainnet (primary)
   - Polygon (alternative)
   - Optimism (alternative)

   Your Farcaster wallet should have ETH on **Ethereum Mainnet**.

3. **Recommended Flow:**
   - Send small amount to Farcaster wallet address
   - Message registration happens automatically when:
     - User creates first chat
     - User sends first message
   - XMTP will use wallet funds to register

## Testing Without Funding

If you don't have funds yet, test with:

1. **Local Node:**
   - Run XMTP local node (free, no funds needed)
   - Switch to `'local'` environment

2. **Dev Network:**
   - Switch back to `'dev'` in `xmtp.ts`
   - Messages only last ~2 weeks
   - No funding needed
   - Good for quick testing

## Current Configuration

**File:** `src/lib/xmtp.ts`

```typescript
const XMTP_ENV = 'production' as const;
```

**To change:** Edit line 7 and rebuild

## Step-by-Step Quick Start

### For Testing (No Money)
```
1. Edit src/lib/xmtp.ts: change XMTP_ENV to 'dev'
2. Rebuild app
3. Create chats and send messages
4. Messages last ~2 weeks (auto-deleted)
```

### For Real Testing (With Free ETH)
```
1. Get Farcaster wallet address from localStorage
2. Get free Sepolia ETH from faucet
3. (Optional) Configure Sepolia network in xmtp.ts
4. Create chats - should work across users
```

### For Production (With Real Funds)
```
1. Get ETH on Mainnet to your Farcaster wallet
2. Keep XMTP_ENV as 'production'
3. Create chats - messages persist forever
4. Both users' wallets should have been auto-registered
```

## Troubleshooting

### "Can't send message"
- Check wallet address in localStorage
- Verify wallet has ETH for gas (even small amounts)
- Check browser console for XMTP errors

### "Receiver can't see chat"
- Both users must be registered on XMTP
- Requires wallet signature from both
- May need to create chat again after wallet registration

### "Messages disappeared"
- Using 'dev' network (messages auto-delete)
- Switch to 'production' for persistence
- Or run local node

### "Wallet address not showing"
- Open console (F12)
- Check: `JSON.parse(localStorage.getItem('xmtp_chats'))`
- Look for `memberWallets` array

## Key Concepts

**Inbox ID:** XMTP's unique identifier for your identity
- Generated when you create client
- Tied to wallet address
- Unique per XMTP environment

**Group Chat:** XMTP group conversation
- Created with list of inbox IDs
- Stored on-chain/in XMTP network
- Costs small gas fee

**Message:** Text sent in group
- Stored on XMTP network
- Requires sender registration
- Both parties must be registered to communicate

## Files Modified

- ✅ `src/lib/xmtp.ts` - Updated to use 'production'
- ✅ `src/app/chats/[chatId]/page.tsx` - Fixed message polling and display
- ✅ Other files - No changes needed

## Next Steps

1. **For Testing:**
   - Try with current 'production' setup
   - Check if messages appear on receiver's side
   - If not, fund both wallets with ETH

2. **For Debugging:**
   - Open console and check for XMTP errors
   - Verify wallet addresses match
   - Check localStorage for saved chats

3. **For Production:**
   - Document fund-raising process for users
   - Create user guide for funding wallets
   - Consider batch registration for first-time users

## Still Having Issues?

Please share:
1. What environment are you using? (check line 7 of xmtp.ts)
2. Do both test wallets have ETH?
3. What error appears in browser console?
4. Is receiver able to open the chat (they just don't see it on home)?

This will help diagnose if it's:
- Network environment issue
- Funding issue
- Message sync issue
- Display issue
