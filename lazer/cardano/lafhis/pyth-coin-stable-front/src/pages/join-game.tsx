import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { BlockfrostProvider, resolvePaymentKeyHash } from "@meshsdk/core";
import { useWallet } from "@meshsdk/react";
import JoinGameConfigBar, { type JoinGameInput } from "@/components/JoinGameConfigBar";
import RequireWallet from "@/components/RequireWallet";
import { DURATION_TO_MS, getOnchainFeedId } from "@/lib/onchain";
import { depositB } from "@/transactions/tx";
import type { GameSession } from "@/types/game";
import { HermesClient } from "@pythnetwork/hermes-client";

type OnchainConfigResponse = {
  blockfrostId?: string;
  pythPolicyId?: string;
  backendPkh?: string;
  plutus?: { validators: Array<{ title: string; compiledCode: string }> };
  error?: string;
};

function parseGameId(input: string) {
  const value = input.trim();
  if (!value) return "";

  if (value.includes("/game/")) {
    const match = value.match(/\/game\/([^/?#]+)/i);
    return match?.[1] ?? "";
  }

  return value;
}

export default function JoinGamePage() {
  const router = useRouter();
  const { address, wallet } = useWallet();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameInput, setGameInput] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    opponentRate: GameSession["config"]["rate"];
    betAda: number;
    gameId: string;
  } | null>(null);
  const initialGameInput = useMemo(() => {
    const q = router.query.gameId;
    return typeof q === "string" ? q : "";
  }, [router.query.gameId]);

  useEffect(() => {
    if (initialGameInput) {
      setGameInput(initialGameInput);
    }
  }, [initialGameInput]);

  useEffect(() => {
    const gameId = parseGameId(gameInput);
    if (!gameId) {
      setPreview(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }

    let active = true;
    setPreviewLoading(true);
    setPreviewError(null);

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const gameRes = await fetch(`/api/games/${gameId}`);
          const gameData = (await gameRes.json()) as { game?: GameSession; error?: string };
          if (!gameRes.ok || !gameData.game) {
            throw new Error(gameData.error ?? "Game not found");
          }

          if (!active) return;
          setPreview({
            opponentRate: gameData.game.config.rate,
            betAda: gameData.game.config.betAda,
            gameId: gameData.game.id,
          });
        } catch (err) {
          if (!active) return;
          setPreview(null);
          const message = err instanceof Error ? err.message : "Could not load game preview";
          setPreviewError(message);
        } finally {
          if (active) setPreviewLoading(false);
        }
      })();
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [gameInput]);

  async function resolveHermesFeedId(rate: GameSession["config"]["rate"]) {
    const client = new HermesClient("https://hermes.pyth.network", {});
    const feeds = await client.getPriceFeeds({ assetType: "crypto" });
    const match = feeds.find((feed) => (feed.attributes.display_symbol ?? "").toUpperCase() === rate);
    if (!match) {
      throw new Error(`Missing Hermes feed id for ${rate}`);
    }
    return match.id;
  }

  async function handleJoin({ selectedRate, gameInput }: JoinGameInput) {
    if (!address) {
      setError("Wallet address is still loading. Please wait and try again.");
      return;
    }

    const gameId = parseGameId(gameInput);
    if (!gameId) {
      setError("Enter a valid game ID or invite link.");
      return;
    }

      setJoining(true);
      setError(null);

      try {
        const gameRes = await fetch(`/api/games/${gameId}`);
        const gameData = (await gameRes.json()) as { game?: GameSession; error?: string };
        if (!gameRes.ok || !gameData.game) {
          throw new Error(gameData.error ?? "Game not found");
        }

        if (gameData.game.config.rate === selectedRate) {
          throw new Error("You must pick a different asset than your opponent.");
        }

        if (
          !gameData.game.onchain.duelId ||
          !gameData.game.onchain.depositATxHash ||
          gameData.game.onchain.depositATxIndex == null ||
          !gameData.game.onchain.playerOnePkh
        ) {
          throw new Error("Game is missing deposit A on-chain data");
        }

        const onchainConfigRes = await fetch("/api/onchain/deposit-a-config");
        const onchainConfig = (await onchainConfigRes.json()) as OnchainConfigResponse;
        if (!onchainConfigRes.ok) {
          throw new Error(onchainConfig.error ?? "Could not load on-chain config");
        }
        if (
          !onchainConfig.blockfrostId ||
          !onchainConfig.pythPolicyId ||
          !onchainConfig.backendPkh ||
          !onchainConfig.plutus
        ) {
          throw new Error("Incomplete on-chain config");
        }

        const playerTwoPkh = resolvePaymentKeyHash(address);
        const playerTwoPriceFeedId = await resolveHermesFeedId(selectedRate);

        const feedA = gameData.game.onchain.playerOneFeedId ?? getOnchainFeedId(gameData.game.config.rate);
        const feedB = getOnchainFeedId(selectedRate);

        // Fetch Pyth Lazer signed prices from the backend (needs server-side PYTH_TOKEN)
        const lazerRes = await fetch("/api/onchain/pyth-lazer-prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedIds: [feedA, feedB] }),
        });
        const lazerData = (await lazerRes.json()) as {
          signedUpdateHex?: string;
          parsedPrices?: Array<{ feedId: number; price: number; exponent: number }>;
          error?: string;
        };
        if (!lazerRes.ok || !lazerData.signedUpdateHex || !lazerData.parsedPrices) {
          throw new Error(lazerData.error ?? "Could not fetch Pyth Lazer prices");
        }
        const priceA = lazerData.parsedPrices.find((p) => p.feedId === feedA);
        const priceB = lazerData.parsedPrices.find((p) => p.feedId === feedB);
        if (!priceA || !priceB) throw new Error("Missing price data for one or both feeds");

        const provider = new BlockfrostProvider(onchainConfig.blockfrostId);
        const utxos = await wallet.getUtxos();
        const depositResult = await depositB({
          provider,
          wallet,
          utxos,
          playerTwoAddress: address,
          playerOnePkh: gameData.game.onchain.playerOnePkh,
          playerTwoPkh,
          depositATxHash: gameData.game.onchain.depositATxHash,
          depositATxIndex: gameData.game.onchain.depositATxIndex,
          duelId: gameData.game.onchain.duelId,
          backendPkh: onchainConfig.backendPkh,
          pythPolicyId: onchainConfig.pythPolicyId,
          blockfrostId: onchainConfig.blockfrostId,
          signedUpdateHex: lazerData.signedUpdateHex,
          startPriceA: Number(priceA.price),
          startPriceB: Number(priceB.price),
          plutus: onchainConfig.plutus,
          feedA,
          feedB,
          bet_lovelace: Math.round(gameData.game.config.betAda * 1_000_000),
          duelDuration: DURATION_TO_MS[gameData.game.config.duration],
        });

        const submitRes = await fetch("/api/onchain/deposit-b-submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ partiallySignedTx: depositResult.partiallySignedTx }),
        });
        const submitData = (await submitRes.json()) as { txHash?: string; error?: string };
        if (!submitRes.ok || !submitData.txHash) {
          throw new Error(submitData.error ?? "Backend failed to submit deposit B");
        }

        const persistRes = await fetch(`/api/games/${gameId}/onchain`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            depositBTxHash: submitData.txHash,
            playerTwoPkh,
            playerTwoFeedId: getOnchainFeedId(selectedRate),
            playerTwoPriceFeedId,
            startPriceA: depositResult.startPriceA,
            startPriceB: depositResult.startPriceB,
            deadlinePosix: depositResult.deadlinePosix,
          }),
        });
        if (!persistRes.ok) {
          const persistData = (await persistRes.json()) as { error?: string };
          throw new Error(persistData.error ?? "Could not persist deposit B data");
        }

        const joinRes = await fetch(`/api/games/${gameId}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet: address,
            selectedRate,
          }),
        });
        const joinData = (await joinRes.json()) as { game?: GameSession; error?: string };
        if (!joinRes.ok || !joinData.game) {
          throw new Error(joinData.error ?? "Could not join game");
        }

        console.log(`[join-game] depositB tx: ${submitData.txHash}`);
        console.log(`[join-game] explorer: https://preprod.cardanoscan.io/transaction/${submitData.txHash}`);

        await router.push(`/game/${gameId}?txHash=${submitData.txHash}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not join game";
        setError(message);
      } finally {
        setJoining(false);
      }
  }

  return (
    <>
      <Head>
        <title>Join Game</title>
      </Head>
      <main className="mx-auto min-h-[60vh] w-[92%] max-w-6xl py-10">
        <RequireWallet
          title="Connect Wallet To Join Game"
          description="Connect your wallet to enter a game lobby."
        >
          <JoinGameConfigBar
            key={initialGameInput}
            joining={joining}
            error={error}
            initialGameInput={initialGameInput}
            gameInput={gameInput}
            onGameInputChange={setGameInput}
            preview={preview}
            previewLoading={previewLoading}
            previewError={previewError}
            onJoin={handleJoin}
          />
        </RequireWallet>
      </main>
    </>
  );
}
