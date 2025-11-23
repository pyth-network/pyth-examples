import { SnakeEntity } from './Snake';
import { PelletManager } from './Pellet';
import { CollisionDetection } from './CollisionDetection';
import { Leaderboard } from './Leaderboard';
import { BlockchainService } from './BlockchainService';
import { EntropyBridgeService } from './EntropyBridgeService';
import { DeterministicRNG } from './DeterministicRNG';
import {
  StateMessage,
  MessageType,
  SerializedSnake,
  SerializedPellet,
  TICK_INTERVAL,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PELLET_COUNT,
} from '@0xslither/shared';

interface PendingSnakeAdd {
  id: string;
  snake: SnakeEntity;
}

export class GameServer {
  private snakes: Map<string, SnakeEntity> = new Map();
  private pelletManager: PelletManager;
  private tickCount = 0;
  private lastTickTime = Date.now();
  private gameLoop: NodeJS.Timeout | null = null;
  private blockchain: BlockchainService | null = null;
  private permanentMatchId: string = `permanent-match-${Date.now()}`; // Unique match ID per server restart
  private entropyBridge: EntropyBridgeService | null = null;
  private matchRNG: DeterministicRNG | null = null;
  private entropyRequestId: string | null = null;
  private entropyPending: boolean = false;
  private devFallbackMode: boolean = false;
  private entropySeed: string | null = null;
  private consumedPelletsThisTick: Set<string> = new Set();
  private pelletTokensDistributed: boolean = false;
  
  // Track player stakes for kill rewards (deposited via vault)
  private playerStakes: Map<string, number> = new Map(); // address -> stake amount
  private readonly FIXED_STAKE_AMOUNT = 1; // Fixed 1 SSS stake per player
  
  // Atomic operation queues - processed at start of each tick
  private pendingAdds: PendingSnakeAdd[] = [];
  private pendingRemoves: string[] = [];

  constructor() {
    // Pellet manager will be initialized after entropy is available
    this.pelletManager = new PelletManager(PELLET_COUNT);
    console.log(`🎮 Game server initialized with permanent match ID: ${this.permanentMatchId}`);
  }

  setBlockchainService(blockchain: BlockchainService): void {
    this.blockchain = blockchain;
    
    // Initialize entropy bridge service
    this.entropyBridge = new EntropyBridgeService();
    
    // Request entropy for the permanent match in the background
    this.initializeMatchEntropy();
  }

  /**
   * Get the permanent match ID for this continuous game
   */
  getMatchId(): string {
    return this.permanentMatchId;
  }

  /**
   * Register a player's stake when they join (for kill reward tracking)
   * @param address Player's address
   * @param amount Stake amount (default: 1 SSS)
   */
  registerPlayerStake(address: string, amount: number = 1): void {
    this.playerStakes.set(address, amount);
    console.log(`💰 Registered stake: ${amount} SSS for ${address.slice(0, 8)}`);
  }

  /**
   * Initialize match entropy (non-blocking)
   * Requests randomness from Base Sepolia and initializes RNG when available
   * Uses permanent match ID for continuous gameplay
   */
  private async initializeMatchEntropy(): Promise<void> {
    if (!this.entropyBridge || !this.entropyBridge.isEnabled()) {
      console.warn('⚠️  Entropy bridge not available, using fallback RNG');
      this.devFallbackMode = true;
      return;
    }

    console.log('🎲 Initializing match entropy for permanent match...');
    this.entropyPending = true;

    try {
      // Request entropy and wait for reveal (non-blocking, runs in background)
      const seed = await this.entropyBridge.requestAndWaitForSeed(this.permanentMatchId, 60000);
      
      if (seed) {
        console.log('✅ Entropy seed received:', seed);
        
        // Store the seed for display
        this.entropySeed = seed;
        
        // Initialize deterministic RNG
        this.matchRNG = new DeterministicRNG(seed);
        console.log('✅ Deterministic RNG initialized');
        
        // Reinitialize pellet field with deterministic positions
        const deterministicPellets = this.matchRNG.getPelletPositions(PELLET_COUNT);
        this.pelletManager = new PelletManager(PELLET_COUNT, deterministicPellets);
        
        // Distribute pellet tokens after pellets are initialized
        this.distributePelletTokens();
        
        // Get map type for logging
        const mapType = this.matchRNG.getMapType();
        console.log(`🗺️  Map type: ${mapType}`);
        
        // Commit seed hash to Saga
        if (this.blockchain && this.entropyRequestId) {
          await this.blockchain.commitEntropyToSaga(this.permanentMatchId, this.entropyRequestId, seed);
          console.log('✅ Seed hash committed to Saga');
        }
        
        this.entropyPending = false;
        this.devFallbackMode = false;
        console.log('🎮 Continuous match ready with fair RNG!');
      } else {
        console.error('⏱️  Entropy timeout - falling back to non-cryptographic RNG');
        this.devFallbackMode = true;
        this.entropyPending = false;
      }
    } catch (error) {
      console.error('❌ Error initializing match entropy:', error);
      this.devFallbackMode = true;
      this.entropyPending = false;
    }
  }

