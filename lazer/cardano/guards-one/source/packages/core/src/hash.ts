import { createHash } from "node:crypto";

function stableValue(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map(stableValue);
  }

  if (input && typeof input === "object") {
    return Object.keys(input as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = stableValue((input as Record<string, unknown>)[key]);
        return accumulator;
      }, {});
  }

  return input;
}

export function stableHash(input: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(stableValue(input)))
    .digest("hex");
}
