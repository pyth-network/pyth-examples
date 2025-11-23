import { ethers } from 'ethers';

// Contract ABIs (minimal, only what we need)
const STAKE_ARENA_ABI = [
  'function reportEat(bytes32 matchId, address eater, address eaten) external',
  'function reportSelfDeath(bytes32 matchId, address player, uint256 score) external',
  'function commitEntropy(bytes32 matchId, bytes32 entropyRequestId, bytes32 seedHash) external',
  'function finalizeMatch(bytes32 matchId, address[] calldata players, uint256[] calldata scores, address winner) external',
  'function withdrawBalance() external',
  'function getLeaderboard() external view returns (tuple(address player, uint256 score)[])',
  'function bestScore(address player) external view returns (uint256)',
  'function getStake(bytes32 matchId, address player) external view returns (uint256)',
  'function isActive(bytes32 matchId, address player) external view returns (bool)',
  'event EatLoot(bytes32 indexed matchId, address indexed eater, address indexed eaten, uint256 amountTransferred, uint256 timestamp)',
  'event SelfDeath(bytes32 indexed matchId, address indexed player, uint256 amountToServer, uint256 timestamp)',
  'event MatchFinalized(bytes32 indexed matchId, address indexed winner, uint256 timestamp)',
  'event EntropyCommitted(bytes32 indexed matchId, bytes32 entropyRequestId)',
];


interface LeaderboardEntry {
  player: string;
  score: bigint;
}

