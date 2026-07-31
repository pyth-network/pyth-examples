import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { blockchainSurface, collaborationGuide } from "../src/manifests.js";

describe("blockchain collaboration surface", () => {
  it("anchors the app-level blockchain workspace under apps/blockchain", () => {
    expect(collaborationGuide.entrypoint.endsWith(path.join("apps", "blockchain"))).toBe(true);
    expect(fs.existsSync(collaborationGuide.entrypoint)).toBe(true);
    expect(fs.statSync(collaborationGuide.entrypoint).isDirectory()).toBe(true);
  });

  it("declares concrete Cardano collaboration paths", () => {
    expect(blockchainSurface.cardano.contractsRoot).toContain(
      path.join("apps", "blockchain", "cardano", "contracts"),
    );
    expect(fs.existsSync(blockchainSurface.cardano.contractsRoot!)).toBe(true);
    expect(fs.statSync(blockchainSurface.cardano.contractsRoot!).isDirectory()).toBe(true);
    for (const currentSource of blockchainSurface.cardano.currentSourceOfTruth) {
      expect(fs.existsSync(currentSource)).toBe(true);
      expect(fs.statSync(currentSource).isFile()).toBe(true);
    }
  });
});
