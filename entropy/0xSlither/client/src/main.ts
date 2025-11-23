import { Game } from './Game';
import { Renderer } from './Renderer';
import { InputHandler } from './InputHandler';
import { UI } from './UI';
import { WalletService } from './WalletService';
import { TICK_INTERVAL, MessageType, TapOutMessage } from '@0xslither/shared';

// WebSocket server URL (adjust for production)
const WSS_URL = import.meta.env.VITE_WSS_URL;

// Contract addresses (configure these after deployment)
const STAKE_ARENA_ADDRESS = import.meta.env.VITE_STAKE_ARENA_ADDRESS as string;

// Match ID (will be provided by server)
let CURRENT_MATCH_ID: string | null = null; // Start as null, wait for server

class GameClient {
  private game: Game;
  private renderer: Renderer;
  private inputHandler: InputHandler;
  private ui: UI;
  private wallet: WalletService | null = null;
  private canvas: HTMLCanvasElement;
  private isPlaying = false;
  private isSpectating = false;
  private lastInputTime = 0;
  private inputThrottle = 50; // Send input at most every 50ms
  private animationFrameId: number | null = null;
  private walletAddress: string | null = null;
  private hasStaked = false;
  private currentStake: number = 0; // Cached stake value (fetched from blockchain)
  private lastPelletTokens: number = 0; // Track last known pellet tokens for change detection
  private lastSnakeLength: number = 0; // Track snake length to detect when we eat another snake
  private matchIdReceived = false; // Track if we've received match ID from server

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.renderer = new Renderer(this.canvas);
    this.inputHandler = new InputHandler(this.canvas);
    this.ui = new UI();
    this.game = new Game(WSS_URL);

    // Wallet is now required
    this.wallet = new WalletService();

    this.setupEventHandlers();
    this.ui.showStartScreen();
    this.checkWalletAvailability();
    
