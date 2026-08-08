export function assetUnit(policyId: string, tokenNameUtf8: string): string {
  const tokenNameHex = Buffer.from(tokenNameUtf8, "utf8").toString("hex");
  return `${policyId}${tokenNameHex}`;
}
