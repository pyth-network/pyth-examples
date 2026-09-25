import {
  Position,
  Snake,
  SnakeSegment,
  SNAKE_BASE_SPEED,
  SNAKE_MAX_ROTATION_SPEED,
  SNAKE_INITIAL_LENGTH,
  SNAKE_SEGMENT_SPACING,
  SNAKE_HEAD_RADIUS,
  SNAKE_SEGMENT_RADIUS,
  SNAKE_GROWTH_PER_PELLET,
  TICK_RATE,
} from '@0xslither/shared';

export class SnakeEntity implements Snake {
  id: string;
  name: string;
  address?: string; // Optional EVM wallet address
  headPosition: Position;
  angle: number;
  segments: SnakeSegment[];
  length: number;
  color: string;
  alive: boolean;
  targetAngle: number;
  pelletTokens: number;
  
  // Track position history for body segments
  private positionHistory: Position[] = [];

  constructor(id: string, name: string, x: number, y: number, color: string, address?: string) {
    this.id = id;
    this.name = name;
    this.address = address;
    this.headPosition = { x, y };
    this.angle = Math.random() * Math.PI * 2;
    this.targetAngle = this.angle;
    this.length = SNAKE_INITIAL_LENGTH;
    this.color = color;
    this.alive = true;
    this.pelletTokens = 0;
    this.segments = [];
    
    // Initialize position history with segments trailing behind the head
    // This prevents immediate self-collision
    const historyLength = this.length * 3;
    for (let i = 0; i < historyLength; i++) {
      // Place each history point behind the head based on initial angle
      const distance = i * 2; // Small spacing for smooth initial trail
      this.positionHistory.push({
        x: x - Math.cos(this.angle) * distance,
        y: y - Math.sin(this.angle) * distance,
      });
    }
    
    this.updateSegments();
  }

  setTargetAngle(angle: number): void {
    this.targetAngle = angle;
  }

  update(deltaTime: number): void {
    if (!this.alive) return;

    // Smooth rotation toward target angle
    const maxRotation = SNAKE_MAX_ROTATION_SPEED * deltaTime;
    let angleDiff = this.targetAngle - this.angle;
    
    // Normalize angle difference to [-π, π]
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    
    if (Math.abs(angleDiff) < maxRotation) {
      this.angle = this.targetAngle;
    } else {
      this.angle += Math.sign(angleDiff) * maxRotation;
    }
    
    // Normalize angle to [0, 2π]
    this.angle = (this.angle + Math.PI * 2) % (Math.PI * 2);

    // Move head forward
    const speed = SNAKE_BASE_SPEED * deltaTime;
    this.headPosition.x += Math.cos(this.angle) * speed;
    this.headPosition.y += Math.sin(this.angle) * speed;

    // Add current head position to history
    this.positionHistory.unshift({ ...this.headPosition });
    
    // Keep history size reasonable
    const maxHistory = this.length * 3;
    if (this.positionHistory.length > maxHistory) {
      this.positionHistory.length = maxHistory;
    }

    this.updateSegments();
  }

  private updateSegments(): void {
    this.segments = [];
    let distanceAlongPath = SNAKE_SEGMENT_SPACING;

    for (let i = 0; i < this.length; i++) {
      const position = this.getPositionAtDistance(distanceAlongPath);
      if (position) {
        this.segments.push({
          x: position.x,
          y: position.y,
          radius: SNAKE_SEGMENT_RADIUS,
        });
      }
      distanceAlongPath += SNAKE_SEGMENT_SPACING;
    }
  }

  private getPositionAtDistance(targetDistance: number): Position | null {
    let accumulated = 0;
    
    for (let i = 0; i < this.positionHistory.length - 1; i++) {
      const current = this.positionHistory[i];
      const next = this.positionHistory[i + 1];
      
      const dx = next.x - current.x;
      const dy = next.y - current.y;
      const segmentLength = Math.sqrt(dx * dx + dy * dy);
      
      if (accumulated + segmentLength >= targetDistance) {
        // Interpolate position
        const ratio = (targetDistance - accumulated) / segmentLength;
        return {
          x: current.x + dx * ratio,
          y: current.y + dy * ratio,
        };
      }
      
      accumulated += segmentLength;
    }
    
    // Return last position if not enough history
    return this.positionHistory[this.positionHistory.length - 1] || null;
  }

  grow(amount: number = SNAKE_GROWTH_PER_PELLET): void {
    this.length += amount;
  }

  kill(): void {
    this.alive = false;
  }

  getScore(): number {
    return this.length;
  }

  addPelletTokens(amount: number): void {
    this.pelletTokens += amount;
  }

  getPelletTokens(): number {
    return this.pelletTokens;
  }
}

