import { ethers } from 'ethers';
import { NETWORK_CONFIG, getAddChainParameters, getSwitchChainParameters } from './networkConfig';

// Contract ABIs (minimal, only what we need)
const STAKE_ARENA_ABI = [
  'function depositToVault() external payable',
  'function enterMatch(bytes32 matchId) external payable',
  'function tapOut(bytes32 matchId, uint256 score) external',
  'function getLeaderboard() external view returns (tuple(address player, uint256 score)[])',
  'function bestScore(address player) external view returns (uint256)',
  'function getStake(bytes32 matchId, address player) external view returns (uint256)',
  'function isActive(bytes32 matchId, address player) external view returns (bool)',
];

interface LeaderboardEntry {
  player: string;
  score: bigint;
}

export class WalletService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private address: string | null = null;
  private stakeArena: ethers.Contract | null = null;
  private isConnecting: boolean = false; // Track if we're in the connection process

  async connectWallet(): Promise<string | null> {
    this.isConnecting = true;
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        console.error('❌ MetaMask not detected');
        console.error('Please install MetaMask from https://metamask.io');
        throw new Error('MetaMask not installed');
      }

      console.log('🔐 Connecting to wallet...');
      this.provider = new ethers.BrowserProvider(window.ethereum);
      
      // Request account access
      const accounts = await this.provider.send('eth_requestAccounts', []);
      this.address = accounts[0];
      console.log('✅ Account connected:', this.address);
      
      this.signer = await this.provider.getSigner();
      
      // Ensure we're on the correct network
      await this.ensureCorrectNetwork();

      console.log('✅ Wallet fully connected and configured');
      console.log(`📡 Network: ${NETWORK_CONFIG.chainName}`);
      console.log(`💎 Using native ${NETWORK_CONFIG.nativeCurrency.symbol} token`);
      
      this.isConnecting = false;
      return this.address;
    } catch (error: any) {
      console.error('❌ Failed to connect wallet:', error);
      
      // Check both direct code and nested error code (ethers.js wraps errors)
      const errorCode = error.code || error.error?.code || error.info?.error?.code;
      
      // Provide user-friendly error messages
      if (errorCode === 4001) {
        console.error('💭 User rejected the connection request');
      } else if (errorCode === -32002) {
        console.error('⏳ Connection request already pending - please check your wallet');
      } else if (error.message?.includes('rejected')) {
        console.error('💭 User rejected the request');
      }
      
      this.isConnecting = false;
      return null;
    }
  }

  /**
   * Ensures the wallet is connected to the correct network
   * Automatically switches or adds the network if needed
   */
  private async ensureCorrectNetwork(): Promise<void> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      // Check current network
      const network = await this.provider.getNetwork();
      console.log(`📡 Current network: Chain ID ${network.chainId}`);
      
      if (network.chainId !== NETWORK_CONFIG.chainId) {
        console.log(`🔄 Wrong network detected. Switching to ${NETWORK_CONFIG.chainName}...`);
        await this.switchToCorrectNetwork();
        
        // After network switch, reinitialize signer to get fresh state
        this.signer = await this.provider.getSigner();
        console.log('✅ Signer reinitialized after network switch');
      } else {
        console.log(`✅ Already on ${NETWORK_CONFIG.chainName}`);
      }
    } catch (error) {
      console.error('Error ensuring correct network:', error);
      throw error;
    }
  }

  /**
   * Attempts to switch to the correct network
   * If the network is not added to the wallet, it will be added automatically
   */
  private async switchToCorrectNetwork(): Promise<void> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      // Try to switch to the network
      console.log(`🔄 Requesting network switch to ${NETWORK_CONFIG.chainName}...`);
      await this.provider.send('wallet_switchEthereumChain', [
        getSwitchChainParameters()
      ]);
      console.log(`✅ Successfully switched to ${NETWORK_CONFIG.chainName}`);
    } catch (switchError: any) {
      // Error code 4902 means the chain has not been added to MetaMask
      // ethers.js wraps MetaMask errors, so we need to check multiple places
      const errorCode = switchError.code || switchError.error?.code || switchError.info?.error?.code;
      const errorMessage = switchError.message || '';
      
      // Check for error code 4902 or error message containing 4902
      const isNetworkNotFound = errorCode === 4902 || errorMessage.includes('"code": 4902') || errorMessage.includes('4902');
      const isUserRejection = errorCode === 4001 || errorCode === 'ACTION_REJECTED';
      
      console.log('🔍 Switch error debug:', { errorCode, isNetworkNotFound, errorMessage: errorMessage.substring(0, 100) });
      
      if (isNetworkNotFound) {
        console.log(`➕ Network not found in wallet. Adding ${NETWORK_CONFIG.chainName}...`);
        await this.addNetworkToWallet();
      } else if (isUserRejection) {
        // User rejected the request
        console.error('❌ User rejected network switch request');
        throw new Error('Network switch rejected by user');
      } else {
        console.error('❌ Failed to switch network:', switchError);
        throw switchError;
      }
    }
  }

  /**
   * Adds the network to the user's wallet
   */
  private async addNetworkToWallet(): Promise<void> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      console.log('➕ Adding network to wallet...');
      console.log('Network details:', {
        chainId: NETWORK_CONFIG.chainIdHex,
        chainName: NETWORK_CONFIG.chainName,
        rpcUrls: NETWORK_CONFIG.rpcUrls,
        blockExplorerUrls: NETWORK_CONFIG.blockExplorerUrls,
        nativeCurrency: NETWORK_CONFIG.nativeCurrency,
      });

      await this.provider.send('wallet_addEthereumChain', [
        getAddChainParameters()
      ]);
      
      console.log(`✅ Successfully added ${NETWORK_CONFIG.chainName} to wallet`);
      console.log('⏳ Waiting for network switch to complete...');
      
      // Wait a moment for MetaMask to complete the network switch
      await this.sleep(1000);
      
      // Reinitialize provider to get fresh network state
      this.provider = new ethers.BrowserProvider(window.ethereum);
      
      // Verify we're now on the correct network
      const network = await this.provider.getNetwork();
      if (network.chainId !== NETWORK_CONFIG.chainId) {
        console.warn('⚠️  Network not switched yet, waiting...');
        await this.sleep(1000);
        this.provider = new ethers.BrowserProvider(window.ethereum);
        const retryNetwork = await this.provider.getNetwork();
        if (retryNetwork.chainId !== NETWORK_CONFIG.chainId) {
          throw new Error('Network switch did not complete');
        }
      }
      
      console.log('✅ Network switch confirmed');
    } catch (addError: any) {
      // Check both direct code and nested error code (ethers.js wraps errors)
      const errorCode = addError.code || addError.error?.code || addError.info?.error?.code;
      const errorMessage = addError.message || '';
      const isUserRejection = errorCode === 4001 || errorCode === 'ACTION_REJECTED' || errorMessage.includes('4001');
      
      if (isUserRejection) {
        console.error('❌ User rejected adding the network');
        throw new Error('Adding network rejected by user');
      } else {
        console.error('❌ Failed to add network:', addError);
        throw addError;
      }
    }
  }

  /**
   * Sleep utility for waiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  initializeContracts(stakeArenaAddress: string): void {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    this.stakeArena = new ethers.Contract(stakeArenaAddress, STAKE_ARENA_ABI, this.signer);
    
    console.log('Contracts initialized');
    console.log('StakeArena:', stakeArenaAddress);
    console.log('Using native SSS token (no approval needed)');
  }

  async getTokenBalance(): Promise<string> {
    if (!this.address || !this.provider) return '0';
    
    try {
      // Get native SSS balance
      const balance: bigint = await this.provider.getBalance(this.address);
      return Math.floor(parseFloat(ethers.formatEther(balance))).toString();
    } catch (error) {
      console.error('Error getting SSS balance:', error);
      return '0';
    }
  }

  /**
   * Deposit SSS to the server vault for continuous gameplay
   * This replaces the per-match enterMatch flow
   */
  async depositToVault(amount: string): Promise<boolean> {
    if (!this.stakeArena) {
      console.error('StakeArena not initialized');
      throw new Error('StakeArena not initialized');
    }
    
    console.log(`Depositing ${amount} SSS to vault...`);
    
    const amountWei = ethers.parseEther(amount);
    console.log('Amount in wei:', amountWei);
    
    // Send SSS directly to vault (no match ID needed)
    const tx = await this.stakeArena.depositToVault({ value: amountWei });
    console.log('Transaction:', tx);
    const receipt = await tx.wait(2); // Wait for 2 confirmations for better finality
    console.log('Transaction confirmed:', receipt.hash);
    
    // Add a small delay to ensure all RPC nodes have indexed the transaction
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ Successfully deposited to vault');
    return true;
  }

  /**
   * @deprecated Use depositToVault() for continuous matches
   */
  async enterMatch(matchId: string, amount: string): Promise<boolean> {
    if (!this.stakeArena) {
      console.error('StakeArena not initialized');
      throw new Error('StakeArena not initialized');
    }
    console.log('Entering match', matchId, amount);
    
    const amountWei = ethers.parseEther(amount);
    // Convert string match ID to bytes32
    const matchIdBytes32 = ethers.id(matchId);
    console.log('Amount in wei:', amountWei);
    console.log('Match ID as bytes32:', matchIdBytes32);
    console.log(`Entering match ${matchId} with ${amount} SSS...`);
    // Send SSS with the transaction (no approval needed!)
    const tx = await this.stakeArena.enterMatch(matchIdBytes32, { value: amountWei });
    console.log('Transaction:', tx);
    const receipt = await tx.wait(2); // Wait for 2 confirmations for better finality
    console.log('Transaction confirmed:', receipt.hash);
    
    // Add a small delay to ensure all RPC nodes have indexed the transaction
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Successfully entered match');
    return true;
  }

  /**
   * @deprecated In vault mode, tap-out is handled by server via direct transfers
   * No on-chain tapOut call needed
   */
  async tapOut(matchId: string, score: number): Promise<boolean> {
    if (!this.stakeArena) {
      throw new Error('StakeArena not initialized');
    }

    // Convert string match ID to bytes32
    const matchIdBytes32 = ethers.id(matchId);
    console.log(`Tapping out of match ${matchId} with score ${score}...`);
    const tx = await this.stakeArena.tapOut(matchIdBytes32, score);
    await tx.wait();
    
    console.log('Successfully tapped out');
    return true;
  }

  /**
   * @deprecated Not used in vault mode (no per-match active tracking on-chain)
   */
  async isActive(matchId: string, playerAddress: string): Promise<boolean> {
    if (!this.stakeArena) {
      throw new Error('StakeArena not initialized');
    }

    // Convert string match ID to bytes32
    const matchIdBytes32 = ethers.id(matchId);
    return await this.stakeArena.isActive(matchIdBytes32, playerAddress);
  }

  async getOnChainLeaderboard(): Promise<Array<{ address: string; score: number }>> {
    if (!this.stakeArena) {
      console.warn('StakeArena not initialized');
      return [];
    }

    try {
      const entries: LeaderboardEntry[] = await this.stakeArena.getLeaderboard();
      return entries.map(entry => ({
        address: entry.player,
        score: Number(entry.score),
      }));
    } catch (error) {
      console.error('Error fetching on-chain leaderboard:', error);
      return [];
    }
  }

  async getBestScore(playerAddress?: string): Promise<number> {
    if (!this.stakeArena) return 0;
    
    const address = playerAddress || this.address;
    if (!address) return 0;

    try {
      const score: bigint = await this.stakeArena.bestScore(address);
      return Number(score);
    } catch (error) {
      console.error('Error fetching best score:', error);
      return 0;
    }
  }

  /**
   * @deprecated Not used in vault mode (stakes tracked server-side, not on-chain per match)
   * In vault mode, stakes go directly to server wallet on deposit
   */
  async getCurrentStake(matchId: string, playerAddress?: string): Promise<string> {
    if (!this.stakeArena) return '0';
    
    const address = playerAddress || this.address;
    if (!address) return '0';

    try {
      // Convert string match ID to bytes32
      const matchIdBytes32 = ethers.id(matchId);
      const stake: bigint = await this.stakeArena.getStake(matchIdBytes32, address);
      return Math.floor(parseFloat(ethers.formatEther(stake))).toString();
    } catch (error) {
      console.error('Error fetching current stake:', error);
      return '0';
    }
  }

  getAddress(): string | null {
    return this.address;
  }

  isConnected(): boolean {
    return this.address !== null;
  }

  /**
   * Set up listeners for wallet events (account changes, network changes, etc.)
   * Call this after connecting the wallet
   */
  setupWalletListeners(onAccountChange?: (address: string | null) => void, onNetworkChange?: () => void): void {
    if (!window.ethereum) return;

    // Listen for account changes
    window.ethereum.on('accountsChanged', (accounts: string[]) => {
      console.log('🔄 Account changed');
      if (accounts.length === 0) {
        console.log('❌ Wallet disconnected');
        this.address = null;
        this.signer = null;
        if (onAccountChange) onAccountChange(null);
      } else {
        console.log('✅ New account:', accounts[0]);
        this.address = accounts[0];
        if (onAccountChange) onAccountChange(accounts[0]);
      }
    });

    // Listen for network changes
    window.ethereum.on('chainChanged', async (chainId: string) => {
      const chainIdBigInt = BigInt(chainId);
      console.log('🔄 Network changed to chain ID:', chainIdBigInt);
      
      // Don't show errors if we're in the connection process (e.g., auto-adding network)
      if (this.isConnecting) {
        console.log('⏳ Network change detected during connection process, ignoring...');
        return;
      }
      
      if (chainIdBigInt !== NETWORK_CONFIG.chainId) {
        console.warn(`⚠️  You are no longer on ${NETWORK_CONFIG.chainName}`);
        console.warn('Please switch back to continue playing');
        if (onNetworkChange) onNetworkChange();
      } else {
        console.log(`✅ Back on ${NETWORK_CONFIG.chainName}`);
      }
      
      // Reload the page on network change (recommended by MetaMask)
      // window.location.reload();
    });

    console.log('👂 Wallet event listeners set up');
  }

  /**
   * Get the current network information
   */
  async getCurrentNetwork(): Promise<{ chainId: bigint; name: string } | null> {
    if (!this.provider) return null;

    try {
      const network = await this.provider.getNetwork();
      return {
        chainId: network.chainId,
        name: network.name,
      };
    } catch (error) {
      console.error('Error getting current network:', error);
      return null;
    }
  }

  /**
   * Check if the current network is correct
   */
  async isOnCorrectNetwork(): Promise<boolean> {
    const network = await this.getCurrentNetwork();
    return network ? network.chainId === NETWORK_CONFIG.chainId : false;
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}

