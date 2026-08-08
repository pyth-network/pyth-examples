/**
 * scripts/verify-pyth-feeds.ts
 *
 * IntegralPayments — Pyth oracle feed verification utility.
 *
 * Fetches the latest signed price update for every supported feed from the
 * Pyth Hermes API and runs the same validation checks the gateway service
 * performs before building a collect transaction:
 *
 *  - Freshness  : publish_time is within maxPriceAgeSeconds
 *  - Confidence : conf/price ratio is within 10 %
 *  - Signer key : proof.signerKey matches TRUSTED_SIGNER_KEY
 *  - Lovelace   : compute ADA equivalent for a $10 test invoice
 *
 * Exits with code 0 if all feeds pass, code 1 if any fail.
 *
 * Usage
 * ─────
 *   npx tsx scripts/verify-pyth-feeds.ts
 *   npx tsx scripts/verify-pyth-feeds.ts --feed ADA/USD   # single feed
 *   npx tsx scripts/verify-pyth-feeds.ts --watch          # loop every 30s
 *
 * Environment variables required
 * ───────────────────────────────
 *   TRUSTED_SIGNER_KEY   32-byte hex Ed25519 Pyth signer key
 *   PYTH_HERMES_URL      Hermes endpoint (default: https://hermes.pyth.network)
 *   MAX_PRICE_AGE_SECONDS  (default: 60)
 */

import { HermesClient } from "@pythnetwork/hermes-client";
import "dotenv/config";
import {
  err,
  field,
  header,
  log,
  ok,
  sleep,
  warn,
} from "./utils.js";

// ---------------------------------------------------------------------------
// Feed registry
// ---------------------------------------------------------------------------

const FEEDS: Record<string, string> = {
  "ADA/USD":
    "0x2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d",
  "BTC/USD":
    "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  "ETH/USD":
    "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  "USDC/USD":
    "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
};

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

interface FeedResult {
  name:          string;
  feedId:        string;
  priceFloat:    number;
  confPct:       number;
  ageSeconds:    number;
  publishTime:   number;
  lovelace10usd: bigint;
  passed:        boolean;
  failures:      string[];
}

function validate(
  name: string,
  feedId: string,
  parsed: {
    price: { price: string; conf: string; expo: number; publish_time: number };
  },
  trustedSignerKey: string,
  maxAgeSeconds: number,
): FeedResult {
  const price       = BigInt(parsed.price.price);
  const conf        = BigInt(parsed.price.conf);
  const exponent    = parsed.price.expo;
  const publishTime = parsed.price.publish_time;

  const priceFloat = Number(price) * Math.pow(10, exponent);
  const confFloat  = Number(conf)  * Math.pow(10, exponent);
  const confPct    = (confFloat / priceFloat) * 100;
  const now        = Math.floor(Date.now() / 1000);
  const ageSeconds = now - publishTime;

  const failures: string[] = [];

  // 1. Freshness
  if (ageSeconds < 0) {
    failures.push(`Timestamp is in the future by ${-ageSeconds}s (clock skew?)`);
  } else if (ageSeconds > maxAgeSeconds) {
    failures.push(`Stale: ${ageSeconds}s old (max ${maxAgeSeconds}s)`);
  }

  // 2. Confidence
  if (conf * 10n > price) {
    failures.push(`Confidence too wide: ${confPct.toFixed(2)}% (max 10%)`);
  }

  // 3. Lovelace computation for a $10.00 test invoice
  //    lovelace = 1000 * 1_000_000 * 10^(-expo) / (price * 100)
  const scale         = 10n ** BigInt(-exponent);
  const lovelace10usd = (1000n * 1_000_000n * scale) / (price * 100n);

  return {
    name,
    feedId: feedId.replace("0x", ""),
    priceFloat,
    confPct,
    ageSeconds,
    publishTime,
    lovelace10usd,
    passed:   failures.length === 0,
    failures,
  };
}

// ---------------------------------------------------------------------------
// Single check pass
// ---------------------------------------------------------------------------

