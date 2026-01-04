import { WebSocketServer, WebSocket } from 'ws';
import { GameServer } from './GameServer';
import { BlockchainService } from './BlockchainService';
import { DeltaCompressor } from './DeltaCompressor';
import * as dotenv from 'dotenv';
import {
  ClientMessage,
  ServerMessage,
  MessageType,
  DeadMessage,
  TapOutSuccessMessage,
  isJoinMessage,
  isInputMessage,
  isPingMessage,
  isTapOutMessage,
} from '@0xslither/shared';

dotenv.config();

const PORT = process.env.PORT;

class Player {
  public disconnecting: boolean = false;
  
  constructor(
    public ws: WebSocket,
    public id: string,
    public snakeId: string | null = null
  ) {}
}

class WebSocketGameServer {
  private wss: WebSocketServer;
  private gameServer: GameServer;
  private blockchain: BlockchainService | null = null;
  private players: Map<WebSocket, Player> = new Map();
  private nextPlayerId = 0;
  private deltaCompressor: DeltaCompressor = new DeltaCompressor();
  private readonly FIXED_STAKE_AMOUNT = 1; // Fixed 1 SSS stake per player

  constructor(port: number) {
    this.gameServer = new GameServer();
    this.wss = new WebSocketServer({ port });
    
    // Initialize blockchain
    try {
      const rpcUrl = process.env.SAGA_RPC_URL as string;
      const privateKey = process.env.SERVER_PRIVATE_KEY as string;
      const stakeArenaAddress = process.env.STAKE_ARENA_ADDRESS as string;

      if (!privateKey || !stakeArenaAddress) {
        console.warn('⚠️  Blockchain integration disabled: Missing SERVER_PRIVATE_KEY or STAKE_ARENA_ADDRESS');
      } else {
        this.blockchain = new BlockchainService(rpcUrl, privateKey, stakeArenaAddress);
        console.log('✅ Blockchain integration enabled (Native SSS)');
        console.log('🏦 Using server vault model for continuous gameplay');
        console.log(`📝 Permanent Match ID: ${this.gameServer.getMatchId()}`);
        console.log(`📝 Match ID (bytes32): ${this.blockchain.generateMatchId(this.gameServer.getMatchId())}`);
      }
    } catch (error) {
      console.error('Failed to initialize blockchain:', error);
    }
    this.wss.on('connection', (ws: WebSocket) => this.handleConnection(ws));
    
    console.log(`WebSocket server listening on port ${port}`);
  }

  start(): void {
    // Connect blockchain to game server if enabled
    if (this.blockchain) {
      this.gameServer.setBlockchainService(this.blockchain);
    }
    
    // Start game server with synchronized broadcast callback
    // Broadcasts happen immediately after each tick completes
    // Game runs continuously until server is killed
    this.gameServer.start(() => {
      this.broadcastGameState();
      this.checkDeadSnakes();
    });
    
    console.log('🎮 Continuous match started! Players can join anytime.');
  }

