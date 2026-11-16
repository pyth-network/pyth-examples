import {
  MessageType,
  ServerMessage,
  StateMessage,
  DeltaStateMessage,
  DeadMessage,
  JoinMessage,
  InputMessage,
  SerializedSnake,
  SerializedPellet,
} from '@0xslither/shared';

export class Game {
  private ws: WebSocket | null = null;
  private connected = false;
  private playerId: string | null = null;
  private currentState: StateMessage | null = null;
  private previousState: StateMessage | null = null;
  private lastUpdateTime = 0;
  private onStateUpdateCallback: ((state: StateMessage) => void) | null = null;
  private onDeadCallback: ((score: number) => void) | null = null;
  private onConnectedCallback: (() => void) | null = null;
  private onPlayerIdReceivedCallback: ((playerId: string) => void) | null = null;

  constructor(serverUrl: string) {
    this.connect(serverUrl);
  }

  private connect(serverUrl: string): void {
    this.ws = new WebSocket(serverUrl);

    this.ws.onopen = () => {
      console.log('Connected to server');
      this.connected = true;
      if (this.onConnectedCallback) {
        this.onConnectedCallback();
      }
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data) as ServerMessage;
      this.handleServerMessage(message);
    };

    this.ws.onclose = () => {
      console.log('Disconnected from server');
      this.connected = false;
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private handleServerMessage(message: ServerMessage): void {
    if (message.type === MessageType.STATE) {
      this.handleFullState(message);
    } else if (message.type === MessageType.DELTA_STATE) {
      this.handleDeltaState(message as DeltaStateMessage);
    } else if (message.type === MessageType.DEAD) {
      const deadMessage = message as DeadMessage;
      console.log('You died! Final score:', deadMessage.finalScore);
      if (this.onDeadCallback) {
        this.onDeadCallback(deadMessage.finalScore);
      }
    }
  }

  private handleFullState(message: StateMessage): void {
    this.previousState = this.currentState;
    this.currentState = message;
    this.lastUpdateTime = Date.now();

    // When server sends yourId, it means we have an active snake (or just joined/rejoined)
    // Always process it, even if it's the same ID (handles respawn case)
    if (message.yourId) {
      const isNewOrChanged = this.playerId !== message.yourId;
      this.playerId = message.yourId;
      
      if (isNewOrChanged) {
        console.log('Received player ID:', this.playerId);
      } else {
        console.log('Received player ID (rejoined with same ID):', this.playerId);
      }
      
      // Always notify when server sends yourId (handles respawn/rejoin)
      if (this.onPlayerIdReceivedCallback) {
        this.onPlayerIdReceivedCallback(this.playerId);
      }
    }

    if (this.onStateUpdateCallback) {
      this.onStateUpdateCallback(message);
    }
  }

  private handleDeltaState(delta: DeltaStateMessage): void {
    // If we don't have a current state, we can't apply delta (shouldn't happen)
    if (!this.currentState) {
      console.warn('Received delta without current state, requesting full state...');
      return;
    }

    this.previousState = this.currentState;

    // Create a new state by applying delta to current state
    const snakesMap = new Map<string, SerializedSnake>();
    
    // Start with current snakes
    for (const snake of this.currentState.snakes) {
      snakesMap.set(snake.id, snake);
    }

    // Remove snakes
    for (const id of delta.snakesRemoved) {
      snakesMap.delete(id);
    }

    // Add new snakes
    for (const snake of delta.snakesAdded) {
      snakesMap.set(snake.id, snake);
    }

    // Update changed snakes
    for (const snake of delta.snakesUpdated) {
      snakesMap.set(snake.id, snake);
    }

    // Apply pellet changes efficiently using ID-based tracking
    // Build a map of current pellets by ID
    const pelletsMap = new Map<string, SerializedPellet>();
    for (const pellet of this.currentState.pellets) {
      pelletsMap.set(pellet[0], pellet); // pellet[0] is the ID
    }
    
    // Remove eaten pellets (pellets never respawn, so only removals are tracked)
    for (const id of delta.pelletsRemoved) {
      pelletsMap.delete(id);
    }
    
    const pellets = Array.from(pelletsMap.values());

    // Create new state, preserving entropy info from initial full state
    // (entropy fields are only sent in full state messages, not deltas, to save bandwidth)
    this.currentState = {
      type: MessageType.STATE,
      tick: delta.tick,
      snakes: Array.from(snakesMap.values()),
      pellets,
      leaderboard: delta.leaderboardChanged || this.currentState.leaderboard,
      matchId: delta.matchId || this.currentState.matchId,
      entropyPending: delta.entropyPending !== undefined ? delta.entropyPending : this.currentState.entropyPending,
      entropyRequestId: this.currentState.entropyRequestId, // Preserved from full state
      useFairRNG: delta.useFairRNG !== undefined ? delta.useFairRNG : this.currentState.useFairRNG,
      entropySeed: this.currentState.entropySeed, // Preserved from full state
      mapType: this.currentState.mapType, // Preserved from full state
    };

    this.lastUpdateTime = Date.now();

    // Handle yourId if present in delta (for respawn)
    if (delta.yourId) {
      const isNewOrChanged = this.playerId !== delta.yourId;
      this.playerId = delta.yourId;
      
      if (isNewOrChanged) {
        console.log('Received player ID (delta):', this.playerId);
      }
      
      if (this.onPlayerIdReceivedCallback) {
        this.onPlayerIdReceivedCallback(this.playerId);
      }
    }

    if (this.onStateUpdateCallback) {
      this.onStateUpdateCallback(this.currentState);
    }
  }

  join(name: string, address: string): void {
    if (!this.connected || !this.ws) return;

    const message: JoinMessage = {
      type: MessageType.JOIN,
      name,
      address,
    };

    this.ws.send(JSON.stringify(message));
    console.log(`Sent JOIN message for wallet: ${address}`);
  }

  sendInput(targetAngle: number): void {
    if (!this.connected || !this.ws) return;

    const message: InputMessage = {
      type: MessageType.INPUT,
      targetAngle,
    };

    this.ws.send(JSON.stringify(message));
  }

  sendCustomMessage(message: any): void {
    if (!this.connected || !this.ws) return;
    this.ws.send(JSON.stringify(message));
  }

  onStateUpdate(callback: (state: StateMessage) => void): void {
    this.onStateUpdateCallback = callback;
  }

  onDead(callback: (score: number) => void): void {
    this.onDeadCallback = callback;
  }

  onConnected(callback: () => void): void {
    this.onConnectedCallback = callback;
  }

  onPlayerIdReceived(callback: (playerId: string) => void): void {
    this.onPlayerIdReceivedCallback = callback;
  }

  getInterpolatedState(): StateMessage | null {
    if (!this.currentState) return null;
    if (!this.previousState) return this.currentState;

    // Calculate time-based interpolation
    const timeSinceUpdate = Date.now() - this.lastUpdateTime;
    const alpha = Math.min(timeSinceUpdate / 50, 1); // 50ms = TICK_INTERVAL

    if (alpha >= 1) return this.currentState;

    // Create interpolated state
    const interpolated: StateMessage = {
      ...this.currentState,
      snakes: this.currentState.snakes.map((currentSnake) => {
        const prevSnake = this.previousState!.snakes.find((s: SerializedSnake) => s.id === currentSnake.id);
        if (!prevSnake) return currentSnake;

        return {
          ...currentSnake,
          head: [
            prevSnake.head[0] + (currentSnake.head[0] - prevSnake.head[0]) * alpha,
            prevSnake.head[1] + (currentSnake.head[1] - prevSnake.head[1]) * alpha,
          ] as [number, number],
          segments: currentSnake.segments.map((seg: [number, number], segIndex: number) => {
            const prevSeg = prevSnake.segments[segIndex];
            if (!prevSeg) return seg;
            return [
              prevSeg[0] + (seg[0] - prevSeg[0]) * alpha,
              prevSeg[1] + (seg[1] - prevSeg[1]) * alpha,
            ] as [number, number];
          }),
        };
      }),
    };

    return interpolated;
  }

  getCurrentState(): StateMessage | null {
    return this.currentState;
  }

  getPlayerId(): string | null {
    return this.playerId;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getPlayerSnake(): SerializedSnake | null {
    if (!this.currentState || !this.playerId) return null;
    return this.currentState.snakes.find((s: SerializedSnake) => s.id === this.playerId) || null;
  }
}