  start(onTickComplete?: () => void): void {
    console.log('Game server started');
    this.gameLoop = setInterval(() => {
      this.tick();
      // Call callback after each tick to synchronize broadcasts
      if (onTickComplete) {
        onTickComplete();
      }
    }, TICK_INTERVAL);
  }

  stop(): void {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }
  }

  /**
   * Process pending add/remove operations atomically at the start of each tick
   * This prevents race conditions from snakes being added/removed mid-tick
   */
  private processPendingOperations(): void {
    // Process removals first
    for (const snakeId of this.pendingRemoves) {
      this.snakes.delete(snakeId);
      console.log(`Snake ${snakeId} removed (queued operation)`);
    }
    this.pendingRemoves = [];

    // Then process additions - use the already-created snake instances
    for (const addOp of this.pendingAdds) {
      this.snakes.set(addOp.id, addOp.snake);
      console.log(`Snake ${addOp.snake.name} (${addOp.id}) added to game (queued operation)`);
    }
    this.pendingAdds = [];
  }

  /**
   * Internal method to create a snake immediately (called during tick processing)
   */
  private createSnakeImmediate(id: string, name: string, address?: string): SnakeEntity {
    let x: number, y: number, color: string;
    
    if (this.matchRNG && address) {
      // Deterministic mode: use entropy-derived spawn and color
      const existingPositions = Array.from(this.snakes.values())
        .filter(s => s.alive)
        .map(s => ({ x: s.headPosition.x, y: s.headPosition.y }));
      
      const position = this.matchRNG.getSpawnPositionWithRetry(address, existingPositions, 10);
      x = position.x;
      y = position.y;
      color = this.matchRNG.getSnakeColor(address);
      
      console.log(`✅ Deterministic spawn for ${address.slice(0, 8)}... at (${x.toFixed(0)}, ${y.toFixed(0)})`);
    } else {
      // Fallback mode: random spawn
      const margin = 500;
      x = margin + Math.random() * (WORLD_WIDTH - 2 * margin);
      y = margin + Math.random() * (WORLD_HEIGHT - 2 * margin);
      
      // Generate color based on player ID or address
      const seedString = address || id;
      const hue = parseInt(seedString.slice(-6), 36) % 360;
      color = `hsl(${hue}, 70%, 60%)`;
      
      if (this.devFallbackMode) {
        console.warn(`⚠️  Fallback spawn for ${name} at (${x.toFixed(0)}, ${y.toFixed(0)}) - not deterministic`);
      }
    }
    
    return new SnakeEntity(id, name, x, y, color, address);
  }

  private tick(): void {
    const now = Date.now();
    const deltaTime = (now - this.lastTickTime) / 1000; // Convert to seconds
    this.lastTickTime = now;
    this.tickCount++;

    // Process pending operations atomically at the start of tick
    this.processPendingOperations();

    // Distribute pellet tokens if not already done (fallback mode)
    if (!this.pelletTokensDistributed && this.snakes.size > 0) {
      this.distributePelletTokens();
    }

    // Clear consumed pellets tracking for this tick
    this.consumedPelletsThisTick.clear();

    // Update all snakes
    for (const snake of this.snakes.values()) {
      if (snake.alive) {
        snake.update(deltaTime);
      }
    }

    // Check pellet collisions
    for (const snake of this.snakes.values()) {
      if (!snake.alive) continue;

      for (const pellet of this.pelletManager.getPellets()) {
        // Skip if this pellet was already consumed this tick (race condition prevention)
        if (this.consumedPelletsThisTick.has(pellet.id)) {
          continue;
        }
        
        if (CollisionDetection.checkPelletCollision(snake, pellet)) {
          // Mark pellet as consumed to prevent duplicate consumption
          this.consumedPelletsThisTick.add(pellet.id);
          
          // Growth is proportional to pellet size
          // Min size (4) gives 2 segments, max size (8) gives 4 segments
          const growthAmount = Math.round(pellet.size / 2);
          snake.grow(growthAmount);
          
          // Transfer pellet tokens to snake
          snake.addPelletTokens(pellet.tokenAmount);
          
          this.pelletManager.removePellet(pellet.id);
        }
      }
    }

    // Check snake collisions
    const aliveSnakes = Array.from(this.snakes.values()).filter(s => s.alive);
    const collisions = CollisionDetection.checkSnakeCollisions(aliveSnakes);
    
    for (const collision of collisions) {
      const victim = this.snakes.get(collision.victimId);
      if (victim && victim.alive) {
        const victimScore = victim.getScore();
        victim.kill();
        
        // If killed by another snake (not self-collision), transfer rewards
        if (collision.killerId && collision.killerId !== collision.victimId) {
          const killer = this.snakes.get(collision.killerId);
          if (killer && killer.alive) {
            // Killer gains the victim's score
            killer.grow(victimScore);
            
            // Transfer victim's pellet tokens to killer (internal balance)
            const victimPelletTokens = victim.getPelletTokens();
            killer.addPelletTokens(victimPelletTokens);
            
            console.log(`${killer.name} ate ${victim.name} and gained ${victimScore} points and ${victimPelletTokens.toFixed(2)} pellet tokens!`);
            
            // VAULT MODE: Transfer victim's STAKE from server wallet to killer immediately
            if (this.blockchain && killer.address && victim.address) {
              const victimStake = this.playerStakes.get(victim.address) || this.FIXED_STAKE_AMOUNT;
              
              // Transfer stake reward from server wallet to killer
              this.blockchain.transferKillReward(killer.address, victimStake)
                .catch(err => console.error('Error transferring kill reward:', err));
              
              // Update stake tracking: killer gets victim's stake, victim loses it
              const killerCurrentStake = this.playerStakes.get(killer.address) || this.FIXED_STAKE_AMOUNT;
              this.playerStakes.set(killer.address, killerCurrentStake + victimStake);
              this.playerStakes.delete(victim.address); // Victim loses their stake
              
              console.log(`💰 Kill reward: ${victimStake} SSS transferred from server wallet to ${killer.address.slice(0, 8)}`);
              
              // Report eat to blockchain for stats/leaderboard (no stake transfer on-chain)
              this.blockchain.reportEat(this.permanentMatchId, killer.address, victim.address)
                .catch(err => console.error('Error reporting eat to blockchain:', err));
            }
          }
        } else {
          // Self-collision or no killer - report self death to blockchain
          console.log(`${victim.name} died from self-collision with score ${victimScore}`);
          if (this.blockchain && victim.address) {
            // Remove victim's stake tracking (server keeps it)
            this.playerStakes.delete(victim.address);
            
            console.log(`Reporting self-collision death for ${victim.address} to blockchain`);
            this.blockchain.reportSelfDeath(this.permanentMatchId, victim.address, victimScore)
              .catch(err => console.error('Error reporting self death:', err));
          }
        }
      }
    }

    // Check world bounds
    for (const snake of this.snakes.values()) {
      if (snake.alive && CollisionDetection.checkWorldBounds(snake, WORLD_WIDTH, WORLD_HEIGHT)) {
        const snakeScore = snake.getScore();
        console.log(`${snake.name} died from wall collision with score ${snakeScore}`);
        snake.kill();
        
        // Report wall collision death to blockchain
        if (this.blockchain && snake.address) {
          // Remove victim's stake tracking (server keeps it)
          this.playerStakes.delete(snake.address);
          
          console.log(`Reporting wall collision death for ${snake.address} to blockchain`);
          this.blockchain.reportSelfDeath(this.permanentMatchId, snake.address, snakeScore)
            .catch(err => console.error('Error reporting wall death:', err));
        }
      }
    }
  }

  addSnake(id: string, name: string, address?: string, immediate: boolean = true): SnakeEntity {
    // Create the snake
    const snake = this.createSnakeImmediate(id, name, address);
    
    if (immediate) {
      // Add immediately - safe for player joins which happen between ticks
      this.snakes.set(id, snake);
      const addressLog = address ? ` wallet: ${address}` : '';
      console.log(`Snake ${name} (${id})${addressLog} added immediately`);
    } else {
      // Queue it for addition to the game on next tick
      // Use this when adding during tick processing to prevent race conditions
      this.pendingAdds.push({ id, snake });
      console.log(`Snake ${name} (${id}) created and queued for addition on next tick`);
    }
    
    return snake;
  }

  removeSnake(id: string, immediate: boolean = false): void {
    if (immediate) {
      // Remove immediately - safe when called between ticks (e.g., during disconnect)
      this.snakes.delete(id);
      console.log(`Snake ${id} removed immediately`);
    } else {
      // Queue the remove operation for next tick processing
      // Use this to avoid removing during tick processing
      if (!this.pendingRemoves.includes(id)) {
        this.pendingRemoves.push(id);
        console.log(`Snake ${id} queued for removal on next tick`);
      }
    }
  }

  removeSnakeByAddress(address: string, immediate: boolean = true): void {
    // Find snake with this address and remove it
    // Default to immediate since this is typically called during join handling
    for (const [id, snake] of this.snakes.entries()) {
      if (snake.address === address) {
        if (immediate) {
          this.snakes.delete(id);
          console.log(`Snake ${id} with address ${address} removed immediately (duplicate login cleanup)`);
        } else {
          if (!this.pendingRemoves.includes(id)) {
            this.pendingRemoves.push(id);
            console.log(`Snake ${id} with address ${address} queued for removal (duplicate login cleanup)`);
          }
        }
        return;
      }
    }
  }

  getSnake(id: string): SnakeEntity | undefined {
    return this.snakes.get(id);
  }

  setSnakeTargetAngle(id: string, angle: number): void {
    const snake = this.snakes.get(id);
    if (snake && snake.alive) {
      snake.setTargetAngle(angle);
    }
  }

  getGameState(): StateMessage {
    const snakes: SerializedSnake[] = Array.from(this.snakes.values())
      .filter(snake => snake.alive)
      .map(snake => ({
        id: snake.id,
        name: snake.name,
        address: snake.address,
        head: [snake.headPosition.x, snake.headPosition.y] as [number, number],
        angle: snake.angle,
        segments: snake.segments.map(seg => [seg.x, seg.y] as [number, number]),
        color: snake.color,
        pelletTokens: snake.pelletTokens,
      }));

    const pellets: SerializedPellet[] = this.pelletManager
      .getPellets()
      .map(pellet => [pellet.id, pellet.x, pellet.y, pellet.size, pellet.color, pellet.tokenAmount] as SerializedPellet);

    const leaderboard = Leaderboard.compute(Array.from(this.snakes.values()));

    return {
      type: MessageType.STATE,
      tick: this.tickCount,
      snakes,
      pellets,
      leaderboard: leaderboard.map(entry => [entry.name, entry.score, entry.address] as [string, number, string?]),
      matchId: this.permanentMatchId,
      entropyPending: this.entropyPending,
      entropyRequestId: this.entropyRequestId || undefined,
      useFairRNG: !this.devFallbackMode,
      mapType: this.matchRNG?.getMapType(),
      entropySeed: this.entropySeed || undefined,
    };
  }

  /**
   * Get match entropy info for debugging/display
   */
  getEntropyInfo(): {
    requestId: string | null;
    hasSeed: boolean;
    pending: boolean;
    fallbackMode: boolean;
    mapType?: string;
  } {
    return {
      requestId: this.entropyRequestId,
      hasSeed: this.matchRNG !== null,
      pending: this.entropyPending,
      fallbackMode: this.devFallbackMode,
      mapType: this.matchRNG?.getMapType(),
    };
  }

  isSnakeDead(id: string): boolean {
    const snake = this.snakes.get(id);
    return snake ? !snake.alive : true;
  }

  getSnakeScore(id: string): number {
    const snake = this.snakes.get(id);
    return snake ? snake.getScore() : 0;
  }

  /**
   * Distribute pellet tokens across all pellets
   * Formula: (# pellets * # players) / 300 SSS
   */
  private distributePelletTokens(): void {
    if (this.pelletTokensDistributed) {
      return; // Already distributed
    }

    const pelletCount = this.pelletManager.getPellets().length;
    const playerCount = this.snakes.size;

    if (playerCount === 0) {
      // No players yet, wait
      return;
    }

    const totalPelletTokens = (pelletCount * playerCount) / 300;
    this.pelletManager.distributePelletTokens(totalPelletTokens);
    this.pelletTokensDistributed = true;

    console.log(`💰 Pellet tokens distributed: ${totalPelletTokens.toFixed(2)} SSS across ${pelletCount} pellets for ${playerCount} players`);
  }
}

