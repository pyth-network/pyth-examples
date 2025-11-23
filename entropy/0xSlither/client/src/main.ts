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
  private hasDeposited = false; // Track if player has deposited to vault
  private lastPelletTokens: number = 0; // Track pellet tokens for UI updates
  private readonly FIXED_DEPOSIT_AMOUNT = '1'; // Fixed 1 SSS deposit amount

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
      
      // Update pellet token display during gameplay
      if (this.isPlaying && !this.isSpectating) {
        this.updatePelletTokensFromGameState();
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
        
        // Initialize pellet token tracking
        this.lastPelletTokens = 0;
        this.ui.updateCurrentScore('0.00'); // Start at 0 pellet tokens
      }
    });

    this.game.onDead(async (score) => {
      console.log('Player died with score:', score);
      this.isPlaying = false;
      this.isSpectating = true;
      this.ui.hideGameControls(); // Hide tap out button after death
      
      // Reset tracking
      this.lastPelletTokens = 0;
      
      // VAULT MODE: On death, player loses everything
      // No blockchain settlement needed - just show death screen
      console.log('💀 Death in vault mode - deposit and pellet tokens lost');
      
      // Update best score if needed
      if (this.wallet && this.walletAddress) {
        const bestScore = await this.wallet.getBestScore();
        this.ui.updateDeathScreenWithBestScore(score, bestScore);
      }
      
      // Show death screen with respawn option
      this.ui.showDeathScreen(score);
    });

    this.ui.onDeposit(async () => {
      await this.handleDeposit();
    });

    this.ui.onPlay(async () => {
      await this.startPlaying();
    });

    this.ui.onRespawn(async () => {
      // Reset state and return to home page for a clean restart
      this.isPlaying = false;
      this.isSpectating = false;
      this.ui.hideDeathScreen();
      this.ui.resetDepositState(); // Reset deposit state (was resetStakeState)
      this.ui.showStartScreen();
      
      // Reset tracking
      this.lastPelletTokens = 0;
    });

    this.ui.onConnectWallet(async () => {
      return await this.connectWallet();
    });

    this.ui.onTapOut(async () => {
      await this.handleTapOut();
    });

    this.ui.onRetry(async () => {
      // VAULT MODE: No retry needed - server handles payouts
      // Just hide loading and return to start screen
      this.ui.hideLoading();
      this.ui.showStartScreen();
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

  private async handleDeposit(): Promise<void> {
    // Wallet is required to deposit
    if (!this.walletAddress) {
      alert('Please connect your wallet first');
      return;
    }

    // Vault mode: deposit directly to server vault
    if (STAKE_ARENA_ADDRESS) {
      try {
        console.log(`Depositing ${this.FIXED_DEPOSIT_AMOUNT} SSS to vault...`);
        this.ui.showLoading(`Depositing ${this.FIXED_DEPOSIT_AMOUNT} SSS... Please sign the transaction in MetaMask.`);
        
        // Deposit to vault (no match ID needed)
        await this.wallet!.depositToVault(this.FIXED_DEPOSIT_AMOUNT);

        console.log('✅ Successfully deposited to vault');
        this.ui.hideLoading();
        this.ui.setDeposited(); // Update UI to show deposited state
        this.hasDeposited = true;
        
        // Update balance
        const balance = await this.wallet!.getTokenBalance();
        this.ui.updateTokenBalance(balance);
      } catch (error: any) {
        console.error('Error during deposit process:', error);
        this.ui.hideLoading();
        
        // Check if user rejected the transaction
        if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
          alert('Transaction rejected. Please deposit to play.');
        } else {
          alert('Failed to deposit tokens. See console for details.');
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


  private async handleTapOut(): Promise<void> {
    if (!this.wallet || !this.walletAddress) {
      console.log('Cannot tap out: wallet not connected');
      return;
    }

    // Get current pellet tokens before disconnecting
    const playerSnake = this.game.getPlayerSnake();
    const pelletTokens = playerSnake ? playerSnake.pelletTokens : 0;
    const currentScore = playerSnake ? playerSnake.segments.length : 0;

    console.log(`Tapping out with ${pelletTokens.toFixed(2)} pellet tokens (score: ${currentScore})`);

    // Step 1: Immediately disconnect from game (remove player from server)
    this.isPlaying = false;
    this.isSpectating = true;
    this.ui.hideGameControls();
    this.ui.hideDeathScreen();
    
    // Get match ID from server state
    const state = this.game.getCurrentState();
    const matchId = state?.matchId || 'permanent-match-v1';
    
    // Send tap out message to server (server handles pellet token payout)
    const tapOutMsg: TapOutMessage = {
      type: MessageType.TAPOUT,
      matchId: matchId,
    };
    this.game.sendCustomMessage(tapOutMsg);

    // VAULT MODE: Server handles pellet token payout via direct transfer
    // No on-chain transaction needed from client
    this.ui.showLoading(`Tapping out... Server will pay out ${pelletTokens.toFixed(2)} SSS in pellet tokens.`);
    
    // Wait a moment for server to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    this.ui.hideLoading();
    
    // Update balance and return to home screen
    const balance = await this.wallet.getTokenBalance();
    this.ui.updateTokenBalance(balance);
    
    this.isSpectating = false;
    this.ui.resetDepositState();
    this.ui.showStartScreen();
    
    console.log('✅ Tapped out successfully - pellet tokens paid by server');
  }

  /**
   * Update pellet tokens display from game state
   * In vault mode, we only track pellet tokens (no stake tracking)
   */
  private updatePelletTokensFromGameState(): void {
    if (!this.game) return;

    const playerSnake = this.game.getPlayerSnake();
    if (!playerSnake) return;

    const currentPelletTokens = playerSnake.pelletTokens || 0;

    // Update UI if pellet tokens changed
    if (currentPelletTokens !== this.lastPelletTokens) {
      this.lastPelletTokens = currentPelletTokens;
      this.ui.updateCurrentScore(currentPelletTokens.toFixed(2));
    }
  }

  private isSpectatorMode(): boolean {
    return this.isSpectating || !this.isPlaying;
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

