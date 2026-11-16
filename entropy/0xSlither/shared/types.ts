// Shared types for game entities

export interface Position {
  x: number;
  y: number;
}

export interface SnakeSegment extends Position {
  radius: number;
}

export interface Snake {
  id: string;
  name: string;
  address?: string; // Optional EVM wallet address
  headPosition: Position;
  angle: number;
  segments: SnakeSegment[];
  length: number;
  color: string;
  alive: boolean;
  pelletTokens: number;
}

export interface Pellet {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
  tokenAmount: number;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  address?: string; // Optional EVM wallet address
}

// Serialized types for network transmission (more compact)
export type SerializedSnake = {
  id: string;
  name: string;
  address?: string; // Optional EVM wallet address
  head: [number, number];
  angle: number;
  segments: [number, number][];
  color: string;
  pelletTokens: number;
};

export type SerializedPellet = [string, number, number, number, string, number]; // [id, x, y, size, color, tokenAmount]

export type SerializedLeaderboard = [string, number, string?][]; // [name, score, address?]

