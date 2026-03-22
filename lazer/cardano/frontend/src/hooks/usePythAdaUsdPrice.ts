import { PythLazerClient } from '@pythnetwork/pyth-lazer-sdk';
import { useCallback, useEffect, useRef, useState } from 'react';

const ADA_USD_FEED_ID = 16;
const PRICE_CHANNEL = 'fixed_rate@200ms';
const REFRESH_INTERVAL_MS = 30_000;

interface UsePythAdaUsdPriceState {
  adaUsd: number | null;
  isLoading: boolean;
  error: string | null;
  updatedAt: Date | null;
  refreshNow: () => Promise<void>;
}

function normalizePrice(rawPrice: string, exponent: number): number {
  const price = Number(rawPrice) * 10 ** exponent;
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('Received invalid ADA/USD value from Pyth.');
  }
  return price;
}

export function usePythAdaUsdPrice(): UsePythAdaUsdPriceState {
  const token = import.meta.env.VITE_PYTH_LAZER_TOKEN;
  const clientRef = useRef<PythLazerClient | null>(null);
  const isMountedRef = useRef(true);
  const [adaUsd, setAdaUsd] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshNow = useCallback(async () => {
    if (!token) {
      if (isMountedRef.current) {
        setError('Missing VITE_PYTH_LAZER_TOKEN. Add it to your local .env file.');
        setIsLoading(false);
      }
      return;
    }

    try {
      if (!clientRef.current) {
        clientRef.current = await PythLazerClient.create({ token });
      }

      const latestPrice = await clientRef.current.getLatestPrice({
        channel: PRICE_CHANNEL,
        formats: ['solana'],
        parsed: true,
        jsonBinaryEncoding: 'hex',
        priceFeedIds: [ADA_USD_FEED_ID],
        properties: ['price', 'exponent'],
      });

      const feed = latestPrice.parsed?.priceFeeds.find(
        (item) => item.priceFeedId === ADA_USD_FEED_ID,
      );
      if (!feed?.price || feed.exponent === undefined) {
        throw new Error('Pyth response did not include ADA/USD price and exponent.');
      }

      const normalizedPrice = normalizePrice(feed.price, feed.exponent);
      if (isMountedRef.current) {
        setAdaUsd(normalizedPrice);
        setUpdatedAt(new Date());
        setError(null);
      }
    } catch (fetchError) {
      if (isMountedRef.current) {
        setError(
          fetchError instanceof Error ? fetchError.message : 'Unexpected error while fetching price.',
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    isMountedRef.current = true;

    const runFetch = async (): Promise<void> => {
      if (!isMountedRef.current) {
        return;
      }
      await refreshNow();
    };

    void runFetch();
    const timer = window.setInterval(() => {
      void runFetch();
    }, REFRESH_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      window.clearInterval(timer);
    };
  }, [refreshNow]);

  return {
    adaUsd,
    isLoading,
    error,
    updatedAt,
    refreshNow,
  };
}