    // Start game loop immediately for spectator mode
    this.gameLoop();
  }

  private checkWalletAvailability(): void {
    if (!this.isWalletAvailable()) {
      this.ui.setWalletNotAvailable();
    }
  }

  private isWalletAvailable(): boolean {
    return typeof (window as any).ethereum !== 'undefined';
  }

  private setupEventHandlers(): void {
    this.game.onConnected(() => {
      console.log('Connected to game server');
      this.ui.updateConnectionStatus('Connected');
    });

    this.game.onStateUpdate((state) => {
      this.ui.updateLeaderboard(state);
      this.ui.renderEntropyInfo(state);
      
      // CRITICAL: Update match ID from server (only once)
      // This must happen BEFORE any staking to ensure players stake into the correct match
      if (state.matchId && !this.matchIdReceived) {
        CURRENT_MATCH_ID = state.matchId;
        this.matchIdReceived = true;
        console.log('✅ Match ID received from server:', CURRENT_MATCH_ID);
        
        // Now that we have the match ID, we can safely enable staking
        // (if wallet is already connected)
        if (this.walletAddress && STAKE_ARENA_ADDRESS) {
          this.ui.enableStakeButton();
          console.log('Stake button enabled - ready to enter match');
        }
      }
      
      // Event-based score update: only update when pellet tokens change
      if (this.isPlaying && !this.isSpectating) {
        this.updateScoreFromGameState();
      }
    });

    this.game.onPlayerIdReceived((playerId) => {
      console.log('Player ID received, enabling gameplay:', playerId);
      // Now that we have a player ID, we can start playing
      if (!this.isPlaying) {
        this.isPlaying = true;
        this.ui.hideStartScreen();
        this.ui.hideDeathScreen();
        
        // Show tap out button during gameplay
        this.ui.showGameControls();
        this.ui.setTapOutEnabled(true);
        
        // Initialize stake value from blockchain once when gameplay starts
        if (STAKE_ARENA_ADDRESS) {
          this.initializeScore();
        }
      }
    });

    this.game.onDead(async (score) => {
      console.log('Player died with score:', score);
      this.isPlaying = false;
      this.isSpectating = true;
      this.ui.hideGameControls(); // Hide tap out button after death
      
      // Reset tracking
      this.lastPelletTokens = 0;
      this.lastSnakeLength = 0;
      
      // Show loading screen while blockchain processes death
      this.ui.showLoading('Processing death on blockchain...');
      
      // Wait for the player to become inactive on-chain
      await this.waitForDeathSettlement();
      
      // Update stats after settlement
      await this.updateScoreAfterDeath(score);
      console.log('Death settled on blockchain');
      
      // Now show death screen with respawn option
      this.ui.hideLoading();
      this.ui.showDeathScreen(score);
    });

    this.ui.onStake(async () => {
      await this.handleStake();
    });

    this.ui.onPlay(async () => {
      await this.startPlaying();
    });

    this.ui.onRespawn(async () => {
      // Reset state and return to home page for a clean restart
      this.isPlaying = false;
      this.isSpectating = false;
      this.ui.hideDeathScreen();
      this.ui.resetStakeState();
      this.ui.showStartScreen();
      
      // Reset tracking
      this.currentStake = 0;
      this.lastPelletTokens = 0;
      this.lastSnakeLength = 0;
    });

    this.ui.onConnectWallet(async () => {
      return await this.connectWallet();
    });

    this.ui.onTapOut(async () => {
      await this.handleTapOut();
    });

    this.ui.onRetry(async () => {
      // Get score again in case we need to retry
      const playerSnake = this.game.getPlayerSnake();
      const currentScore = playerSnake ? playerSnake.segments.length : 0;
      await this.attemptTapOutTransaction(currentScore);
    });
  }

  private async connectWallet(): Promise<string | null> {
    if (!this.wallet) {
      console.error('Wallet service not available');
      return null;
    }

    try {
      this.ui.showLoading('Connecting to MetaMask...');
      this.walletAddress = await this.wallet.connectWallet();
      
      if (this.walletAddress) {
        // Initialize contracts if blockchain enabled
        if (STAKE_ARENA_ADDRESS) {
          this.wallet.initializeContracts(STAKE_ARENA_ADDRESS);
          console.log('✅ Wallet connected and contracts initialized');
        } else {
          console.log('✅ Wallet connected (blockchain features disabled)');
        }
        
        // Set up wallet event listeners
        this.wallet.setupWalletListeners(
          // On account change
          (newAddress) => {
            if (newAddress) {
              console.log('Account changed to:', newAddress);
              this.walletAddress = newAddress;
              this.ui.updateWalletAddress(newAddress);
              // Update balance for new account
              this.wallet?.getTokenBalance().then(balance => {
                this.ui.updateTokenBalance(balance);
              });
            } else {
              console.log('Wallet disconnected');
              this.walletAddress = null;
              this.ui.setWalletNotConnected();
            }
          },
          // On network change
          async () => {
            console.warn('⚠️ Network changed! Checking if on correct network...');
            const isCorrect = await this.wallet?.isOnCorrectNetwork();
            if (!isCorrect) {
              this.ui.showError('Wrong network! Please switch back to 0xSlither Saga Chainlet');
            }
          }
        );
        
        // Update balance
        const balance = await this.wallet.getTokenBalance();
        this.ui.updateTokenBalance(balance);
      }
      
      this.ui.hideLoading();
      return this.walletAddress;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      this.ui.hideLoading();
      return null;
    }
  }

  private async handleStake(): Promise<void> {
    // Wallet is required to stake
    if (!this.walletAddress) {
      alert('Please connect your wallet first');
      return;
    }

    // CRITICAL: Match ID must be received from server before staking
    if (!CURRENT_MATCH_ID) {
      alert('Waiting for match ID from server... Please try again in a moment.');
      return;
    }

    // If blockchain enabled, stake
    if (STAKE_ARENA_ADDRESS) {
      const stakeAmount = '1'; // Fixed stake amount
      
      try {
        console.log(`Staking ${stakeAmount} SSS into match ${CURRENT_MATCH_ID}...`);
        this.ui.showLoading(`Staking ${stakeAmount} SSS... Please sign the transaction in MetaMask.`);
        
        // Enter match with server's match ID
        await this.wallet!.enterMatch(CURRENT_MATCH_ID, stakeAmount);

        console.log('✅ Successfully staked and entered match:', CURRENT_MATCH_ID);
        this.ui.hideLoading();
        this.ui.setStaked();
        
        // Update balance
        const balance = await this.wallet!.getTokenBalance();
        this.ui.updateTokenBalance(balance);
      } catch (error: any) {
        console.error('Error during stake process:', error);
        this.ui.hideLoading();
        
        // Check if user rejected the transaction
        if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
          alert('Transaction rejected. Please stake to play.');
        } else {
          alert('Failed to stake tokens. See console for details.');
        }
        return;
      }
    }
  }

  private async startPlaying(): Promise<void> {
    // Wallet is required to play
    if (!this.walletAddress) {
      alert('Please connect your wallet to play');
      return;
    }

    // Show loading state while waiting for server connection and player ID
    this.ui.showLoading('Connecting to game server...');
    
    // Wait for WebSocket connection before joining (prevent race condition)
    if (!this.game.isConnected()) {
      console.log('WebSocket not connected yet, waiting...');
      await this.waitForConnection();
    }
    
    this.ui.showLoading('Joining game...');
    
    // Use wallet address as the player name
    // The actual playing state will be enabled when we receive the player ID from the server
    this.isSpectating = false;
    this.game.join(this.walletAddress, this.walletAddress);
    
    // Hide loading after a short delay (the onPlayerIdReceived callback will handle the rest)
    setTimeout(() => {
      this.ui.hideLoading();
    }, 1000);
  }
  
  private async waitForConnection(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.game.isConnected()) {
          clearInterval(checkInterval);
          console.log('WebSocket connected!');
          resolve();
        }
      }, 100); // Check every 100ms
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        console.error('WebSocket connection timeout');
        alert('Could not connect to game server. Please refresh and try again.');
        resolve();
      }, 10000);
    });
  }

  private async waitForDeathSettlement(): Promise<void> {
    if (!this.wallet || !this.walletAddress || !STAKE_ARENA_ADDRESS || !CURRENT_MATCH_ID) {
      // No blockchain or no match ID, just wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));
      return;
    }

    console.log('Waiting for death to settle on blockchain...');
    console.log(`Checking match: ${CURRENT_MATCH_ID}, address: ${this.walletAddress}`);
    
    // Poll until player is no longer active (max 20 seconds)
    const maxAttempts = 20; // 40 * 500ms = 20 seconds
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const isActive = await this.wallet.isActive(CURRENT_MATCH_ID, this.walletAddress);
        
        console.log(`[Poll ${attempts + 1}/${maxAttempts}] isActive: ${isActive} (${(attempts * 500) / 1000}s elapsed)`);
        
        if (!isActive) {
          console.log(`✅ Death settled on blockchain after ${(attempts * 500) / 1000}s`);
          return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      } catch (error) {
        console.error(`[Poll ${attempts + 1}] Error checking active status:`, error);
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
    }
    
    console.warn('⚠️ Death settlement timeout after 20s - proceeding anyway (server may still be processing)');
  }

  private async handleTapOut(): Promise<void> {
    if (!this.wallet || !this.walletAddress) {
      console.log('Cannot tap out: wallet not connected');
      return;
    }

    if (!STAKE_ARENA_ADDRESS || !CURRENT_MATCH_ID) {
      console.log('Cannot tap out: blockchain not enabled or match ID missing');
      return;
    }

    // Get current score before disconnecting
    const playerSnake = this.game.getPlayerSnake();
    const currentScore = playerSnake ? playerSnake.segments.length : 0;

    // Step 1: Immediately disconnect from game (remove player from server)
    this.isPlaying = false;
    this.isSpectating = true;
    this.ui.hideGameControls();
    this.ui.hideDeathScreen();
    
    // Send tap out message to server to remove snake immediately
    const tapOutMsg: TapOutMessage = {
      type: MessageType.TAPOUT,
      matchId: CURRENT_MATCH_ID,
    };
    this.game.sendCustomMessage(tapOutMsg);

    // Step 2: Attempt to withdraw stake via blockchain transaction with score
    await this.attemptTapOutTransaction(currentScore);
  }

  private async attemptTapOutTransaction(score: number): Promise<void> {
    if (!this.wallet || !this.walletAddress || !CURRENT_MATCH_ID) return;

    try {
      this.ui.showLoading('Checking match status...');
      
      // Check if player is still active in the match before attempting tap out
      const isActive = await this.wallet.isActive(CURRENT_MATCH_ID, this.walletAddress);
      
      if (!isActive) {
        // Player is no longer active (already died/disconnected and stake was settled)
        console.log('Player is no longer active in match - stake already settled by server');
        this.ui.hideLoading();
        
        // Just return to home screen without attempting tapOut transaction
        this.isSpectating = false;
        this.ui.resetStakeState();
        this.ui.showStartScreen();
        this.ui.showError('You are no longer active in the match. Your stake was already settled.', 5000);
        return;
      }
      
      this.ui.showLoading('Sign transaction to withdraw your stake and record your score...');
      
      // Call contract to withdraw with score
      const success = await this.wallet.tapOut(CURRENT_MATCH_ID, score);
      
      if (success) {
        console.log(`✅ Successfully tapped out, withdrawn stake, and recorded score: ${score}`);
        this.ui.hideLoading();
        
        // Update balance and stats
        const balance = await this.wallet.getTokenBalance();
        this.ui.updateTokenBalance(balance);
        
        // Reset tracking
        this.currentStake = 0;
        this.lastPelletTokens = 0;
        this.lastSnakeLength = 0;
        
        // Return to home screen
        this.isSpectating = false;
        this.ui.resetStakeState();
        this.ui.showStartScreen();
      } else {
        // Transaction failed
        this.ui.showLoadingWithRetry('Transaction failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Error tapping out:', error);
      
      // Check if user rejected the transaction
      if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
        this.ui.showLoadingWithRetry('Transaction rejected. Click retry to sign again.');
      } else {
        this.ui.showLoadingWithRetry('Transaction failed. Click retry to try again.');
      }
    }
  }

  private isSpectatorMode(): boolean {
    return this.isSpectating || !this.isPlaying;
  }

  /**
   * Initialize score once when gameplay starts (fetches stake from blockchain)
   */
  private async initializeScore(): Promise<void> {
    if (!this.wallet || !this.walletAddress || !CURRENT_MATCH_ID) return;

    try {
      const stakeString = await this.wallet.getCurrentStake(CURRENT_MATCH_ID);
      this.currentStake = parseFloat(stakeString);
      this.lastPelletTokens = 0;
      this.lastSnakeLength = 5; // Initial snake length
      
      // Display initial score (stake only, no pellet tokens yet)
      this.ui.updateCurrentScore(this.currentStake.toFixed(2));
      console.log('Initial score initialized:', this.currentStake);
    } catch (error) {
      console.error('Error initializing score:', error);
    }
  }

  /**
   * Event-based score update triggered by game state changes
   * Updates UI when pellet tokens change or when we eat another snake
   */
  private updateScoreFromGameState(): void {
    if (!this.game) return;

    const playerSnake = this.game.getPlayerSnake();
    if (!playerSnake) return;

    const currentPelletTokens = playerSnake.pelletTokens || 0;
    const currentLength = playerSnake.segments.length;

    // Detect if we ate another snake (significant length increase)
    // Pellets give ~2-4 segments, snakes give much more
    const lengthIncrease = currentLength - this.lastSnakeLength;
    const ateAnotherSnake = lengthIncrease > 10; // Threshold for snake consumption

    if (ateAnotherSnake) {
      // Snake was eaten - their stake was transferred to us
      // Refetch stake from blockchain
      console.log('Detected snake consumption, refetching stake from blockchain');
      this.refetchStake();
    }

    // Update length tracking
    this.lastSnakeLength = currentLength;

    // Update UI if pellet tokens changed (happens on pellet eat or snake eat)
    if (currentPelletTokens !== this.lastPelletTokens) {
      this.lastPelletTokens = currentPelletTokens;
      
      // Combined score = stake + pellet tokens
      const totalScore = this.currentStake + currentPelletTokens;
      
      this.ui.updateCurrentScore(totalScore.toFixed(2));
    }
  }

  /**
   * Refetch stake from blockchain (when eating another snake)
   */
  private async refetchStake(): Promise<void> {
    if (!this.wallet || !this.walletAddress || !CURRENT_MATCH_ID) return;

    try {
      const stakeString = await this.wallet.getCurrentStake(CURRENT_MATCH_ID);
      const newStake = parseFloat(stakeString);
      
      if (newStake !== this.currentStake) {
        console.log(`Stake updated: ${this.currentStake.toFixed(2)} → ${newStake.toFixed(2)} SSS`);
        this.currentStake = newStake;
        
        // Update UI with new total score
        const playerSnake = this.game?.getPlayerSnake();
        const pelletTokens = playerSnake?.pelletTokens || 0;
        const totalScore = this.currentStake + pelletTokens;
        this.ui.updateCurrentScore(totalScore.toFixed(2));
      }
    } catch (error) {
      console.error('Error refetching stake:', error);
    }
  }

  private async updateScoreAfterDeath(finalScore: number): Promise<void> {
    if (!this.wallet || !this.walletAddress || !CURRENT_MATCH_ID) return;

    try {
      const bestScoreFromChain = await this.wallet.getBestScore();
      const currentStake = await this.wallet.getCurrentStake(CURRENT_MATCH_ID);
      
      // Display the higher of the final score or the on-chain best score
      const displayScore = Math.max(finalScore, bestScoreFromChain);
      
      console.log(`Final score: ${finalScore}, On-chain best: ${bestScoreFromChain}, Displaying: ${displayScore}`);
      
      // Score is just the stake after death (pellet tokens are settled)
      this.ui.updateCurrentScore(currentStake);
      
      // Update death screen with best score info
      this.ui.updateDeathScreenWithBestScore(finalScore, displayScore);
    } catch (error) {
      console.error('Error updating on-chain stats after death:', error);
    }
  }

  private gameLoop = (): void => {
    this.update();
    this.render();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(): void {
    if (!this.isPlaying) return;

    const playerSnake = this.game.getPlayerSnake();
    if (!playerSnake) return;

    // Send input to server (throttled)
    const now = Date.now();
    if (now - this.lastInputTime > this.inputThrottle) {
      const targetAngle = this.inputHandler.getTargetAngle(
        playerSnake.head[0],
        playerSnake.head[1],
        this.renderer.getCamera()
      );
      this.game.sendInput(targetAngle);
      this.lastInputTime = now;
    }
  }

  private render(): void {
    const state = this.game.getCurrentState();
    if (!state) return;

    const playerId = this.game.getPlayerId();
    const isSpectator = this.isSpectatorMode();

    // Get interpolated state for smoother visuals
    const interpolatedState = this.game.getInterpolatedState();
    const renderState = interpolatedState || state;

    if (isSpectator) {
      // Filter out dead player's snake from rendering
      const filteredState = {
        ...renderState,
        snakes: renderState.snakes.filter((snake: any) => snake.id !== playerId)
      };
      this.renderer.render(filteredState, null);
    } else {
      this.renderer.render(renderState, playerId);
    }
  }
}

// Initialize the game when the page loads
new GameClient();

console.log('%c0xSlither Game Started!', 'color: #9B59B6; font-size: 20px; font-weight: bold;');
console.log('Controls: Move your mouse to control your snake');
console.log('⚠️  Wallet connection required to play');
if (STAKE_ARENA_ADDRESS) {
  console.log('🔗 Blockchain features enabled (Native SSS token)');
} else {
  console.log('ℹ️  Set VITE_STAKE_ARENA_ADDRESS to enable blockchain features');
}

