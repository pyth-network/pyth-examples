import type { OracleDatum } from "../types/index";
import { getFreshPrice } from "./price_fetcher";
import { spendOracleUtxo } from "./tx_builder";

/**
 * Validates the current price against the datum condition off-chain,
 * then submits the spend transaction if valid.
 */
export async function executeValidator(datum: OracleDatum): Promise<string> {
  const priceUpdate = getFreshPrice();
  const price = priceUpdate.priceUsdCents;

  // Mirror the on-chain logic so we don't waste fees on a doomed tx
  switch (datum.kind) {
    case "AnyPrice":
      break;
    case "MinPrice":
      if (price < datum.minPriceUsdCents) {
        throw new Error(
          `Price too low: ${price} cents < min ${datum.minPriceUsdCents} cents`,
        );
      }
      break;
    case "MaxPrice":
      if (price > datum.maxPriceUsdCents) {
        throw new Error(
          `Price too high: ${price} cents > max ${datum.maxPriceUsdCents} cents`,
        );
      }
      break;
    case "PriceRange":
      if (price < datum.loCents || price > datum.hiCents) {
        throw new Error(
          `Price ${price} cents out of range [${datum.loCents}, ${datum.hiCents}]`,
        );
      }
      break;
  }

  console.log(
    `[validator_executor] Off-chain check passed. ADA/USD = ${price} cents. Submitting tx...`,
  );

  return spendOracleUtxo({ datum, priceUpdate });
}
