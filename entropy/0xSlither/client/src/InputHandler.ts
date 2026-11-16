import { Camera } from './Camera';

export class InputHandler {
  private mouseX = 0;
  private mouseY = 0;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    canvas.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    // Touch support for mobile (optional but nice to have)
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        this.mouseX = e.touches[0].clientX;
        this.mouseY = e.touches[0].clientY;
      }
    });
  }

  getTargetAngle(playerX: number, playerY: number, camera: Camera): number {
    // Convert player world position to screen position
    const screenPos = camera.worldToScreen(
      playerX,
      playerY,
      this.canvas.width,
      this.canvas.height
    );

    // Calculate angle from player to mouse
    const dx = this.mouseX - screenPos.x;
    const dy = this.mouseY - screenPos.y;

    return Math.atan2(dy, dx);
  }
}

