import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

// EntropyOracle ABI (minimal, only what we need)
const ENTROPY_ORACLE_ABI = [
  'function requestMatchEntropy(bytes32 matchId) external payable',
  'function getMatchSeed(bytes32 matchId) external view returns (bytes32)',
  'function hasRequestedEntropy(bytes32 matchId) external view returns (bool)',
  'function isSeedAvailable(bytes32 matchId) external view returns (bool)',
  'function getEntropyFee() external view returns (uint256)',
  'function entropyRequestIdByMatch(bytes32 matchId) external view returns (uint64)',
  'event EntropyRequested(bytes32 indexed matchId, uint64 requestId)',
  'event EntropyStored(bytes32 indexed matchId, bytes32 seed)',
];

/**
 * EntropyBridgeService handles cross-chain entropy requests
 * Requests randomness from Pyth Entropy on Base Sepolia
 * Polls for revealed seeds and provides them to game server
 */
export class EntropyBridgeService {
  private baseSepoliaProvider: ethers.JsonRpcProvider;
  private baseSepoliaWallet: ethers.Wallet;
  private entropyOracle: ethers.Contract;
  private enabled: boolean = false;

  constructor() {
    const baseSepoliaRpcUrl = process.env.BASE_SEPOLIA_RPC_URL;
    const privateKey = process.env.SERVER_PRIVATE_KEY;
    const entropyOracleAddress = process.env.ENTROPY_ORACLE_ADDRESS;

    if (!baseSepoliaRpcUrl || !privateKey || !entropyOracleAddress) {
      console.warn('⚠️  Entropy Bridge disabled: Missing BASE_SEPOLIA_RPC_URL, SERVER_PRIVATE_KEY, or ENTROPY_ORACLE_ADDRESS');
      console.warn('⚠️  Game will use fallback RNG');
      this.enabled = false;
      // Create dummy provider/wallet to avoid null checks
      this.baseSepoliaProvider = new ethers.JsonRpcProvider('http://localhost:8545');
      this.baseSepoliaWallet = new ethers.Wallet(ethers.Wallet.createRandom().privateKey);
      this.entropyOracle = new ethers.Contract(ethers.ZeroAddress, ENTROPY_ORACLE_ABI, this.baseSepoliaWallet);
      return;
    }

    this.baseSepoliaProvider = new ethers.JsonRpcProvider(baseSepoliaRpcUrl);
    this.baseSepoliaWallet = new ethers.Wallet(privateKey, this.baseSepoliaProvider);
    this.entropyOracle = new ethers.Contract(
      entropyOracleAddress,
      ENTROPY_ORACLE_ABI,
      this.baseSepoliaWallet
    );
    this.enabled = true;

    console.log('✅ Entropy Bridge Service initialized');
    console.log('📍 Base Sepolia RPC:', baseSepoliaRpcUrl);
    console.log('🔐 Server wallet:', this.baseSepoliaWallet.address);
    console.log('🎲 EntropyOracle:', entropyOracleAddress);
  }