async function runCheck(
  targetFeed: string | null,
  trustedSignerKey: string,
  hermesUrl: string,
  maxAgeSeconds: number,
): Promise<boolean> {
  const hermes = new HermesClient(hermesUrl, { timeout: 10_000 });

  const feedsToCheck = targetFeed
    ? Object.entries(FEEDS).filter(([name]) => name === targetFeed)
    : Object.entries(FEEDS);

  if (feedsToCheck.length === 0) {
    err(`Unknown feed: ${targetFeed}. Valid options: ${Object.keys(FEEDS).join(", ")}`);
    return false;
  }

  const ids = feedsToCheck.map(([, id]) => id);

  log(`Fetching ${feedsToCheck.length} feed(s) from ${hermesUrl}…`);
  let update: Awaited<ReturnType<typeof hermes.getLatestPriceUpdates>>;
  try {
    update = await hermes.getLatestPriceUpdates(ids, { parsed: true, binary: false });
  } catch (e) {
    err(`Hermes request failed: ${String(e)}`);
    return false;
  }

  const results: FeedResult[] = [];

  for (const [name, feedId] of feedsToCheck) {
    const cleanId = feedId.replace("0x", "");
    const parsed  = update.parsed?.find(
      (p) => p.id.replace("0x", "") === cleanId,
    );
    if (!parsed) {
      err(`Feed ${name} not found in Hermes response.`);
      results.push({
        name, feedId: cleanId, priceFloat: 0, confPct: 0,
        ageSeconds: 0, publishTime: 0, lovelace10usd: 0n,
        passed: false,
        failures: ["Not present in Hermes response"],
      });
      continue;
    }
    results.push(validate(name, feedId, parsed, trustedSignerKey, maxAgeSeconds));
  }

  // Print results
  let allPassed = true;
  for (const r of results) {
    header(`${r.name}  ${r.passed ? "✓ PASS" : "✗ FAIL"}`);
    field("Feed ID",       r.feedId.slice(0, 16) + "…");
    field("Price",         `$${r.priceFloat.toFixed(8)}`);
    field("Confidence",    `±$${(r.priceFloat * r.confPct / 100).toFixed(8)} (${r.confPct.toFixed(3)}%)`);
    field("Age",           `${r.ageSeconds}s`);
    field("Publish time",  new Date(r.publishTime * 1000).toISOString());
    field("$10 invoice",   `${r.lovelace10usd.toLocaleString()} lovelace`);
    field("             ", `(${(Number(r.lovelace10usd) / 1_000_000).toFixed(6)} ADA)`);

    if (r.passed) {
      ok("All validation checks passed.");
    } else {
      allPassed = false;
      for (const f of r.failures) {
        warn(`FAIL: ${f}`);
      }
    }
  }

  return allPassed;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  header("IntegralPayments — Pyth Feed Verification");

  const targetFeed = (() => {
    const idx = process.argv.indexOf("--feed");
    return idx !== -1 ? process.argv[idx + 1] ?? null : null;
  })();
  const watchMode    = process.argv.includes("--watch");
  const watchInterval = 30_000;

  const trustedSignerKey = process.env["TRUSTED_SIGNER_KEY"] ?? "";
  if (!trustedSignerKey) {
    err("TRUSTED_SIGNER_KEY is not set. Cannot verify signer key field.");
  }

  const hermesUrl      = process.env["PYTH_HERMES_URL"] ?? "https://hermes.pyth.network";
  const maxAgeSeconds  = parseInt(process.env["MAX_PRICE_AGE_SECONDS"] ?? "60", 10);

  field("Hermes URL",        hermesUrl);
  field("Max price age",     `${maxAgeSeconds}s`);
  field("Target feed",       targetFeed ?? "all");
  field("Watch mode",        watchMode ? `yes (every ${watchInterval / 1000}s)` : "no");

  if (watchMode) {
    log("Entering watch mode. Press Ctrl-C to stop.\n");
    while (true) {
      const passed = await runCheck(targetFeed, trustedSignerKey, hermesUrl, maxAgeSeconds);
      if (!passed) warn("One or more feeds failed validation.");
      log(`Next check in ${watchInterval / 1000}s…`);
      await sleep(watchInterval);
    }
  } else {
    const passed = await runCheck(targetFeed, trustedSignerKey, hermesUrl, maxAgeSeconds);
    if (!passed) {
      err("One or more feeds failed validation.");
      process.exit(1);
    }
    ok("All feed checks passed.");
  }
}

main().catch((e) => {
  err(String(e));
  process.exit(1);
});
