import {
  parseMappingData,
  parsePriceData,
  parseProductData,
} from "@pythnetwork/client";
import { AccountInfo, PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { useConnection } from "../contexts/connection";

const oraclePublicKey = "ArppEFcsybCLE8CRtQJLQ9tLv2peGmQoKWFuiUWm4KBP";

const BAD_SYMBOLS = ["BCH/USD", "LTC/USD"];

const createSetSymbolMapUpdater = (
  symbol: string,
  product: any,
  price: any
) => (prev: any) =>
  !prev[symbol] || prev[symbol].price["currentSlot"] < price.currentSlot
    ? {
        ...prev,
        [symbol]: {
          product,
          price,
        },
      }
    : prev;

const handlePriceInfo = (
  symbol: string,
  product: any,
  accountInfo: AccountInfo<Buffer> | null,
  setSymbolMap: Function
) => {
  if (!accountInfo || !accountInfo.data) return;
  const price = parsePriceData(accountInfo.data);
  if (price.priceType !== 1)
    console.log(symbol, price.priceType, price.nextPriceAccountKey.toString);
  setSymbolMap(createSetSymbolMapUpdater(symbol, product, price));
};

interface ISymbolMap {
  [index: string]: object;
}

const usePyth = (symbolFilter?: Array<String>) => {
  const connection = useConnection();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState();
  const [numProducts, setNumProducts] = useState(0);
  const [symbolMap, setSymbolMap] = useState<ISymbolMap>({});
  useEffect(() => {
    const subscription_ids: number[] = [];
    // read mapping account
    const publicKey = new PublicKey(oraclePublicKey);
    connection
      .getAccountInfo(publicKey)
      .then((accountInfo) => {
        setIsLoading(false);
        if (!accountInfo || !accountInfo.data) return;
        const { productAccountKeys } = parseMappingData(accountInfo.data);
        setNumProducts(productAccountKeys.length);
        // get sub-accounts per symbol
        for (const productAccountKey of productAccountKeys) {
          connection
            .getAccountInfo(productAccountKey)
            .then((accountInfo) => {
              if (!accountInfo || !accountInfo.data) return;
              const { priceAccountKey, product } = parseProductData(
                accountInfo.data
              );
              const symbol = product["symbol"];
              if (
                (!symbolFilter || symbolFilter.includes(symbol)) &&
                !BAD_SYMBOLS.includes(symbol)
              ) {
                // TODO: we can add product info here and update the price later
                connection
                  .getAccountInfo(priceAccountKey)
                  .then((accountInfo) => {
                    handlePriceInfo(symbol, product, accountInfo, setSymbolMap);
                  })
                  .catch(() => {
                    console.warn(
                      `Failed to fetch price for ${product["symbol"]}`
                    );
                  });
                subscription_ids.push(
                  connection.onAccountChange(priceAccountKey, (accountInfo) => {
                    handlePriceInfo(symbol, product, accountInfo, setSymbolMap);
                  })
                );
              }
            })
            .catch(() => {
              console.warn(
                `Failed to fetch product info for ${productAccountKey.toString()}`
              );
            });
        }
      })
      .catch((e) => {
        setError(e);
        setIsLoading(false);
        console.warn(
          `Failed to fetch mapping info for ${publicKey.toString()}`
        );
      });
    return () => {
      for (const subscription_id of subscription_ids) {
        connection.removeAccountChangeListener(subscription_id).catch(() => {
          console.warn(
            `Unsuccessfully attempted to remove listener for subscription id ${subscription_id}`
          );
        });
      }
    };
  }, [connection, symbolFilter]);
  return { isLoading, error, numProducts, symbolMap };
};

export default usePyth;
