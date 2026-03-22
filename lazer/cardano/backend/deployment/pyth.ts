import {
  Constr,
  Data,
  fromText,
  validatorToRewardAddress,
  type LucidEvolution,
  type Network,
  type UTxO,
  type WithdrawalValidator,
} from "@lucid-evolution/lucid";
import {
  PythLazerClient,
  type JsonOrBinaryResponse,
} from "@pythnetwork/pyth-lazer-sdk";

const ADA_USD_FEED_ID = 16;
const PYTH_LAZER_WS_URL = "wss://pyth-lazer.dourolabs.app/v1/stream";

export interface PythContext {
  stateUtxo: UTxO;
  withdrawScriptHash: string;
  withdrawValidator: WithdrawalValidator;
  rewardAddress: string;
}

/**
 * Fetches the Pyth State UTxO and extracts the withdraw script hash.
 */
export async function getPythContext(
  lucid: LucidEvolution,
  pythPolicyId: string,
  network: Network,
): Promise<PythContext> {
  const pythStateUnit = pythPolicyId + fromText("Pyth State");
  const stateUtxo = await lucid.utxoByUnit(pythStateUnit);

  if (!stateUtxo.datum) {
    throw new Error("Pyth State UTxO has no inline datum");
  }

  // Decode the Pyth datum to get withdraw_script hash
  // Pyth { governance, trusted_signers, deprecated_withdraw_scripts, withdraw_script }
  const datum = Data.from(stateUtxo.datum);
  if (!(datum instanceof Constr)) {
    throw new Error("Unexpected Pyth datum format");
  }
  const withdrawScriptHash = datum.fields[3] as string;

  // Build the reward address for the zero-withdrawal
  const withdrawValidator: WithdrawalValidator = {
    type: "PlutusV3",
    script: withdrawScriptHash,
  };
  const rewardAddress = validatorToRewardAddress(network, withdrawValidator);

  return { stateUtxo, withdrawScriptHash, withdrawValidator, rewardAddress };
}

/**
 * Fetches the latest ADA/USD price update from Pyth Lazer in solana/cardano format.
 * Connects via WebSocket, subscribes to the feed, waits for one update, then disconnects.
 * Returns the raw update bytes as hex string.
 */
export async function fetchPriceUpdate(
  lazerToken: string,
): Promise<string> {
  const client = await PythLazerClient.create({
    urls: [PYTH_LAZER_WS_URL],
    token: lazerToken,
  });

  return new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      client.shutdown();
      reject(new Error("Timed out waiting for Pyth Lazer price update"));
    }, 15_000);

    client.addMessageListener((message: JsonOrBinaryResponse) => {
      if (message.type === "json" && message.value.type === "streamUpdated") {
        // Extract solana-format hex from the JSON response
        const solanaData = (
          message.value as Record<string, unknown>
        ).solana as { encoding?: string; data?: string } | undefined;
        if (solanaData?.data) {
          clearTimeout(timeout);
          client.shutdown();
          resolve(solanaData.data);
          return;
        }
      }
      if (message.type === "binary" && message.value.solana) {
        clearTimeout(timeout);
        client.shutdown();
        resolve(message.value.solana.toString("hex"));
        return;
      }
    });

    client.addAllConnectionsDownListener(() => {
      clearTimeout(timeout);
      reject(new Error("All Pyth Lazer WebSocket connections are down"));
    });

    client.subscribe({
      type: "subscribe",
      subscriptionId: 1,
      priceFeedIds: [ADA_USD_FEED_ID],
      properties: ["price", "exponent"],
      formats: ["solana"],
      deliveryFormat: "binary",
      channel: "fixed_rate@200ms",
      jsonBinaryEncoding: "hex",
    });
  });
}

/**
 * Builds the withdrawal redeemer containing the price update bytes.
 * The redeemer is a List<ByteArray> encoded as PlutusData.
 */
export function buildWithdrawRedeemer(priceUpdateHex: string): string {
  return Data.to<string[]>([priceUpdateHex]);
}

/**
 * Parses the ADA/USD price from a raw Pyth Lazer hex-encoded update message.
 *
 * The price is returned as { numerator, denominator } so callers can do exact
 * bigint arithmetic without floating-point loss.
 *
 * Wire format (little-endian):
 *   4B magic (b9011a82) | 64B signature | 32B pubkey | 2B payload_len | payload
 * Payload:
 *   4B magic (75d3c793) | 8B timestamp_us | 1B channel_id | 1B feeds_count | feeds...
 * Each feed:
 *   4B feed_id | 1B props_count | props...
 * Property 0 (price): 1B id=0 | 8B i64 LE (raw price integer)
 * Property 4 (exponent): 1B id=4 | 2B i16 LE (exponent, typically negative)
 *
 * actual_price = price_raw * 10^exponent
 * So: numerator = price_raw, denominator = 10^(-exponent)   (when exponent < 0)
 */
export function parseAdaUsdPrice(priceUpdateHex: string): {
  numerator: bigint;
  denominator: bigint;
} {
  const buf = Buffer.from(priceUpdateHex, "hex");
  let offset = 0;

  // Skip envelope: 4B magic + 64B signature + 32B pubkey + 2B payload_len
  offset += 4 + 64 + 32 + 2;

  // Payload header: 4B magic + 8B timestamp + 1B channel + 1B feeds_count
  offset += 4 + 8 + 1;
  const feedsCount = buf.readUInt8(offset++);

  for (let i = 0; i < feedsCount; i++) {
    const feedId = buf.readUInt32LE(offset);
    offset += 4;
    const propsCount = buf.readUInt8(offset++);

    let priceRaw: bigint | null = null;
    let exponent: number | null = null;

    for (let j = 0; j < propsCount; j++) {
      const propId = buf.readUInt8(offset++);
      if (propId === 0) {
        // price: i64 LE
        priceRaw = buf.readBigInt64LE(offset);
        offset += 8;
      } else if (propId === 4) {
        // exponent: i16 LE
        exponent = buf.readInt16LE(offset);
        offset += 2;
      } else {
        // skip unknown/unneeded props (fixed sizes per property ID)
        offset += propSize(propId);
      }
    }

    if (feedId === ADA_USD_FEED_ID) {
      if (priceRaw === null || exponent === null) {
        throw new Error("ADA/USD feed is missing price or exponent property");
      }
      if (priceRaw <= 0n) {
        throw new Error(`ADA/USD price is zero or negative: ${priceRaw}`);
      }
      if (exponent >= 0) {
        return { numerator: priceRaw * 10n ** BigInt(exponent), denominator: 1n };
      } else {
        return { numerator: priceRaw, denominator: 10n ** BigInt(-exponent) };
      }
    }
  }

  throw new Error(`ADA/USD feed (id=${ADA_USD_FEED_ID}) not found in update`);
}

/** Byte sizes of each property payload (after the 1-byte property ID). */
function propSize(propId: number): number {
  switch (propId) {
    case 0: case 1: case 2: case 5: case 6: case 10: case 11: return 8; // i64
    case 3: return 2;  // u16
    case 4: return 2;  // i16
    case 7: case 8: case 12: return 9; // optional u64: 1B present flag + 8B value
    case 9: return 2;  // market session u16
    default: throw new Error(`Unknown Pyth property ID: ${propId}`);
  }
}