  /**
   * Check if the service is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Request entropy for a match from Base Sepolia
   * @param matchId Match identifier string
   * @returns Request ID (sequence number) or null if failed
   */
  async requestMatchEntropy(matchId: string): Promise<string | null> {
    if (!this.enabled) {
      console.warn('[EntropyBridge] Service disabled, skipping entropy request');
      return null;
    }

    try {
      const matchIdBytes32 = ethers.id(matchId);
      console.log(`[EntropyBridge] Requesting entropy for match ${matchId}`);
      console.log(`[EntropyBridge] Match ID (bytes32): ${matchIdBytes32}`);

      // Check if already requested
      const alreadyRequested = await this.entropyOracle.hasRequestedEntropy(matchIdBytes32);
      if (alreadyRequested) {
        console.log(`[EntropyBridge] Entropy already requested for match ${matchId}`);
        const requestId = await this.entropyOracle.entropyRequestIdByMatch(matchIdBytes32);
        return requestId.toString();
      }

      // Get entropy fee
      const fee = await this.entropyOracle.getEntropyFee();
      console.log(`[EntropyBridge] Entropy fee: ${ethers.formatEther(fee)} ETH`);

      // Check wallet balance
      const balance = await this.baseSepoliaProvider.getBalance(this.baseSepoliaWallet.address);
      if (balance < fee) {
        console.error(`[EntropyBridge] Insufficient balance: ${ethers.formatEther(balance)} ETH, need ${ethers.formatEther(fee)} ETH`);
        return null;
      }

      // Request entropy
      console.log('[EntropyBridge] Sending requestMatchEntropy transaction...');
      const tx = await this.entropyOracle.requestMatchEntropy(matchIdBytes32, { value: fee });
      console.log(`[EntropyBridge] Transaction sent: ${tx.hash}`);
      console.log(`[EntropyBridge] View on Base Sepolia: https://sepolia.basescan.org/tx/${tx.hash}`);

      const receipt = await tx.wait();
      console.log(`[EntropyBridge] Transaction confirmed in block ${receipt.blockNumber}`);

      // Parse EntropyRequested event
      const entropyRequestedEvent = receipt.logs
        .map((log: any) => {
          try {
            return this.entropyOracle.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((event: any) => event && event.name === 'EntropyRequested');

      if (entropyRequestedEvent) {
        const requestId = entropyRequestedEvent.args.requestId.toString();
        console.log(`[EntropyBridge] ✅ Entropy requested! Request ID: ${requestId}`);
        return requestId;
      } else {
        console.error('[EntropyBridge] EntropyRequested event not found in receipt');
        return null;
      }
    } catch (error) {
      console.error('[EntropyBridge] Error requesting entropy:', error);
      return null;
    }
  }

  /**
   * Check if seed is available for a match
   * @param matchId Match identifier string
   */
  async isSeedAvailable(matchId: string): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      const matchIdBytes32 = ethers.id(matchId);
      return await this.entropyOracle.isSeedAvailable(matchIdBytes32);
    } catch (error) {
      console.error('[EntropyBridge] Error checking seed availability:', error);
      return false;
    }
  }

  /**
   * Get the revealed seed for a match
   * @param matchId Match identifier string
   * @returns Seed (bytes32 string) or null if not available
   */
  async getMatchSeed(matchId: string): Promise<string | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const matchIdBytes32 = ethers.id(matchId);
      const seed = await this.entropyOracle.getMatchSeed(matchIdBytes32);
      
      if (seed === ethers.ZeroHash) {
        return null;
      }
      
      console.log(`[EntropyBridge] ✅ Retrieved seed for match ${matchId}: ${seed}`);
      return seed;
    } catch (error) {
      console.error('[EntropyBridge] Error getting match seed:', error);
      return null;
    }
  }

  /**
   * Wait for match seed to be available (with timeout)
   * Non-blocking: polls asynchronously without blocking game loop
   * @param matchId Match identifier string
   * @param maxWaitMs Maximum time to wait in milliseconds (default 60s)
   * @param pollIntervalMs Polling interval in milliseconds (default 3s)
   * @returns Seed or null if timeout
   */
  async waitForMatchSeed(
    matchId: string,
    maxWaitMs: number = 60000,
    pollIntervalMs: number = 3000
  ): Promise<string | null> {
    if (!this.enabled) {
      console.warn('[EntropyBridge] Service disabled, cannot wait for seed');
      return null;
    }

    console.log(`[EntropyBridge] Waiting for seed for match ${matchId}...`);
    console.log(`[EntropyBridge] Max wait: ${maxWaitMs / 1000}s, poll interval: ${pollIntervalMs / 1000}s`);
    
    const startTime = Date.now();
    let attempt = 0;

    while (Date.now() - startTime < maxWaitMs) {
      attempt++;
      
      // Check if seed is available
      const available = await this.isSeedAvailable(matchId);
      
      if (available) {
        const seed = await this.getMatchSeed(matchId);
        if (seed) {
          console.log(`[EntropyBridge] ✅ Seed available after ${(Date.now() - startTime) / 1000}s (${attempt} attempts)`);
          return seed;
        }
      }

      // Calculate dynamic poll interval with exponential backoff
      const currentPollInterval = Math.min(pollIntervalMs * Math.pow(1.2, Math.floor(attempt / 3)), 10000);
      
      console.log(`[EntropyBridge] Seed not yet available (attempt ${attempt}, waited ${Math.floor((Date.now() - startTime) / 1000)}s)...`);
      
      // Sleep before next poll
      await this.sleep(currentPollInterval);
    }

    console.error(`[EntropyBridge] ⏱️  Timeout waiting for seed after ${maxWaitMs / 1000}s`);
    return null;
  }

  /**
   * Request entropy and wait for result in one call
   * @param matchId Match identifier
   * @param maxWaitMs Maximum wait time
   * @returns Seed or null
   */
  async requestAndWaitForSeed(matchId: string, maxWaitMs: number = 60000): Promise<string | null> {
    const requestId = await this.requestMatchEntropy(matchId);
    
    if (!requestId) {
      console.error('[EntropyBridge] Failed to request entropy');
      return null;
    }

    console.log('[EntropyBridge] Waiting for Pyth to reveal randomness...');
    return await this.waitForMatchSeed(matchId, maxWaitMs);
  }

  /**
   * Get current entropy fee
   */
  async getEntropyFee(): Promise<bigint> {
    if (!this.enabled) {
      return 0n;
    }

    try {
      return await this.entropyOracle.getEntropyFee();
    } catch (error) {
      console.error('[EntropyBridge] Error getting entropy fee:', error);
      return 0n;
    }
  }

  /**
   * Sleep utility for polling
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get server wallet address on Base Sepolia
   */
  getServerAddress(): string {
    return this.baseSepoliaWallet.address;
  }

  /**
   * Get server balance on Base Sepolia
   */
  async getServerBalance(): Promise<string> {
    if (!this.enabled) {
      return '0';
    }

    try {
      const balance = await this.baseSepoliaProvider.getBalance(this.baseSepoliaWallet.address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('[EntropyBridge] Error getting server balance:', error);
      return '0';
    }
  }
}

