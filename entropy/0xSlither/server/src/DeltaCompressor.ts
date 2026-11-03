import {
  StateMessage,
  DeltaStateMessage,
  MessageType,
  SerializedSnake,
  SerializedPellet,
  SerializedLeaderboard,
} from '@0xslither/shared';

interface PlayerState {
  lastTick: number;
  lastSnakes: Map<string, SerializedSnake>;
  lastPellets: Map<string, SerializedPellet>; // Map by pellet ID for efficient lookups
  lastLeaderboard: SerializedLeaderboard;
}

/**
 * DeltaCompressor tracks previous state per player and computes deltas
 * This significantly reduces bandwidth by only sending changed data
 */
export class DeltaCompressor {
  private playerStates: Map<string, PlayerState> = new Map();
  private readonly maxTicksToKeep = 5; // Send full state if player missed >5 ticks

  /**
   * Get delta state for a player, or full state if needed
   * @param playerId Player identifier
   * @param currentState Current full game state
   * @returns Delta state or full state if too many ticks missed
   */
  getDeltaOrFullState(playerId: string, currentState: StateMessage): StateMessage | DeltaStateMessage {
    const playerState = this.playerStates.get(playerId);
    
    // First time or too many missed ticks - send full state
    if (!playerState || currentState.tick - playerState.lastTick > this.maxTicksToKeep) {
      this.updatePlayerState(playerId, currentState);
      return currentState; // Full state
    }

    // Compute delta
    const delta = this.computeDelta(playerState, currentState);
    
    // Update stored state
    this.updatePlayerState(playerId, currentState);
    
    return delta;
  }

  /**
   * Compute delta between previous and current state
   */
  private computeDelta(playerState: PlayerState, currentState: StateMessage): DeltaStateMessage {
    const snakesUpdated: SerializedSnake[] = [];
    const snakesRemoved: string[] = [];
    const snakesAdded: SerializedSnake[] = [];
    
    // Check for new/updated snakes
    const currentSnakeIds = new Set<string>();
    for (const snake of currentState.snakes) {
      currentSnakeIds.add(snake.id);
      const prevSnake = playerState.lastSnakes.get(snake.id);
      
      if (!prevSnake) {
        // New snake
        snakesAdded.push(snake);
      } else if (this.snakeChanged(prevSnake, snake)) {
        // Snake changed
        snakesUpdated.push(snake);
      }
    }
    
    // Check for removed snakes
    for (const [id] of playerState.lastSnakes) {
      if (!currentSnakeIds.has(id)) {
        snakesRemoved.push(id);
      }
    }

    // Check pellets - only track removed (pellets never respawn, so no additions after init)
    const pelletsRemoved: string[] = [];
    
    // Build set of current pellet IDs
    const currentPelletIds = new Set<string>();
    for (const pellet of currentState.pellets) {
      currentPelletIds.add(pellet[0]); // pellet[0] is the ID
    }
    
    // Find removed pellets (in previous state but not in current)
    for (const [id] of playerState.lastPellets) {
      if (!currentPelletIds.has(id)) {
        pelletsRemoved.push(id);
      }
    }

    // Check leaderboard
    const leaderboardChanged = this.leaderboardChanged(
      playerState.lastLeaderboard,
      currentState.leaderboard
    );

    return {
      type: MessageType.DELTA_STATE,
      tick: currentState.tick,
      snakesAdded,
      snakesUpdated,
      snakesRemoved,
      pelletsRemoved, // Only removals - pellets never respawn after initial spawn
      leaderboardChanged: leaderboardChanged ? currentState.leaderboard : undefined,
      matchId: currentState.matchId,
      entropyPending: currentState.entropyPending,
      useFairRNG: currentState.useFairRNG,
      // Entropy details (seed, requestId, mapType) are only sent in full state messages
      // to reduce bandwidth during gameplay - they're only needed on the start screen
    };
  }

  /**
   * Check if snake changed significantly
   */
  private snakeChanged(prev: SerializedSnake, current: SerializedSnake): boolean {
    // Check head position (with threshold for minor movements)
    const headMoved = Math.abs(prev.head[0] - current.head[0]) > 1 || 
                      Math.abs(prev.head[1] - current.head[1]) > 1;
    
    // Check if segment count changed
    const segmentsChanged = prev.segments.length !== current.segments.length;
    
    // Check if angle changed significantly (>0.1 radians)
    const angleChanged = Math.abs(prev.angle - current.angle) > 0.1;
    
    return headMoved || segmentsChanged || angleChanged;
  }


  /**
   * Check if leaderboard changed
   */
  private leaderboardChanged(prev: SerializedLeaderboard, current: SerializedLeaderboard): boolean {
    if (prev.length !== current.length) return true;
    
    for (let i = 0; i < prev.length; i++) {
      if (prev[i][0] !== current[i][0] || prev[i][1] !== current[i][1]) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Update stored state for a player
   */
  private updatePlayerState(playerId: string, state: StateMessage): void {
    const snakesMap = new Map<string, SerializedSnake>();
    for (const snake of state.snakes) {
      snakesMap.set(snake.id, snake);
    }

    // Store pellets in a Map by ID for efficient delta comparison
    const pelletsMap = new Map<string, SerializedPellet>();
    for (const pellet of state.pellets) {
      pelletsMap.set(pellet[0], pellet); // pellet[0] is the ID
    }

    this.playerStates.set(playerId, {
      lastTick: state.tick,
      lastSnakes: snakesMap,
      lastPellets: pelletsMap,
      lastLeaderboard: state.leaderboard,
    });
  }

  /**
   * Remove player state when they disconnect
   */
  removePlayer(playerId: string): void {
    this.playerStates.delete(playerId);
  }

  /**
   * Get compression stats for monitoring
   */
  getStats(): { playerCount: number; avgStateSize: number } {
    return {
      playerCount: this.playerStates.size,
      avgStateSize: 0, // Could be calculated if needed
    };
  }
}

