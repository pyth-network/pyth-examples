const endpoint =
  readFirstEnv("OGMIOS_ENDPOINT", "OGMIOS_URL") ??
  "https://cardano-preprod-v6.ogmios-m1.dmtr.host";
const apiKey =
  readFirstEnv("DMTR_API_KEY_OGMIOS", "OGMIOS_API_KEY", "DMTR_API_KEY") ??
  "ogmios12mr2qnpkh8g7wyrkq6v";

const txCbor = process.argv[2]?.trim();

if (!txCbor) {
  throw new Error("Expected tx CBOR hex as the first CLI argument");
}

if (!/^[0-9a-fA-F]+$/.test(txCbor) || txCbor.length % 2 !== 0) {
  throw new Error("CBOR must be an even-length hex string");
}

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "dmtr-api-key": apiKey,
  },
  body: JSON.stringify({
    jsonrpc: "2.0",
    method: "evaluateTransaction",
    params: {
      transaction: { cbor: txCbor },
    },
  }),
});

const responseText = await response.text();

console.log(`Ogmios endpoint: ${endpoint}`);
console.log(`HTTP status: ${response.status}`);
console.log(responseText);

if (!response.ok) {
  process.exitCode = 1;
}

function readFirstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return undefined;
}
