import { describe, it, expect } from "vitest";
import { getCompiledCode, buildValidator, getScriptAddress } from "../validator.js";

describe("getCompiledCode", () => {
  it("loads the compiled code from the blueprint", () => {
    const code = getCompiledCode();
    expect(code).toBeDefined();
    expect(typeof code).toBe("string");
    expect(code.length).toBeGreaterThan(0);
  });
});

describe("buildValidator", () => {
  const baseParams = {
    usdAmountCents: 1000n,
    userPaymentKeyHash:
      "aabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd00000001",
    sponsorPaymentKeyHash:
      "aabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd00000002",
    pythPolicyId:
      "aabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd00000003",
  };

  it("returns a PlutusV3 spending validator", () => {
    const validator = buildValidator(baseParams);
    expect(validator.type).toBe("PlutusV3");
    expect(typeof validator.script).toBe("string");
    expect(validator.script.length).toBeGreaterThan(0);
  });

  it("produces a valid script address", () => {
    const validator = buildValidator(baseParams);
    const address = getScriptAddress(validator, "Preprod");
    expect(address).toBeDefined();
    expect(address.startsWith("addr_test1")).toBe(true);
  });

  it("different usd amounts produce different script hashes", () => {
    const v1 = buildValidator({ ...baseParams, usdAmountCents: 1000n });
    const v2 = buildValidator({ ...baseParams, usdAmountCents: 2000n });
    expect(v1.script).not.toBe(v2.script);
  });

  it("different user addresses produce different script hashes", () => {
    const v1 = buildValidator(baseParams);
    const v2 = buildValidator({
      ...baseParams,
      userPaymentKeyHash:
        "11111111111111111111111111111111111111111111111111111111",
    });
    expect(v1.script).not.toBe(v2.script);
  });

  it("different sponsor addresses produce different script hashes", () => {
    const v1 = buildValidator(baseParams);
    const v2 = buildValidator({
      ...baseParams,
      sponsorPaymentKeyHash:
        "22222222222222222222222222222222222222222222222222222222",
    });
    expect(v1.script).not.toBe(v2.script);
  });

  it("supports addresses with stake key hashes", () => {
    const validator = buildValidator({
      ...baseParams,
      userStakeKeyHash:
        "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      sponsorStakeKeyHash:
        "ffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    });
    expect(validator.type).toBe("PlutusV3");
    expect(validator.script.length).toBeGreaterThan(0);
  });
});
