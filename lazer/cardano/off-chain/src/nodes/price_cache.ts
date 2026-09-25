import type { CachedPrice, PriceUpdate } from "../types/index";

class PriceCache {
  private cached: CachedPrice | null = null;

  set(update: PriceUpdate): void {
    this.cached = { update, receivedAt: Date.now() };
  }

  get(): CachedPrice | null {
    return this.cached;
  }

  clear(): void {
    this.cached = null;
  }
}

export const priceCache = new PriceCache();
