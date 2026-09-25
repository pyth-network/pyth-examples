import { setupBlaze, submitTx } from "./lib/cardano.ts";
import { getPythUpdate, FEED_NAME_TO_ID } from "./lib/pyth.ts";
import { createMarket, resolveMarket, buildBetTx, deriveMarket, parseDatum } from "./lib/market.ts";

const FEED_ID = process.env.FEED_ID ?? "BTC/USD";
const command = process.argv[2] ?? "help";

async function main() {
  console.log(`  Command: ${command}`);

  switch (command) {
    case "price": {
      const feedName = process.argv[3] ?? FEED_ID;
      const update = await getPythUpdate(feedName);
      const display = Number(update.price) * Math.pow(10, update.exponent);
      console.log(`  ${feedName}: ${display.toFixed(2)} (raw: ${update.price}, exp: ${update.exponent})`);
      break;
    }

    case "create": {
      const { blaze, provider, wallet } = await setupBlaze();
      const feedName = process.argv[3] ?? FEED_ID;
      const seedAda = BigInt(process.argv[4] ?? "10");
      const result = await createMarket({
        blaze, provider, wallet, feedName, seedAda, resolutionMs: 300_000,
      });
      console.log(`\n  Market created: ${result.txId}`);
      console.log(`  Policy: ${result.policyId}`);
      console.log(`  One-shot: ${result.oneShotTx}#${result.oneShotIdx}`);
      console.log(`\n  bun cli.ts bet ${result.policyId} ${result.oneShotTx} ${result.oneShotIdx} yes 2`);
      console.log(`  bun cli.ts resolve ${result.policyId} ${result.oneShotTx} ${result.oneShotIdx}`);
      break;
    }

    case "resolve": {
      const { blaze, provider, wallet } = await setupBlaze();
      const result = await resolveMarket({
        blaze, provider, wallet,
        policyId: process.argv[3]!,
        oneShotTx: process.argv[4]!,
        oneShotIdx: parseInt(process.argv[5] ?? "0"),
      });
      console.log(`  Resolved: ${result.txId} (winner: ${result.winner})`);
      break;
    }

    case "bet": {
      const { blaze, provider, wallet } = await setupBlaze();
      const { tx, tokensOut } = await buildBetTx({
        blaze, provider,
        policyId: process.argv[3]!,
        oneShotTx: process.argv[4]!,
        oneShotIdx: parseInt(process.argv[5] ?? "0"),
        direction: (process.argv[6] ?? "yes") as "yes" | "no",
        amountAda: BigInt(process.argv[7] ?? "2"),
      });
      const signed = await blaze.signTransaction(tx);
      const txId = await submitTx(signed);
      console.log(`  Bet placed: ${txId} (got ${tokensOut} tokens)`);
      break;
    }

    case "help":
    default:
      console.log(`
  Prediction Market CLI

  Commands:
    price [feed]                                          Check Pyth price
    create [feed] [ada]                                   Create market (5-min, default: BTC/USD 10 ADA)
    bet <policy> <oneshot_tx> <oneshot_idx> <yes|no> [ada] Place bet (default: 2 ADA)
    resolve <policy> <oneshot_tx> <oneshot_idx>           Resolve market

  Server:
    bun --hot server.ts                                   Start bot + frontend
      `);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