interface PendingTransaction {
  promise: Promise<ethers.TransactionReceipt | null>;
  description: string;
}

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private stakeArena: ethers.Contract;
  private pendingTxs: PendingTransaction[] = [];
  private readonly maxRetries = 3;
  private readonly retryDelay = 2000; // 2 seconds
  
  // Transaction queue per address to prevent race conditions
  // Each address has a promise chain that ensures operations are serialized
  private addressQueues: Map<string, Promise<void>> = new Map();

  constructor(
    rpcUrl: string,
    privateKey: string,
    stakeArenaAddress: string
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.stakeArena = new ethers.Contract(
      stakeArenaAddress,
      STAKE_ARENA_ABI,
      this.wallet
    );

    console.log('BlockchainService initialized');
    console.log('Server wallet:', this.wallet.address);
    console.log('StakeArena contract:', stakeArenaAddress);
    console.log('Using native SSS token for game economy');
  }

  /**
   * Generate a match ID from a unique string
   */
  generateMatchId(uniqueString: string): string {
    return ethers.id(uniqueString);
  }

  /**
   * Report that one player ate another
   * Non-blocking, fire-and-forget with retry logic
   * Operations are queued per address to prevent race conditions
   */
  async reportEat(
    matchId: string,
    eaterAddress: string,
    eatenAddress: string
  ): Promise<void> {
    const description = `reportEat: ${eaterAddress.slice(0, 8)} ate ${eatenAddress.slice(0, 8)} in match ${matchId.slice(0, 10)}`;
    
    // Queue this operation for both addresses involved
    // This prevents race conditions like simultaneous eat/death reports
    const operation = async () => {
      const result = await this.executeWithRetry(async () => {
        console.log(`[Blockchain] ${description}`);
        
        // Convert string match ID to bytes32
        const matchIdBytes32 = ethers.id(matchId);
        const tx = await this.stakeArena.reportEat(
          matchIdBytes32,
          eaterAddress,
          eatenAddress
        );
        console.log(`[Blockchain] reportEat tx sent: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`[Blockchain] ✅ reportEat confirmed: ${receipt.hash}`);
        return receipt;
      }, description);
      
      return result;
    };
    
    // Queue for the eaten player (victim)
    // The eater can continue with other operations
    this.queueForAddress(eatenAddress, operation);
  }

  /**
   * Report that a player died from self-inflicted causes
   * (wall collision, eating self, etc.) - stake goes to server
   * Non-blocking, fire-and-forget with retry logic
   * Operations are queued per address to prevent race conditions
   */
  async reportSelfDeath(
    matchId: string,
    playerAddress: string,
    score: number
  ): Promise<void> {
    const description = `reportSelfDeath: ${playerAddress.slice(0, 8)} died with score ${score} in match ${matchId.slice(0, 10)}`;
    
    // Queue this operation for the player's address
    // This prevents race conditions like multiple death reports
    const operation = async () => {
      const result = await this.executeWithRetry(async () => {
        console.log(`[Blockchain] ${description}`);
        
        // Convert string match ID to bytes32
        const matchIdBytes32 = ethers.id(matchId);
        const tx = await this.stakeArena.reportSelfDeath(
          matchIdBytes32,
          playerAddress,
          score
        );
        console.log(`[Blockchain] reportSelfDeath tx sent: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`[Blockchain] ✅ reportSelfDeath confirmed: ${receipt.hash}`);
        return receipt;
      }, description);
      
      return result;
    };
    
    // Queue for the player's address
    this.queueForAddress(playerAddress, operation);
  }

  /**
   * Commit entropy seed hash to Saga for a match
   * @param matchId Match identifier string
   * @param entropyRequestId Entropy request ID from Base Sepolia (sequence number)
   * @param seed The actual random seed from Pyth Entropy
   * Non-blocking with retry logic
   */
  async commitEntropyToSaga(matchId: string, entropyRequestId: string, seed: string): Promise<void> {
    const description = `commitEntropy for match ${matchId.slice(0, 10)}`;
    
    const txPromise = this.executeWithRetry(async () => {
      console.log(`[Blockchain] ${description}`);
      console.log(`[Blockchain] Entropy request ID: ${entropyRequestId}`);
      console.log(`[Blockchain] Seed: ${seed}`);
      
      // Convert match ID to bytes32
      const matchIdBytes32 = ethers.id(matchId);
      
      // Convert request ID to bytes32 (it's a uint64, so pad it)
      const requestIdBytes32 = ethers.zeroPadValue(ethers.toBeHex(entropyRequestId), 32);
      
      // Hash the seed for on-chain storage
      const seedHash = ethers.keccak256(ethers.toUtf8Bytes(seed));
      
      console.log(`[Blockchain] Match ID (bytes32): ${matchIdBytes32}`);
      console.log(`[Blockchain] Request ID (bytes32): ${requestIdBytes32}`);
      console.log(`[Blockchain] Seed hash: ${seedHash}`);
      
      const tx = await this.stakeArena.commitEntropy(matchIdBytes32, requestIdBytes32, seedHash);
      const receipt = await tx.wait();
      console.log(`[Blockchain] ✅ commitEntropy confirmed: ${receipt.hash}`);
      console.log(`[Blockchain] View on explorer: ${process.env.SAGA_EXPLORER_URL || 'N/A'}/tx/${receipt.hash}`);
      return receipt;
    }, description);

    this.pendingTxs.push({ promise: txPromise, description });
    this.cleanupPendingTxs();
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use commitEntropyToSaga instead
   */
  async commitEntropy(matchId: string, entropyRequestId: string): Promise<void> {
    console.warn('[Blockchain] commitEntropy is deprecated, use commitEntropyToSaga with seed parameter');
    // Create a dummy seed hash for backward compatibility
    const dummySeedHash = ethers.keccak256(ethers.toUtf8Bytes(entropyRequestId));
    await this.commitEntropyToSaga(matchId, entropyRequestId, entropyRequestId);
  }

  /**
   * Finalize a match and update leaderboard
   * Non-blocking with retry logic
   */
  async finalizeMatch(
    matchId: string,
    players: string[],
    scores: number[],
    winner: string
  ): Promise<void> {
    const description = `finalizeMatch ${matchId.slice(0, 10)} with ${players.length} players`;
    
    const txPromise = this.executeWithRetry(async () => {
      console.log(`[Blockchain] ${description}`);
      // Convert string match ID to bytes32
      const matchIdBytes32 = ethers.id(matchId);
      const tx = await this.stakeArena.finalizeMatch(
        matchIdBytes32,
        players,
        scores,
        winner
      );
      const receipt = await tx.wait();
      console.log(`[Blockchain] finalizeMatch confirmed: ${receipt.hash}`);
      return receipt;
    }, description);

    this.pendingTxs.push({ promise: txPromise, description });
    this.cleanupPendingTxs();
  }

  /**
   * Get on-chain leaderboard
   */
  async getLeaderboard(): Promise<Array<{ address: string; score: number }>> {
    try {
      const entries: LeaderboardEntry[] = await this.stakeArena.getLeaderboard();
      return entries.map(entry => ({
        address: entry.player,
        score: Number(entry.score),
      }));
    } catch (error) {
      console.error('[Blockchain] Error fetching leaderboard:', error);
      return [];
    }
  }

  /**
   * Get best score for a player
   */
  async getBestScore(playerAddress: string): Promise<number> {
    try {
      const score: bigint = await this.stakeArena.bestScore(playerAddress);
      return Number(score);
    } catch (error) {
      console.error('[Blockchain] Error fetching best score:', error);
      return 0;
    }
  }

  /**
   * Get player's stake in a match
   */
  async getStake(matchId: string, playerAddress: string): Promise<number> {
    try {
      // Convert string match ID to bytes32
      const matchIdBytes32 = ethers.id(matchId);
      const stake: bigint = await this.stakeArena.getStake(matchIdBytes32, playerAddress);
      return Math.floor(Number(ethers.formatEther(stake)));
    } catch (error) {
      console.error('[Blockchain] Error fetching stake:', error);
      return 0;
    }
  }

  /**
   * Check if player is active in a match
   */
  async isActive(matchId: string, playerAddress: string): Promise<boolean> {
    try {
      // Convert string match ID to bytes32
      const matchIdBytes32 = ethers.id(matchId);
      return await this.stakeArena.isActive(matchIdBytes32, playerAddress);
    } catch (error) {
      console.error('[Blockchain] Error checking active status:', error);
      return false;
    }
  }

  /**
   * Queue an operation for a specific address to prevent race conditions
   * Operations for the same address are serialized (executed one after another)
   */
  private queueForAddress(address: string, operation: () => Promise<void>): void {
    // Get the current queue for this address (or create an empty resolved promise)
    const currentQueue = this.addressQueues.get(address) || Promise.resolve();
    
    // Chain the new operation to the existing queue
    const newQueue = currentQueue
      .then(() => operation())
      .catch((error) => {
        console.error(`[Blockchain] Queued operation failed for ${address.slice(0, 8)}:`, error);
      });
    
    // Update the queue for this address
    this.addressQueues.set(address, newQueue);
    
    // Clean up the queue entry after operation completes
    newQueue.finally(() => {
      // If this is still the active queue, remove it
      if (this.addressQueues.get(address) === newQueue) {
        this.addressQueues.delete(address);
      }
    });
  }

  /**
   * Execute a transaction with retry logic
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    description: string
  ): Promise<T | null> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        // Enhanced error logging
        console.error(
          `[Blockchain] ${description} failed (attempt ${attempt}/${this.maxRetries}):`
        );
        
        if (error.code) {
          console.error(`  Error code: ${error.code}`);
        }
        if (error.reason) {
          console.error(`  Reason: ${error.reason}`);
        }
        if (error.data) {
          console.error(`  Data: ${error.data}`);
        }
        console.error(`  Message: ${error.message || error}`);
        
        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * attempt);
        }
      }
    }
    
    console.error(`[Blockchain] ${description} failed after ${this.maxRetries} attempts`);
    return null;
  }

  /**
   * Clean up completed pending transactions
   */
  private cleanupPendingTxs(): void {
    this.pendingTxs = this.pendingTxs.filter(tx => {
      // Check if promise is settled
      let settled = false;
      tx.promise.then(() => { settled = true; }).catch(() => { settled = true; });
      return !settled;
    });
  }

  /**
   * Wait for all pending transactions to complete
   */
  async waitForPendingTransactions(): Promise<void> {
    console.log(`[Blockchain] Waiting for ${this.pendingTxs.length} pending transactions...`);
    await Promise.allSettled(this.pendingTxs.map(tx => tx.promise));
    this.pendingTxs = [];
  }

  /**
   * Get number of pending transactions
   */
  getPendingTxCount(): number {
    return this.pendingTxs.length;
  }

  /**
   * Withdraw accumulated native SSS from StakeArena contract to server wallet
   * This retrieves funds from self-deaths and other contract accumulations
   */
  async withdrawContractBalance(): Promise<boolean> {
    try {
      // Get the StakeArena contract address
      const contractAddress = await this.stakeArena.getAddress();
      
      // Check the contract's native SSS balance
      const balance = await this.provider.getBalance(contractAddress);
      const balanceFormatted = ethers.formatEther(balance);
      
      console.log(`[Blockchain] StakeArena contract balance: ${balanceFormatted} SSS`);
      
      // Only withdraw if balance is above a threshold (e.g., 10 SSS)
      const threshold = ethers.parseEther("10");
      
      if (balance < threshold) {
        console.log(`[Blockchain] Balance below threshold (${ethers.formatEther(threshold)} SSS), skipping withdrawal`);
        return false;
      }
      
      console.log(`[Blockchain] Withdrawing ${balanceFormatted} SSS from contract to server wallet...`);
      
      // Call withdrawBalance function
      const tx = await this.stakeArena.withdrawBalance();
      const receipt = await tx.wait();
      
      console.log(`[Blockchain] ✅ Successfully withdrew ${balanceFormatted} SSS`);
      console.log(`[Blockchain] Transaction: ${receipt?.hash}`);
      
      // Check new server wallet balance
      const serverBalance = await this.provider.getBalance(this.wallet.address);
      console.log(`[Blockchain] Server wallet balance: ${ethers.formatEther(serverBalance)} SSS`);
      
      return true;
    } catch (error) {
      console.error('[Blockchain] Error withdrawing contract balance:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * Get the StakeArena contract's native SSS balance
   */
  async getContractBalance(): Promise<string> {
    try {
      const contractAddress = await this.stakeArena.getAddress();
      const balance = await this.provider.getBalance(contractAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('[Blockchain] Error getting contract balance:', error);
      return "0";
    }
  }

  /**
   * Get the server wallet's native SSS balance
   */
  async getServerWalletBalance(): Promise<string> {
    try {
      const balance = await this.provider.getBalance(this.wallet.address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('[Blockchain] Error getting server wallet balance:', error);
      return "0";
    }
  }

  /**
   * Settle pellet tokens at match end/tap-out
   * Server pays out accumulated pellet tokens to player via native SSS transfer
   * @param playerAddress Player's address
   * @param pelletTokens Amount of pellet tokens the player accumulated
   */
  async settlePelletTokens(
    playerAddress: string,
    pelletTokens: number
  ): Promise<void> {
    const description = `settlePelletTokens: ${pelletTokens.toFixed(2)} SSS to ${playerAddress.slice(0, 8)}`;
    
    // If player has no pellet tokens, nothing to settle
    if (pelletTokens <= 0) {
      console.log(`[Blockchain] No pellet tokens to settle for ${playerAddress.slice(0, 8)}`);
      return;
    }

    // Queue this operation for the player's address
    const operation = async () => {
      await this.executeWithRetry(async () => {
        console.log(`[Blockchain] ${description}`);
        
        // Convert pellet tokens to wei (18 decimals for native SSS)
        const amountWei = ethers.parseEther(pelletTokens.toFixed(18));
        
        // Check server wallet balance (native token balance)
        const serverBalance = await this.provider.getBalance(this.wallet.address);
        if (serverBalance < amountWei) {
          console.error(`[Blockchain] Insufficient server balance for pellet token payout: ${ethers.formatEther(serverBalance)} < ${pelletTokens.toFixed(2)} SSS`);
          throw new Error('Insufficient server balance for pellet token payout');
        }
        
        // Transfer native SSS from server to player
        const tx = await this.wallet.sendTransaction({
          to: playerAddress,
          value: amountWei,
        });
        const receipt = await tx.wait();
        console.log(`[Blockchain] ✅ Pellet tokens settled: ${pelletTokens.toFixed(2)} SSS to ${playerAddress.slice(0, 8)}, tx: ${receipt!.hash}`);
        return receipt;
      }, description);
    };
    
    // Queue for the player's address to prevent race conditions
    this.queueForAddress(playerAddress, operation);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

