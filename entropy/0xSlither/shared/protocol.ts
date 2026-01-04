// WebSocket message protocol

import { SerializedSnake, SerializedPellet, SerializedLeaderboard } from './types';

// Message types
export enum MessageType {
  JOIN = 'JOIN',
  INPUT = 'INPUT',
  STATE = 'STATE',
  DELTA_STATE = 'DELTA_STATE', // Delta-compressed state for bandwidth optimization
  DEAD = 'DEAD',
  PING = 'PING',
  PONG = 'PONG',
  TAPOUT = 'TAPOUT',
  TAPOUT_SUCCESS = 'TAPOUT_SUCCESS',
}

// Client to Server messages
export interface JoinMessage {
  type: MessageType.JOIN;
  name: string;
  address: string; // Required EVM wallet address
}

export interface InputMessage {
  type: MessageType.INPUT;
  targetAngle: number; // Desired angle in radians
}

export interface PingMessage {
  type: MessageType.PING;
  timestamp: number;
}

export interface TapOutMessage {
  type: MessageType.TAPOUT;
  matchId: string;
}

export type ClientMessage = JoinMessage | InputMessage | PingMessage | TapOutMessage;

// Server to Client messages
export interface StateMessage {
  type: MessageType.STATE;
  tick: number;
  snakes: SerializedSnake[];
  pellets: SerializedPellet[];
  leaderboard: SerializedLeaderboard;
  yourId?: string; // Only sent to new players
  matchId?: string; // Match ID for blockchain operations
  entropyPending?: boolean; // True while waiting for Pyth Entropy reveal
  entropyRequestId?: string; // Pyth Entropy request ID (sequence number)
  useFairRNG?: boolean; // True if using Pyth Entropy (not fallback)
  mapType?: 'uniform' | 'clustered' | 'ring'; // Map generation type
  entropySeed?: string; // The actual entropy seed from Pyth (for display/verification)
}

// Delta-compressed state message - only sends changes since last update
// Note: Entropy details (seed, requestId, mapType) are only sent in full state messages
// to reduce bandwidth during gameplay - they're preserved on the client side
export interface DeltaStateMessage {
  type: MessageType.DELTA_STATE;
  tick: number;
  snakesAdded: SerializedSnake[]; // New snakes since last update
  snakesUpdated: SerializedSnake[]; // Snakes that moved or changed
  snakesRemoved: string[]; // IDs of snakes that died/left
  pelletsRemoved: string[]; // IDs of pellets that were eaten (pellets never respawn)
  leaderboardChanged?: SerializedLeaderboard; // Only sent if leaderboard changed
  yourId?: string; // Only sent to new players
  matchId?: string;
  entropyPending?: boolean; // True while waiting for entropy reveal
  useFairRNG?: boolean; // True if using Pyth Entropy (not fallback)
}

export interface DeadMessage {
  type: MessageType.DEAD;
  finalScore: number;
}

export interface PongMessage {
  type: MessageType.PONG;
  timestamp: number;
}

export interface TapOutSuccessMessage {
  type: MessageType.TAPOUT_SUCCESS;
  amountWithdrawn: number;
}

export type ServerMessage = StateMessage | DeltaStateMessage | DeadMessage | PongMessage | TapOutSuccessMessage;

// Type guards
export function isJoinMessage(msg: any): msg is JoinMessage {
  return msg.type === MessageType.JOIN && typeof msg.name === 'string' &&
    typeof msg.address === 'string';
}

export function isInputMessage(msg: any): msg is InputMessage {
  return msg.type === MessageType.INPUT && typeof msg.targetAngle === 'number';
}

export function isPingMessage(msg: any): msg is PingMessage {
  return msg.type === MessageType.PING && typeof msg.timestamp === 'number';
}

export function isTapOutMessage(msg: any): msg is TapOutMessage {
  return msg.type === MessageType.TAPOUT && typeof msg.matchId === 'string';
}

