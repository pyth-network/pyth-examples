import { startPriceFetcher, stopPriceFetcher, getFreshPrice } from "./nodes/price_fetcher";
import { VALIDATOR_SCRIPT_HASH } from "./config";

async function main() {
  const mode = process.argv[2] ?? "feed";

  if (mode === "feed") {
    // ── Mode 1: just stream prices ─────────────────────────────────────────
    console.log("Mode: feed-only. Press Ctrl+C to stop.");
    await startPriceFetcher();

    // Print a fresh price every 5s
    setInterval(() => {
      try {
        const p = getFreshPrice();
        console.log(
          `ADA/USD = ${p.priceUsdCents} cents  payload=${p.payload.length}b`,
        );
      } catch (e: any) {
        console.warn(e.message);
      }
    }, 5_000);

    // Keep alive
    await new Promise(() => {});
  } else if (mode === "lock" || mode === "spend") {
    // ── Mode 2/3: on-chain tx (requires compiled validator) ────────────────
    if (!VALIDATOR_SCRIPT_HASH) {
      throw new Error(
        "VALIDATOR_SCRIPT_HASH is not set in .env — compile the Aiken contract first.",
      );
    }

    const { lockOracleUtxo } = await import("./nodes/tx_builder");
    const { executeValidator } = await import("./nodes/validator_executor");
    const { OracleDatum: _ } = await import("./types/index") as any;

    await startPriceFetcher();
    await new Promise((r) => setTimeout(r, 2_000));

    const datum = { kind: "MinPrice" as const, minPriceUsdCents: 50n };

    if (mode === "lock") {
      const txHash = await lockOracleUtxo(datum);
      console.log(`Locked UTxO: ${txHash}`);
    } else {
      const txHash = await executeValidator(datum);
      console.log(`Spent UTxO: ${txHash}`);
    }

    stopPriceFetcher();
  } else {
    console.error("Usage: npm run dev [feed|lock|spend]");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
