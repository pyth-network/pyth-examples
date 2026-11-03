import {
  Pellet,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PELLET_MIN_SIZE,
  PELLET_MAX_SIZE,
  PELLET_COLORS,
} from '@0xslither/shared';

export class PelletManager {
  private pellets: Map<string, Pellet> = new Map();
  private nextId = 0;
  private deterministicMode: boolean = false;
  private changedPelletIds: Set<string> = new Set();

  constructor(count: number, initialPellets?: Array<{ x: number; y: number; size: number; color: string }>) {
    if (initialPellets && initialPellets.length > 0) {
      // Deterministic mode: use provided pellet positions
      this.deterministicMode = true;
      for (const pellet of initialPellets) {
        this.addPellet(pellet.x, pellet.y, pellet.size, pellet.color);
      }
      console.log(`✅ Pellet field initialized deterministically with ${initialPellets.length} pellets`);
    } else {
      // Fallback mode: use random spawning
      this.deterministicMode = false;
      for (let i = 0; i < count; i++) {
        this.spawnPellet();
      }
      console.log(`⚠️  Pellet field initialized with random positions (${count} pellets)`);
    }
  }

  private addPellet(x: number, y: number, size: number, color: string): void {
    const pellet: Pellet = {
      id: `pellet-${this.nextId++}`,
      x,
      y,
      size,
      color,
      tokenAmount: 0, // Will be set during token distribution
    };
    this.pellets.set(pellet.id, pellet);
  }

  private spawnPellet(): void {
    const pellet: Pellet = {
      id: `pellet-${this.nextId++}`,
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * WORLD_HEIGHT,
      size: PELLET_MIN_SIZE + Math.random() * (PELLET_MAX_SIZE - PELLET_MIN_SIZE),
      color: PELLET_COLORS[Math.floor(Math.random() * PELLET_COLORS.length)],
      tokenAmount: 0, // Will be set during token distribution
    };
    
    this.pellets.set(pellet.id, pellet);
  }

  removePellet(id: string): void {
    this.pellets.delete(id);
    // Pellets are NOT respawned - once consumed, they're gone
  }

  getPellets(): Pellet[] {
    return Array.from(this.pellets.values());
  }

  getPellet(id: string): Pellet | undefined {
    return this.pellets.get(id);
  }

  getChangedPellets(): Pellet[] {
    const changed: Pellet[] = [];
    for (const id of this.changedPelletIds) {
      const pellet = this.pellets.get(id);
      if (pellet) {
        changed.push(pellet);
      }
    }
    return changed;
  }

  clearChanges(): void {
    this.changedPelletIds.clear();
  }

  hasChanges(): boolean {
    return this.changedPelletIds.size > 0;
  }

  /**
   * Distribute tokens across all pellets proportionally by size
   * @param totalAmount Total SSS tokens to distribute
   */
  distributePelletTokens(totalAmount: number): void {
    const pellets = Array.from(this.pellets.values());
    
    if (pellets.length === 0) {
      console.warn('No pellets to distribute tokens to');
      return;
    }

    // Calculate total size weight
    const totalSizeWeight = pellets.reduce((sum, p) => sum + p.size, 0);

    // Distribute tokens proportionally by size
    let distributedTotal = 0;
    pellets.forEach((pellet, index) => {
      if (index === pellets.length - 1) {
        // Last pellet gets remainder to avoid rounding errors
        pellet.tokenAmount = totalAmount - distributedTotal;
      } else {
        pellet.tokenAmount = (pellet.size / totalSizeWeight) * totalAmount;
        distributedTotal += pellet.tokenAmount;
      }
    });

    console.log(`✅ Distributed ${totalAmount} SSS tokens across ${pellets.length} pellets`);
  }
}

