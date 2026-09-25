import { ethers } from 'ethers';
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PELLET_MIN_SIZE,
  PELLET_MAX_SIZE,
  PELLET_COLORS,
} from '@0xslither/shared';

/**
 * DeterministicRNG generates reproducible pseudo-random values
 * from a single on-chain entropy seed using domain separation
 */
export class DeterministicRNG {
  private baseSeed: string;

  constructor(baseSeed: string) {
    if (!baseSeed || baseSeed === ethers.ZeroHash) {
      throw new Error('Invalid base seed');
    }
    this.baseSeed = baseSeed;
  }

  /**
   * Generate a domain-separated sub-seed
   * @param domain Domain identifier (e.g., "spawn", "color", "pellets")
   * @param args Additional arguments for uniqueness
   */
  private deriveSubSeed(domain: string, ...args: string[]): string {
    const types = ['bytes32', 'string', ...args.map(() => 'string')];
    const values = [this.baseSeed, domain, ...args];
    return ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(types, values));
  }

  /**
   * Convert a bytes32 seed to a float in range [0, 1)
   */
  private seedToFloat(seed: string): number {
    const bigNum = BigInt(seed);
    const maxUint256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    return Number(bigNum) / Number(maxUint256);
  }

  /**
   * Generate deterministic spawn position for a player
   * @param playerAddress Player's wallet address
   * @param retryCount Retry counter for collision avoidance
   */
  getSpawnPosition(playerAddress: string, retryCount: number = 0): { x: number; y: number } {
    const subSeed = this.deriveSubSeed('spawn', playerAddress.toLowerCase(), retryCount.toString());
    
    // Use two subsequent hashes for x and y to get independent randomness
    const xSeed = ethers.keccak256(ethers.solidityPacked(['bytes32', 'uint8'], [subSeed, 0]));
    const ySeed = ethers.keccak256(ethers.solidityPacked(['bytes32', 'uint8'], [subSeed, 1]));
    
    const xRandom = this.seedToFloat(xSeed);
    const yRandom = this.seedToFloat(ySeed);
    
    // Spawn with margin from edges (500px) to prevent immediate wall collision
    const margin = 500;
    const x = margin + xRandom * (WORLD_WIDTH - 2 * margin);
    const y = margin + yRandom * (WORLD_HEIGHT - 2 * margin);
    
    return { x, y };
  }

  /**
   * Check if a spawn position is valid (doesn't collide with existing snakes)
   * @param position Position to check
   * @param existingPositions Array of existing snake head positions
   * @param minDistance Minimum distance from other snakes
   */
  isSpawnPositionValid(
    position: { x: number; y: number },
    existingPositions: Array<{ x: number; y: number }>,
    minDistance: number = 200
  ): boolean {
    for (const existing of existingPositions) {
      const dx = position.x - existing.x;
      const dy = position.y - existing.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < minDistance) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get spawn position with automatic retry on collision
   * @param playerAddress Player's wallet address
   * @param existingPositions Existing snake positions to avoid
   * @param maxRetries Maximum retry attempts
   */
  getSpawnPositionWithRetry(
    playerAddress: string,
    existingPositions: Array<{ x: number; y: number }>,
    maxRetries: number = 10
  ): { x: number; y: number } {
    for (let retry = 0; retry < maxRetries; retry++) {
      const position = this.getSpawnPosition(playerAddress, retry);
      if (this.isSpawnPositionValid(position, existingPositions)) {
        return position;
      }
    }
    
    // If all retries fail, return the last position anyway
    console.warn(`⚠️ Could not find collision-free spawn for ${playerAddress} after ${maxRetries} retries`);
    return this.getSpawnPosition(playerAddress, maxRetries - 1);
  }

  /**
   * Generate deterministic snake color for a player
   * @param playerAddress Player's wallet address
   */
  getSnakeColor(playerAddress: string): string {
    const subSeed = this.deriveSubSeed('color', playerAddress.toLowerCase());
    const colorRandom = this.seedToFloat(subSeed);
    
    // Generate HSL color with good saturation and lightness for visibility
    const hue = Math.floor(colorRandom * 360);
    const saturation = 70 + Math.floor((colorRandom * 360) % 30); // 70-100%
    const lightness = 50 + Math.floor((colorRandom * 720) % 20); // 50-70%
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  /**
   * Generate deterministic pellet field
   * @param count Number of pellets to generate
   */
  getPelletPositions(count: number): Array<{
    x: number;
    y: number;
    size: number;
    color: string;
  }> {
    const mapSeed = this.deriveSubSeed('pellets');
    const pellets: Array<{ x: number; y: number; size: number; color: string }> = [];
    
    for (let i = 0; i < count; i++) {
      // Generate independent seed for each pellet
      const pelletSeed = ethers.keccak256(
        ethers.solidityPacked(['bytes32', 'uint256'], [mapSeed, i])
      );
      
      // Derive x, y, size, colorIndex from the pellet seed
      const xSeed = ethers.keccak256(ethers.solidityPacked(['bytes32', 'uint8'], [pelletSeed, 0]));
      const ySeed = ethers.keccak256(ethers.solidityPacked(['bytes32', 'uint8'], [pelletSeed, 1]));
      const sizeSeed = ethers.keccak256(ethers.solidityPacked(['bytes32', 'uint8'], [pelletSeed, 2]));
      const colorSeed = ethers.keccak256(ethers.solidityPacked(['bytes32', 'uint8'], [pelletSeed, 3]));
      
      const x = this.seedToFloat(xSeed) * WORLD_WIDTH;
      const y = this.seedToFloat(ySeed) * WORLD_HEIGHT;
      const size = PELLET_MIN_SIZE + this.seedToFloat(sizeSeed) * (PELLET_MAX_SIZE - PELLET_MIN_SIZE);
      const colorIndex = Math.floor(this.seedToFloat(colorSeed) * PELLET_COLORS.length);
      const color = PELLET_COLORS[colorIndex];
      
      pellets.push({ x, y, size, color });
    }
    
    return pellets;
  }

  /**
   * Get map type (optional feature for varied gameplay)
   */
  getMapType(): 'uniform' | 'clustered' | 'ring' {
    const mapTypeSeed = this.deriveSubSeed('map');
    const typeRandom = this.seedToFloat(mapTypeSeed);
    
    // Distribute evenly across 3 map types
    if (typeRandom < 0.33) return 'uniform';
    if (typeRandom < 0.66) return 'clustered';
    return 'ring';
  }

  /**
   * Get the base seed (for debugging/logging)
   */
  getBaseSeed(): string {
    return this.baseSeed;
  }

  /**
   * Get seed hash for on-chain commit
   */
  getSeedHash(): string {
    return ethers.keccak256(ethers.toUtf8Bytes(this.baseSeed));
  }
}

