import { Constr, Data, fromText, validatorToRewardAddress, } from "@lucid-evolution/lucid";
import { PythLazerClient, } from "@pythnetwork/pyth-lazer-sdk";
const ADA_USD_FEED_ID = 16;
const PYTH_LAZER_WS_URL = "wss://pyth-lazer.dourolabs.app/v1/stream";
/**
 * Fetches the Pyth State UTxO and extracts the withdraw script hash.
 */
export async function getPythContext(lucid, pythPolicyId, network) {
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
    const withdrawScriptHash = datum.fields[3];
    // Build the reward address for the zero-withdrawal
    const withdrawValidator = {
        type: "PlutusV3",
        script: withdrawScriptHash,
    };
    const rewardAddress = validatorToRewardAddress(network, withdrawValidator);
    return { stateUtxo, withdrawScriptHash, rewardAddress };
}
/**
 * Fetches the latest ADA/USD price update from Pyth Lazer in solana/cardano format.
 * Connects via WebSocket, subscribes to the feed, waits for one update, then disconnects.
 * Returns the raw update bytes as hex string.
 */
export async function fetchPriceUpdate(lazerToken) {
    const client = await PythLazerClient.create({
        urls: [PYTH_LAZER_WS_URL],
        token: lazerToken,
    });
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            client.shutdown();
            reject(new Error("Timed out waiting for Pyth Lazer price update"));
        }, 15_000);
        client.addMessageListener((message) => {
            if (message.type === "json" && message.value.type === "streamUpdated") {
                // Extract solana-format hex from the JSON response
                const solanaData = message.value.solana;
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
export function buildWithdrawRedeemer(priceUpdateHex) {
    return Data.to([priceUpdateHex]);
}
