// Pyth Lazer feed IDs (integer, not hex)
export const ADA_USD_FEED_ID = 16;

// Defaults for the decision config
export const DEFAULT_MIN_PRICE_USD_CENTS = 20; // $0.20
export const DEFAULT_MAX_PRICE_USD_CENTS = 100; // $1.00
export const DEFAULT_MAX_AGE_SECONDS = 60;
export const DEFAULT_LOCK_LOVELACE = "2000000"; // 2 ADA

export const EXPLORER_URLS: Record<string, string> = {
  preview: "https://preview.cardanoscan.io/transaction",
  preprod: "https://preprod.cardanoscan.io/transaction",
  mainnet: "https://cardanoscan.io/transaction",
};

export const DATUM_KIND_OPTIONS = [
  { label: "Any Price", value: "AnyPrice" },
  { label: "Min Price", value: "MinPrice" },
  { label: "Max Price", value: "MaxPrice" },
  { label: "Price Range", value: "PriceRange" },
] as const;

export const NETWORK_OPTIONS = ["Preview", "Preprod", "Mainnet"] as const;