  private handleConnection(ws: WebSocket): void {
    const playerId = `player-${this.nextPlayerId++}`;
    const player = new Player(ws, playerId);
    this.players.set(ws, player);
    
    console.log(`Player ${playerId} connected`);

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as ClientMessage;
        this.handleMessage(player, message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    ws.on('close', () => {
      this.handleDisconnect(player);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for player ${playerId}:`, error);
    });
  }

  private handleMessage(player: Player, message: ClientMessage): void {
    if (isJoinMessage(message)) {
      this.handleJoin(player, message.name, message.address);
    } else if (isInputMessage(message)) {
      this.handleInput(player, message.targetAngle);
    } else if (isPingMessage(message)) {
      this.handlePing(player, message.timestamp);
    } else if (isTapOutMessage(message)) {
      this.handleTapOut(player, message.matchId);
    }
  }

  private async handleJoin(player: Player, name: string, address: string): Promise<void> {
    // VAULT MODE: Verify player has deposited to vault (optional check)
    // In production, you may want to enforce this more strictly
    if (this.blockchain) {
      const hasDeposited = await this.blockchain.verifyVaultDeposit(address, this.FIXED_STAKE_AMOUNT.toString());
      if (!hasDeposited) {
        console.warn(`⚠️  Player ${address.slice(0, 8)} joining without verified vault deposit`);
        // For now, allow them to join anyway (server can enforce deposits client-side)
        // In stricter mode, you could reject: return;
      }
    }

    // Remove old snake if exists for this player object
    // Use immediate removal since this is between ticks (during message handling)
    if (player.snakeId) {
      this.gameServer.removeSnake(player.snakeId, true);
    }

    // Remove any existing snake with the same wallet address
    // (handles case where player disconnected improperly and is rejoining)
    this.gameServer.removeSnakeByAddress(address);

    // Register player's stake for kill reward tracking
    this.gameServer.registerPlayerStake(address, this.FIXED_STAKE_AMOUNT);

    // Create new snake with required wallet address
    const snake = this.gameServer.addSnake(player.id, name, address);
    player.snakeId = snake.id;

    console.log(`Player ${player.id} joined as wallet ${address} (continuous match)`);

    // Send initial state with player ID
    const state = this.gameServer.getGameState();
    this.sendMessage(player.ws, { ...state, yourId: player.id });
  }

  private handleInput(player: Player, targetAngle: number): void {
    if (player.snakeId) {
      this.gameServer.setSnakeTargetAngle(player.snakeId, targetAngle);
    }
  }

  private handlePing(player: Player, timestamp: number): void {
    this.sendMessage(player.ws, {
      type: MessageType.PONG,
      timestamp,
    });
  }

  private async handleTapOut(player: Player, matchId: string): Promise<void> {
    if (!player.snakeId) {
      console.log(`Player ${player.id} tried to tap out without active snake`);
      return;
    }

    const snake = this.gameServer.getSnake(player.snakeId);
    if (!snake || !snake.address) {
      console.log(`Cannot tap out: no wallet address for player ${player.id}`);
      return;
    }

    console.log(`Player ${player.id} tapping out from continuous match (address: ${snake.address.slice(0, 8)})`);

    // Get pellet tokens before removing snake
    const pelletTokens = snake.getPelletTokens();
    const finalScore = snake.getScore();
    
    // Remove snake from game immediately
    // Use immediate removal since this is between ticks (during message handling)
    this.gameServer.removeSnake(player.snakeId, true);
    player.snakeId = null;
    
    // VAULT MODE: Transfer pellet tokens only (stakes already distributed via kills)
    // Player keeps any stake rewards they earned from kills (already in their wallet)
    if (this.blockchain && snake.address) {
      // Only settle pellet tokens - stake rewards were transferred immediately on kills
      await this.blockchain.settlePelletTokens(snake.address, pelletTokens);
      console.log(`💰 Tap-out payout: ${pelletTokens.toFixed(2)} SSS (pellet tokens) to ${snake.address.slice(0, 8)}`);
    }

    // Send success message with pellet token amount
    const tapOutMsg: TapOutSuccessMessage = {
      type: MessageType.TAPOUT_SUCCESS,
      amountWithdrawn: pelletTokens, // Only pellet tokens, not stake
    };
    this.sendMessage(player.ws, tapOutMsg);
  }

  private async handleDisconnect(player: Player): Promise<void> {
    console.log(`Player ${player.id} disconnected`);
    
    // Mark player as disconnecting to prevent race conditions with game tick
    player.disconnecting = true;
    
    if (player.snakeId) {
      // Get snake info before killing it
      const snake = this.gameServer.getSnake(player.snakeId);
      
      // If snake is still alive and has a wallet address, handle vault mode disconnect
      if (snake && snake.alive && snake.address && this.blockchain) {
        const snakeScore = snake.getScore();
        const pelletTokens = snake.getPelletTokens();
        console.log(`Player ${player.id} disconnected with active snake (score: ${snakeScore}, pellet tokens: ${pelletTokens.toFixed(2)})`);
        
        // CRITICAL: Immediately kill the snake to prevent other players from eating it
        // while we're doing async blockchain operations
        snake.kill();
        
        try {
          // VAULT MODE: On disconnect, player loses everything
          // - Server keeps the deposit (already in vault)
          // - Pellet tokens are lost (not paid out)
          // - Only report death for leaderboard
          console.log(`💀 Player ${snake.address.slice(0, 8)} disconnected - loses deposit and pellet tokens (${pelletTokens.toFixed(2)} SSS)`);
          await this.blockchain.reportSelfDeath(this.gameServer.getMatchId(), snake.address, snakeScore);
          
          // NO pellet token payout on disconnect - server keeps everything
          // This is the penalty for disconnecting
        } catch (err) {
          console.error('Error reporting disconnect:', err);
        }
      }
      
      // Remove snake only after blockchain operations complete
      // Use immediate removal since this is between ticks (during disconnect handling)
      this.gameServer.removeSnake(player.snakeId, true);
    }
    
    // Remove player's delta compression state
    this.deltaCompressor.removePlayer(player.id);
    
    this.players.delete(player.ws);
  }

  private broadcastGameState(): void {
    const fullState = this.gameServer.getGameState();
    
    for (const [ws, player] of this.players) {
      // Skip players that are disconnecting to avoid race conditions
      if (player.disconnecting || ws.readyState !== WebSocket.OPEN) {
        continue;
      }
      
      // Get delta or full state for this player
      const stateForPlayer = this.deltaCompressor.getDeltaOrFullState(player.id, fullState);
      
      // Send the state
      ws.send(JSON.stringify(stateForPlayer));
    }
  }

  private checkDeadSnakes(): void {
    for (const [ws, player] of this.players) {
      // Skip players that are disconnecting to avoid race conditions
      if (player.disconnecting) continue;
      
      if (player.snakeId && this.gameServer.isSnakeDead(player.snakeId)) {
        const score = this.gameServer.getSnakeScore(player.snakeId);
        const deadMessage: DeadMessage = {
          type: MessageType.DEAD,
          finalScore: score,
        };
        
        this.sendMessage(ws, deadMessage);
        
        // Don't remove the snake yet - player can respawn
        player.snakeId = null;
      }
    }
  }

  private sendMessage(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
}

// Start the server
const server = new WebSocketGameServer(Number(PORT));
server.start();

console.log(`
╔═══════════════════════════════════════╗
║   Slither.io Server Running           ║
║   Port: ${PORT}                       ║
║   Ready for connections!              ║
╚═══════════════════════════════════════╝
`);

