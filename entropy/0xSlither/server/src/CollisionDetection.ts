import { SnakeEntity } from './Snake';
import { Pellet, SNAKE_HEAD_RADIUS, COLLISION_DISTANCE } from '@0xslither/shared';

export interface CollisionResult {
  victimId: string;
  killerId: string | null; // null if self-collision or world bounds
}

export class CollisionDetection {
  static checkPelletCollision(snake: SnakeEntity, pellet: Pellet): boolean {
    const dx = snake.headPosition.x - pellet.x;
    const dy = snake.headPosition.y - pellet.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance < SNAKE_HEAD_RADIUS + pellet.size;
  }

  static checkSnakeCollisions(snakes: SnakeEntity[]): CollisionResult[] {
    const collisions: CollisionResult[] = [];
    const processedVictims = new Set<string>();

    for (const snake of snakes) {
      if (!snake.alive || processedVictims.has(snake.id)) continue;

      // Check collision with all other snakes' body segments
      for (const otherSnake of snakes) {
        if (!otherSnake.alive) continue;
        
        // Check against all segments (including head for other snakes)
        const segmentsToCheck = otherSnake.segments;
        
        for (let i = 0; i < segmentsToCheck.length; i++) {
          const segment = segmentsToCheck[i];
          
          // Skip checking against own first 3 segments to prevent immediate self-collision
          // A snake can only hit its own body if it's long enough and turns back on itself
          if (snake.id === otherSnake.id && i < 3) {
            continue;
          }

          const dx = snake.headPosition.x - segment.x;
          const dy = snake.headPosition.y - segment.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < COLLISION_DISTANCE) {
            // Determine killer: if self-collision, killer is null
            const killerId = snake.id === otherSnake.id ? null : otherSnake.id;
            collisions.push({ victimId: snake.id, killerId });
            processedVictims.add(snake.id);
            break;
          }
        }
        
        if (processedVictims.has(snake.id)) break;
      }
    }

    return collisions;
  }

  static checkWorldBounds(snake: SnakeEntity, worldWidth: number, worldHeight: number): boolean {
    // Die when the head (with its radius) touches or crosses the boundary
    return (
      snake.headPosition.x - SNAKE_HEAD_RADIUS < 0 ||
      snake.headPosition.x + SNAKE_HEAD_RADIUS > worldWidth ||
      snake.headPosition.y - SNAKE_HEAD_RADIUS < 0 ||
      snake.headPosition.y + SNAKE_HEAD_RADIUS > worldHeight
    );
  }
}

