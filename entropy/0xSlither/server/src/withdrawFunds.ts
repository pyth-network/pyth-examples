/**
 * Standalone script to withdraw accumulated SSS from StakeArena to server wallet
 * Run this script periodically to collect funds from self-deaths and contract fees
 * 
 * Usage:
 *   npm run build && node dist/server/src/withdrawFunds.js
 *   
 * Or with ts-node:
 *   npx ts-node src/withdrawFunds.ts
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

const STAKE_ARENA_ABI = [
  'function withdrawBalance() external',
  'function owner() external view returns (address)',
];

async function main() {
  console.log('='.repeat(70));
  console.log('0xSlither - Withdraw Accumulated SSS from StakeArena');
  console.log('='.repeat(70));
  console.log('');

  // Validate environment variables
  const rpcUrl = process.env.SAGA_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;
  const stakeArenaAddress = process.env.STAKE_ARENA_ADDRESS;

  if (!rpcUrl || !privateKey || !stakeArenaAddress) {
    console.error('❌ Missing required environment variables:');
    if (!rpcUrl) console.error('   - SAGA_RPC_URL');
    if (!privateKey) console.error('   - PRIVATE_KEY');
    if (!stakeArenaAddress) console.error('   - STAKE_ARENA_ADDRESS');
    console.log('');
    console.log('Please set these in your .env file');
    process.exit(1);
  }

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const stakeArena = new ethers.Contract(stakeArenaAddress, STAKE_ARENA_ABI, wallet);

  console.log('Configuration:');
  console.log(`  Server Wallet: ${wallet.address}`);
  console.log(`  StakeArena:    ${stakeArenaAddress}`);
  console.log(`  RPC:           ${rpcUrl}`);
  console.log('');

  try {
    // Check if wallet is the owner
    console.log('Checking ownership...');
    const owner = await stakeArena.owner();
    
    if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
      console.error('❌ Error: Wallet is not the contract owner');
      console.log(`   Contract Owner: ${owner}`);
      console.log(`   Your Wallet:    ${wallet.address}`);
      console.log('');
      console.log('Only the contract owner can withdraw funds');
      process.exit(1);
    }
    
    console.log('✅ Ownership verified');
    console.log('');

    // Check balances before withdrawal
    console.log('Checking balances...');
    const contractBalance = await provider.getBalance(stakeArenaAddress);
    const walletBalance = await provider.getBalance(wallet.address);
    
    const contractBalanceFormatted = ethers.formatEther(contractBalance);
    const walletBalanceFormatted = ethers.formatEther(walletBalance);
    
    console.log(`  Contract Balance: ${contractBalanceFormatted} SSS`);
    console.log(`  Wallet Balance:   ${walletBalanceFormatted} SSS`);
    console.log('');

    // Check if there's anything to withdraw
    if (contractBalance === 0n) {
      console.log('⚠️  No SSS to withdraw from the contract');
      console.log('   This is normal if no players have died recently');
      console.log('='.repeat(70));
      process.exit(0);
    }

    // Perform withdrawal
    console.log(`Withdrawing ${contractBalanceFormatted} SSS...`);
    console.log('');
    
    const tx = await stakeArena.withdrawBalance();
    console.log(`📤 Transaction submitted: ${tx.hash}`);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);
    console.log('');

    // Check balances after withdrawal
    console.log('Final balances:');
    const newContractBalance = await provider.getBalance(stakeArenaAddress);
    const newWalletBalance = await provider.getBalance(wallet.address);
    
    console.log(`  Contract Balance: ${ethers.formatEther(newContractBalance)} SSS`);
    console.log(`  Wallet Balance:   ${ethers.formatEther(newWalletBalance)} SSS`);
    console.log('');
    
    // Calculate amounts
    const amountWithdrawn = contractBalance;
    const gasUsed = BigInt(receipt?.gasUsed || 0n);
    const gasPrice = BigInt(receipt?.gasPrice || 0n);
    const gasCost = gasUsed * gasPrice;
    const netGain = amountWithdrawn - gasCost;
    
    console.log('Transaction summary:');
    console.log(`  Amount Withdrawn: ${ethers.formatEther(amountWithdrawn)} SSS`);
    console.log(`  Gas Used:         ${gasUsed.toString()} units`);
    console.log(`  Gas Cost:         ${ethers.formatEther(gasCost)} SSS`);
    console.log(`  Net Gain:         ${ethers.formatEther(netGain)} SSS`);
    console.log('');
    
    console.log('='.repeat(70));
    console.log('✅ Withdrawal completed successfully!');
    console.log('='.repeat(70));

  } catch (error: any) {
    console.log('');
    console.log('='.repeat(70));
    console.error('❌ Withdrawal failed:', error.message);
    console.log('='.repeat(70));
    console.log('');
    
    if (error.message.includes('No balance to withdraw')) {
      console.log('The contract has no SSS to withdraw.');
    } else if (error.message.includes('Only owner')) {
      console.log('Only the contract owner can withdraw funds.');
    } else if (error.message.includes('insufficient funds')) {
      console.log('Insufficient gas funds in server wallet.');
      console.log(`Current balance: ${ethers.formatEther(await provider.getBalance(wallet.address))} SSS`);
    } else {
      console.log('Possible causes:');
      console.log('  - Network connectivity issues');
      console.log('  - Contract not deployed at specified address');
      console.log('  - Insufficient gas for transaction');
      console.log('  - Contract function not available (needs upgrade)');
    }
    
    console.log('');
    process.exit(1);
  }
}

// Run the main function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });

