import { StateMessage } from '@0xslither/shared';

export class UI {
  private startScreen: HTMLElement;
  private deathScreen: HTMLElement;
  private deathScreenTitle: HTMLElement;
  private leaderboard: HTMLElement;
  private leaderboardList: HTMLElement;
  private connectionStatus: HTMLElement;
  private playButton: HTMLButtonElement;
  private respawnButton: HTMLButtonElement;
  private finalScoreElement: HTMLElement;
  private bestScoreDisplay: HTMLElement;
  private connectWalletButton: HTMLButtonElement;
  private walletStatus: HTMLElement;
  private stakeSection: HTMLElement;
  private stakeButton: HTMLButtonElement;
  private tokenBalance: HTMLElement;
  private onChainStats: HTMLElement;
  private currentScore: HTMLElement;
  private gameControls: HTMLElement;
  private tapOutButton: HTMLButtonElement;
  private loadingOverlay: HTMLElement;
  private loadingMessage: HTMLElement;
  private retryButton: HTMLButtonElement;

  constructor() {
    this.startScreen = document.getElementById('startScreen')!;
    this.deathScreen = document.getElementById('deathScreen')!;
    this.deathScreenTitle = document.getElementById('deathScreenTitle')!;
    this.leaderboard = document.getElementById('leaderboard')!;
    this.leaderboardList = document.getElementById('leaderboardList')!;
    this.connectionStatus = document.getElementById('connectionStatus')!;
    this.playButton = document.getElementById('playButton') as HTMLButtonElement;
    this.respawnButton = document.getElementById('respawnButton') as HTMLButtonElement;
    this.finalScoreElement = document.getElementById('finalScore')!;
    this.bestScoreDisplay = document.getElementById('bestScoreDisplay')!;
    this.connectWalletButton = document.getElementById('connectWalletButton') as HTMLButtonElement;
    this.walletStatus = document.getElementById('walletStatus')!;
    this.stakeSection = document.getElementById('stakeSection')!;
    this.stakeButton = document.getElementById('stakeButton') as HTMLButtonElement;
    this.tokenBalance = document.getElementById('tokenBalance')!;
    this.onChainStats = document.getElementById('onChainStats')!;
    this.currentScore = document.getElementById('currentScore')!;
    this.gameControls = document.getElementById('gameControls')!;
    this.tapOutButton = document.getElementById('tapOutButton') as HTMLButtonElement;
    this.loadingOverlay = document.getElementById('loadingOverlay')!;
    this.loadingMessage = document.getElementById('loadingMessage')!;
    this.retryButton = document.getElementById('retryButton') as HTMLButtonElement;
  }

  showStartScreen(): void {
    this.startScreen.classList.remove('hidden');
    this.deathScreen.classList.add('hidden');
    this.leaderboard.classList.add('hidden');
  }

  hideStartScreen(): void {
    this.startScreen.classList.add('hidden');
    this.leaderboard.classList.remove('hidden');
    this.gameControls.classList.remove('hidden');
    this.onChainStats.classList.remove('hidden');
  }

  showDeathScreen(score: number): void {
    this.deathScreen.classList.remove('hidden');
    this.finalScoreElement.textContent = score.toString();
    
    // Reset title to default
    this.deathScreenTitle.textContent = 'You Died!';
    this.deathScreenTitle.style.color = '#00ff88';
    
    // Set best score to loading initially
    const scoreSpan = this.bestScoreDisplay.querySelector('.score');
    if (scoreSpan) {
      scoreSpan.textContent = 'Loading...';
    }
  }

  hideDeathScreen(): void {
    this.deathScreen.classList.add('hidden');
  }

  updateConnectionStatus(status: string): void {
    this.connectionStatus.textContent = status;
    
    if (status === 'Connected') {
      this.connectionStatus.style.background = 'rgba(0, 255, 136, 0.2)';
      this.connectionStatus.style.borderColor = 'rgba(0, 255, 136, 0.5)';
      this.connectionStatus.style.boxShadow = '0 0 15px rgba(0, 255, 136, 0.3)';
    } else if (status === 'Disconnected') {
      this.connectionStatus.style.background = 'rgba(255, 51, 102, 0.2)';
      this.connectionStatus.style.borderColor = 'rgba(255, 51, 102, 0.5)';
      this.connectionStatus.style.boxShadow = '0 0 15px rgba(255, 51, 102, 0.3)';
    } else {
      this.connectionStatus.style.background = 'rgba(255, 204, 0, 0.2)';
      this.connectionStatus.style.borderColor = 'rgba(255, 204, 0, 0.5)';
      this.connectionStatus.style.boxShadow = '0 0 15px rgba(255, 204, 0, 0.3)';
    }
  }

  updateLeaderboard(state: StateMessage): void {
    this.leaderboardList.innerHTML = '';
    
    state.leaderboard.forEach(([name, score, address]: [string, number, string?], index: number) => {
      const li = document.createElement('li');
      // Since name is now the wallet address, just display the shortened address
      const displayName = this.shortenAddress(address || name);
      li.innerHTML = `
        <span class="name">${index + 1}. ${displayName}</span>
        <span class="score">${score}</span>
      `;
      this.leaderboardList.appendChild(li);
    });
  }

  private shortenAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }

  onPlay(callback: () => void): void {
    this.playButton.addEventListener('click', () => {
      callback();
    });
  }

  onRespawn(callback: () => void): void {
    this.respawnButton.addEventListener('click', () => {
      callback();
    });
  }

  onConnectWallet(callback: () => Promise<string | null>): void {
    this.connectWalletButton.addEventListener('click', async () => {
      this.connectWalletButton.disabled = true;
      this.walletStatus.textContent = 'Connecting...';
      this.walletStatus.className = '';
      
      const address = await callback();
      
      this.connectWalletButton.disabled = false;
      
      if (address) {
        this.setWalletConnected(address);
      } else {
        this.walletStatus.textContent = 'Connection failed. Please try again.';
        this.walletStatus.className = 'error';
      }
    });
  }

  setWalletConnected(address: string): void {
    this.connectWalletButton.textContent = 'Wallet Connected';
    this.connectWalletButton.disabled = true;
    this.walletStatus.textContent = `Connected: ${this.shortenAddress(address)}`;
    this.walletStatus.className = 'success';
    this.stakeSection.classList.remove('hidden');
    // Don't enable stake button yet - wait for match ID from server
    this.stakeButton.disabled = true;
    this.stakeButton.textContent = 'Waiting for match...';
  }

  enableStakeButton(): void {
    this.stakeButton.disabled = false;
    this.stakeButton.textContent = 'Stake 1 SSS';
  }

  updateWalletAddress(address: string): void {
    this.walletStatus.textContent = `Connected: ${this.shortenAddress(address)}`;
    this.walletStatus.className = 'success';
  }

  setWalletNotConnected(): void {
    this.connectWalletButton.textContent = 'Connect Wallet';
    this.connectWalletButton.disabled = false;
    this.walletStatus.textContent = 'Not connected';
    this.walletStatus.className = '';
    this.stakeSection.classList.add('hidden');
    this.playButton.classList.add('hidden');
  }

  setStaked(): void {
    this.stakeButton.textContent = '✓ Staked';
    this.stakeButton.disabled = true;
    this.playButton.classList.remove('hidden');
    this.playButton.disabled = false;
  }

  resetStakeState(): void {
    this.stakeButton.textContent = 'Stake 1 SSS';
    this.stakeButton.disabled = false;
    this.playButton.classList.add('hidden');
    this.playButton.disabled = true;
  }

  setWalletNotAvailable(): void {
    this.connectWalletButton.disabled = true;
    this.walletStatus.textContent = 'No wallet detected. Cannot play.';
    this.walletStatus.className = 'error';
  }

  updateTokenBalance(balance: string): void {
    this.tokenBalance.textContent = balance;
  }

  getStakeAmount(): string {
    return '1'; // Fixed stake amount
  }

  onStake(callback: () => void): void {
    this.stakeButton.addEventListener('click', () => {
      callback();
    });
  }

  updateCurrentScore(totalScore: string): void {
    this.currentScore.textContent = `${totalScore} SSS`;
  }

  updateDeathScreenWithBestScore(finalScore: number, bestScore: number): void {
    // Update the best score display
    const scoreSpan = this.bestScoreDisplay.querySelector('.score');
    if (scoreSpan) {
      scoreSpan.textContent = bestScore.toString();
    }

    // If it's a new high score, update the title
    if (finalScore >= bestScore && finalScore > 0) {
      this.deathScreenTitle.textContent = 'New High Score!';
      this.deathScreenTitle.style.color = '#FFD700'; // Gold color
    } else {
      this.deathScreenTitle.textContent = 'You Died!';
      this.deathScreenTitle.style.color = '#00ff88'; // Reset to default
    }
  }

  onTapOut(callback: () => void): void {
    this.tapOutButton.addEventListener('click', () => {
      callback();
    });
  }

  setTapOutEnabled(enabled: boolean): void {
    this.tapOutButton.disabled = !enabled;
  }

  showGameControls(): void {
    this.gameControls.classList.remove('hidden');
  }

  hideGameControls(): void {
    this.gameControls.classList.add('hidden');
  }

  showLoading(message: string): void {
    this.loadingMessage.textContent = message;
    this.retryButton.classList.add('hidden');
    this.loadingOverlay.classList.remove('hidden');
  }

  hideLoading(): void {
    this.loadingOverlay.classList.add('hidden');
  }

  showLoadingWithRetry(message: string): void {
    this.loadingMessage.textContent = message;
    this.retryButton.classList.remove('hidden');
    this.loadingOverlay.classList.remove('hidden');
  }

  showError(message: string, duration: number = 5000): void {
    // Create or get error notification element
    let errorNotification = document.getElementById('errorNotification');
    
    if (!errorNotification) {
      errorNotification = document.createElement('div');
      errorNotification.id = 'errorNotification';
      errorNotification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(255, 51, 102, 0.95);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        border: 2px solid rgba(255, 51, 102, 1);
        box-shadow: 0 4px 15px rgba(255, 51, 102, 0.3);
        z-index: 10000;
        max-width: 400px;
        font-family: 'Orbitron', sans-serif;
        font-size: 14px;
        animation: slideIn 0.3s ease-out;
      `;
      document.body.appendChild(errorNotification);
    }
    
    errorNotification.textContent = message;
    errorNotification.style.display = 'block';
    
    // Auto-hide after duration
    setTimeout(() => {
      if (errorNotification) {
        errorNotification.style.display = 'none';
      }
    }, duration);
  }

  onRetry(callback: () => void): void {
    this.retryButton.addEventListener('click', () => {
      callback();
    });
  }

  /**
   * Render entropy information panel showing Pyth Entropy status
   */
  renderEntropyInfo(gameState: StateMessage | null): void {
    // Create entropy info panel if it doesn't exist
    let entropyPanel = document.getElementById('entropy-panel');
    if (!entropyPanel) {
      entropyPanel = document.createElement('div');
      entropyPanel.id = 'entropy-panel';
      entropyPanel.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: rgba(15, 23, 42, 0.95);
        backdrop-filter: blur(10px);
        border: 2px solid #00ff88;
        border-radius: 12px;
        padding: 16px 20px;
        font-family: 'Orbitron', sans-serif;
        font-size: 12px;
        color: #fff;
        max-width: 300px;
        z-index: 1000;
        box-shadow: 0 0 20px rgba(0, 255, 136, 0.3), 0 4px 15px rgba(0, 0, 0, 0.5);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        animation: slideInRight 0.5s ease-out;
      `;
      
      // Add keyframe animation for slide in
      if (!document.getElementById('entropy-panel-animation')) {
        const style = document.createElement('style');
        style.id = 'entropy-panel-animation';
        style.textContent = `
          @keyframes slideInRight {
            from {
              opacity: 0;
              transform: translateX(20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.6;
            }
          }
        `;
        document.head.appendChild(style);
      }
      
      document.body.appendChild(entropyPanel);
    }

    // Only show RNG info on the start screen, not during gameplay
    const isStartScreenVisible = !this.startScreen.classList.contains('hidden');
    
    // Hide the panel if we're in-game (start screen is hidden)
    if (!isStartScreenVisible) {
      entropyPanel.style.display = 'none';
      return;
    }

    // Only show if we have game state and match ID
    if (!gameState || !gameState.matchId) {
      entropyPanel.style.display = 'none';
      return;
    }

    entropyPanel.style.display = 'block';

    // Build entropy info content
    let content = '';
    
    if (gameState.entropyPending) {
      // Waiting for Pyth Entropy reveal - animated loading state
      entropyPanel.style.borderColor = '#fbbf24';
      entropyPanel.style.boxShadow = '0 0 20px rgba(251, 191, 36, 0.4), 0 4px 15px rgba(0, 0, 0, 0.5)';
      
      content = `
        <div style="text-align: center;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px;">
            <div style="color: #fbbf24; font-size: 20px; animation: pulse 1.5s ease-in-out infinite;">⏳</div>
            <div style="color: #fbbf24; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
              Generating Seed
            </div>
          </div>
          <div style="color: #cbd5e1; font-size: 11px; line-height: 1.5;">
            Requesting randomness from<br/>
            <span style="color: #fbbf24; font-weight: 600;">Pyth Entropy</span> on Base Sepolia
          </div>
        </div>
      `;
    } else if (gameState.useFairRNG) {
      // Using Pyth Entropy - show success status with green theme
      entropyPanel.style.borderColor = '#00ff88';
      entropyPanel.style.boxShadow = '0 0 20px rgba(0, 255, 136, 0.3), 0 4px 15px rgba(0, 0, 0, 0.5)';
      
      const requestIdShort = gameState.entropyRequestId?.substring(0, 8) || 'N/A';
      const seedShort = gameState.entropySeed ? `${gameState.entropySeed.slice(0, 10)}...${gameState.entropySeed.slice(-6)}` : null;
      
      content = `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
          <div style="
            color: #00ff88; 
            font-size: 18px; 
            text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
          ">✓</div>
          <div style="
            color: #00ff88; 
            font-weight: bold; 
            font-size: 14px; 
            text-transform: uppercase;
            letter-spacing: 1px;
            text-shadow: 0 0 8px rgba(0, 255, 136, 0.3);
          ">Fair Match RNG</div>
        </div>
        <div style="color: #cbd5e1; font-size: 11px; line-height: 1.8;">
          <div style="margin-bottom: 6px; display: flex; justify-content: space-between;">
            <span style="color: #94a3b8; font-weight: 500;">Match:</span> 
            <span style="color: #fff; font-weight: 600; font-family: 'Courier New', monospace;">${gameState.matchId.slice(0, 10)}...</span>
          </div>
          ${gameState.entropyRequestId ? `
            <div style="margin-bottom: 6px; display: flex; justify-content: space-between;">
              <span style="color: #94a3b8; font-weight: 500;">Request:</span> 
              <span style="color: #00ff88; font-weight: 600; font-family: 'Courier New', monospace;">#${requestIdShort}</span>
            </div>
          ` : ''}
          ${seedShort ? `
            <div style="margin-bottom: 6px; display: flex; justify-content: space-between;">
              <span style="color: #94a3b8; font-weight: 500;">Seed:</span> 
              <span style="color: #fbbf24; font-weight: 600; font-family: 'Courier New', monospace; font-size: 10px;">${seedShort}</span>
            </div>
          ` : ''}
          ${gameState.mapType ? `
            <div style="margin-bottom: 6px; display: flex; justify-content: space-between;">
              <span style="color: #94a3b8; font-weight: 500;">Map:</span> 
              <span style="color: #fff; font-weight: 600; text-transform: capitalize;">${gameState.mapType}</span>
            </div>
          ` : ''}
          <div style="
            color: #94a3b8; 
            font-size: 10px; 
            margin-top: 10px; 
            padding-top: 10px; 
            border-top: 1px solid rgba(148, 163, 184, 0.2);
            text-align: center;
            font-weight: 500;
          ">
            Powered by <span style="color: #00ff88;">Pyth Entropy</span>
          </div>
        </div>
      `;
    } else if (gameState.useFairRNG === false) {
      // Fallback mode warning - orange/yellow theme
      entropyPanel.style.borderColor = '#fbbf24';
      entropyPanel.style.boxShadow = '0 0 20px rgba(251, 191, 36, 0.3), 0 4px 15px rgba(0, 0, 0, 0.5)';
      
      content = `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
          <div style="
            color: #fbbf24; 
            font-size: 18px;
            text-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
          ">⚠</div>
          <div style="
            color: #fbbf24; 
            font-weight: bold; 
            font-size: 13px; 
            text-transform: uppercase;
            letter-spacing: 1px;
            text-shadow: 0 0 8px rgba(251, 191, 36, 0.3);
          ">Dev Mode</div>
        </div>
        <div style="color: #cbd5e1; font-size: 11px; line-height: 1.6;">
          Using fallback RNG<br/>
          <span style="color: #94a3b8; font-size: 10px;">(not cryptographically fair)</span>
        </div>
      `;
    } else {
      // Hide if status is unknown
      entropyPanel.style.display = 'none';
    }

    entropyPanel.innerHTML = content;
  }
}

