import {
  parseMappingData,
  parsePriceData,
  parseProductData,
} from "@pythnetwork/client";
import { AccountInfo, PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { getMultipleAccounts } from "../contexts/accounts";
import { useConnection } from "../contexts/connection";

const oraclePublicKey = "BmA9Z6FjioHJPpjT39QazZyhDRUdZy2ezwx4GiDdE2u2";

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
    console.log(symbol, price.priceType, price.nextPriceAccountKey);
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
    (async () => {
      // read mapping account
      const publicKey = new PublicKey(oraclePublicKey);
      try {
        const accountInfo = await connection.getAccountInfo(publicKey);
        setIsLoading(false);
        if (!accountInfo || !accountInfo.data) return;
        const { productAccountKeys } = parseMappingData(accountInfo.data);
        setNumProducts(productAccountKeys.length);
        const productsInfos = await getMultipleAccounts(
          connection,
          productAccountKeys.map((p) => p.toBase58()),
          "confirmed"
        );
        const productsData = productsInfos.array.map((p) =>
          parseProductData(p.data)
        );
        const priceInfos = await getMultipleAccounts(
          connection,
          productsData.map((p) => p.priceAccountKey.toBase58()),
          "confirmed"
        );

        for (let i = 0; i < productsInfos.keys.length; i++) {
          const key = productsInfos.keys[i];

          const productData = productsData[i];
          const product = productData.product;
          const symbol = product["symbol"];
          const priceAccountKey = productData.priceAccountKey;
          const priceInfo = priceInfos.array[i];

          console.log(
            `Product ${symbol} key: ${key} price: ${priceInfos.keys[i]}`
          );

          if (
            (!symbolFilter || symbolFilter.includes(symbol)) &&
            !BAD_SYMBOLS.includes(symbol)
          ) {
            handlePriceInfo(symbol, product, priceInfo, setSymbolMap);

            subscription_ids.push(
              connection.onAccountChange(priceAccountKey, (accountInfo) => {
                handlePriceInfo(symbol, product, accountInfo, setSymbolMap);
              })
            );
          }
        }
      } catch (e) {
        setError(e);
        setIsLoading(false);
        console.warn(
          `Failed to fetch mapping info for ${publicKey.toString()}`
        );
      }
    })();
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
