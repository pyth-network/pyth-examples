import { Position } from '@0xslither/shared';

export class Camera {
  x = 0;
  y = 0;
  private targetX = 0;
  private targetY = 0;
  private smoothing = 0.2;

  setTarget(target: Position): void {
    this.targetX = target.x;
    this.targetY = target.y;
  }

  update(): void {
    // Smooth camera movement
    this.x += (this.targetX - this.x) * this.smoothing;
    this.y += (this.targetY - this.y) * this.smoothing;
  }

  worldToScreen(worldX: number, worldY: number, canvasWidth: number, canvasHeight: number): Position {
    return {
      x: worldX - this.x + canvasWidth / 2,
      y: worldY - this.y + canvasHeight / 2,
    };
  }
}

