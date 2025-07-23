# Vercel Deployment Guide for Pyth 7702 Lending

This guide will help you deploy your Pyth 7702 Lending application to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub/GitLab/Bitbucket Account**: Your code should be in a Git repository
3. **WalletConnect Project ID**: Get one at [cloud.walletconnect.com](https://cloud.walletconnect.com)

## Step 1: Prepare Your Repository

Make sure your code is pushed to a Git repository (GitHub, GitLab, or Bitbucket).

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**: Visit [vercel.com/dashboard](https://vercel.com/dashboard)
2. **Import Project**: Click "New Project"
3. **Connect Repository**: Select your Git provider and choose your repository
4. **Configure Project**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `app` (since your Next.js app is in the app folder)
   - **Build Command**: `npm run build` (or `pnpm build` if using pnpm)
   - **Output Directory**: `.next`
   - **Install Command**: `npm install` (or `pnpm install`)

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Navigate to your app directory**:
   ```bash
   cd app
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

## Step 3: Configure Environment Variables

In your Vercel project dashboard, go to **Settings > Environment Variables** and add the following:

### Required Environment Variables

```env
# WalletConnect Project ID (Required for wallet connections)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here

# Contract Addresses (Replace with your deployed contract addresses)
NEXT_PUBLIC_LENDING_POOL_ADDRESS=0x... # Your deployed LendingPool contract address
NEXT_PUBLIC_PYTH_ADDRESS=0x... # Your deployed Pyth contract address

# RPC URL (Optional - will use default Tenderly RPC if not set)
NEXT_PUBLIC_RPC_URL=https://virtual.base.rpc.tenderly.co/d20a0d8a-03ee-4c00-adc1-f51d5e98d8cc
```

### How to Get These Values

1. **WalletConnect Project ID**:
   - Go to [cloud.walletconnect.com](https://cloud.walletconnect.com)
   - Create a new project
   - Copy the Project ID

2. **Contract Addresses**:
   - Use the addresses from your deployed contracts
   - If you haven't deployed yet, you'll need to deploy your smart contracts first

3. **RPC URL**:
   - You can use the default Tenderly RPC URL provided
   - Or set up your own RPC endpoint

## Step 4: Build Configuration

Your `next.config.mjs` is already configured for production deployment with:
- ESLint and TypeScript errors ignored during builds
- Unoptimized images (for better compatibility)

## Step 5: Domain Configuration (Optional)

1. **Custom Domain**: In your Vercel project settings, you can add a custom domain
2. **SSL**: Vercel automatically provides SSL certificates

## Step 6: Verify Deployment

After deployment:

1. **Check Build Logs**: Ensure the build completed successfully
2. **Test Functionality**:
   - Wallet connection
   - Token approvals
   - Borrowing functionality
   - Smart borrow (batch transactions)
   - Faucet functionality

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check that all dependencies are in `package.json`
   - Ensure environment variables are set correctly
   - Check build logs for specific error messages

2. **Environment Variables Not Working**:
   - Make sure all variables start with `NEXT_PUBLIC_` for client-side access
   - Redeploy after adding new environment variables

3. **Wallet Connection Issues**:
   - Verify WalletConnect Project ID is correct
   - Check that the domain is added to your WalletConnect project settings

4. **Contract Interaction Failures**:
   - Verify contract addresses are correct
   - Ensure you're on the correct network (Base)
   - Check that contracts are deployed and verified

### Debugging

1. **Check Browser Console**: Look for JavaScript errors
2. **Check Network Tab**: Monitor API calls and contract interactions
3. **Vercel Function Logs**: Check server-side function logs in Vercel dashboard

## Production Checklist

Before going live:

- [ ] All environment variables are set
- [ ] Contract addresses are correct and verified
- [ ] WalletConnect project is configured for your domain
- [ ] Smart contracts are deployed and tested
- [ ] All functionality works as expected
- [ ] Error handling is in place
- [ ] Loading states are implemented
- [ ] Mobile responsiveness is tested

## Support

If you encounter issues:

1. **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
2. **Next.js Documentation**: [nextjs.org/docs](https://nextjs.org/docs)
3. **WalletConnect Documentation**: [docs.walletconnect.com](https://docs.walletconnect.com)

## Example Environment Variables

Here's an example of what your environment variables should look like:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=1234567890abcdef1234567890abcdef
NEXT_PUBLIC_LENDING_POOL_ADDRESS=0x1234567890123456789012345678901234567890
NEXT_PUBLIC_PYTH_ADDRESS=0xabcdef1234567890abcdef1234567890abcdef12
NEXT_PUBLIC_RPC_URL=https://virtual.base.rpc.tenderly.co/d20a0d8a-03ee-4c00-adc1-f51d5e98d8cc
```

Remember to replace these with your actual values! 