import { describe, it, expect } from "vitest";
import { Data } from "@lucid-evolution/lucid";
import { buildWithdrawRedeemer } from "../pyth.js";

describe("buildWithdrawRedeemer", () => {
  it("encodes a single hex update as a CBOR list of byte arrays", () => {
    const hexUpdate = "deadbeef";
    const redeemer = buildWithdrawRedeemer(hexUpdate);

    expect(typeof redeemer).toBe("string");
    // Should be a valid CBOR hex string
    expect(redeemer.length).toBeGreaterThan(0);

    // Decode and verify structure: should be a list containing one bytearray
    const decoded = Data.from(redeemer);
    expect(Array.isArray(decoded)).toBe(true);
    const arr = decoded as string[];
    expect(arr).toHaveLength(1);
    expect(arr[0]).toBe(hexUpdate);
  });

  it("handles a longer price update hex string", () => {
    // Simulated Pyth update bytes (truncated for test)
    const hexUpdate =
      "b9011a820000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001f0075d3c793";
    const redeemer = buildWithdrawRedeemer(hexUpdate);
    const decoded = Data.from(redeemer) as string[];
    expect(decoded).toHaveLength(1);
    expect(decoded[0]).toBe(hexUpdate);
  });
});
