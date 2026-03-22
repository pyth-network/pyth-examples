import Head from "next/head";
import { useRouter } from "next/router";
import { useState } from "react";
import CreateGameConfigBar from "@/components/CreateGameConfigBar";
import type { CreateGameConfigInput } from "@/components/CreateGameConfigBar";
import RequireWallet from "@/components/RequireWallet";
import { getOnchainFeedId } from "@/lib/onchain";
import { depositA } from "@/transactions/tx";
import { BlockfrostProvider, resolvePaymentKeyHash } from "@meshsdk/core";
import { useWallet } from "@meshsdk/react";
import { HermesClient } from "@pythnetwork/hermes-client";

type OnchainConfigResponse = {
  blockfrostId?: string;
  pythPolicyId?: string;
  backendPkh?: string;
  plutus?: { validators: Array<{ title: string; compiledCode: string }> };
  error?: string;
};

export default function CreateGamePage() {
  const router = useRouter();
  const { address, wallet } = useWallet();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolveHermesFeedId(rate: CreateGameConfigInput["rate"]) {
    const client = new HermesClient("https://hermes.pyth.network", {});
    const feeds = await client.getPriceFeeds({ assetType: "crypto" });
    const match = feeds.find((feed) => (feed.attributes.display_symbol ?? "").toUpperCase() === rate);
    if (!match) {
      throw new Error(`Missing Hermes feed id for ${rate}`);
    }
    return match.id;
  }

  async function handleCreate(config: CreateGameConfigInput) {
    if (!address) {
      setError("Wallet address is still loading. Please wait and try again.");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const lovelace = Math.round(config.betAda * 1_000_000);
      if (!Number.isFinite(lovelace) || lovelace <= 0) {
        throw new Error("Invalid bet amount");
      }

      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config,
          creatorWallet: address,
        }),
      });

      const data = (await response.json()) as { game?: { id: string }; error?: string };
      if (!response.ok || !data.game?.id) {
        throw new Error(data.error ?? "Could not create game");
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

      const provider = new BlockfrostProvider(onchainConfig.blockfrostId);
      const utxos = await wallet.getUtxos();
      console.log(utxos);
      const depositResult = await depositA({
        provider,
        wallet,
        utxos,
        playerOneAddress: address,
        backendPkh: onchainConfig.backendPkh,
        pythPolicyId: onchainConfig.pythPolicyId,
        plutus: onchainConfig.plutus,
        bet_lovelace: lovelace,
      });
      console.log("[create-game] partial tx built, sending to backend to co-sign...");

      // Backend co-signs (NFT mint requires backend_pkh) and submits
      const submitRes = await fetch("/api/onchain/deposit-a-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partiallySignedTx: depositResult.partiallySignedTx }),
      });
      const submitData = (await submitRes.json()) as { txHash?: string; error?: string };
      if (!submitRes.ok || !submitData.txHash) {
        throw new Error(submitData.error ?? "Backend failed to submit transaction");
      }

      const txHash = submitData.txHash;
      console.log(`[create-game] depositA tx: ${txHash}`);
      console.log(`[create-game] explorer: https://preprod.cardanoscan.io/transaction/${txHash}`);

      const playerOnePkh = resolvePaymentKeyHash(address);
      const playerOnePriceFeedId = await resolveHermesFeedId(config.rate);
      const onchainRes = await fetch(`/api/games/${data.game.id}/onchain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duelId: depositResult.duelId,
          depositATxHash: txHash,
          depositATxIndex: 0,
          playerOnePkh,
          playerOnePriceFeedId,
          playerOneFeedId: getOnchainFeedId(config.rate),
        }),
      });
      if (!onchainRes.ok) {
        const onchainData = (await onchainRes.json()) as { error?: string };
        throw new Error(onchainData.error ?? "Could not persist on-chain game data");
      }

      await router.push(`/game/${data.game.id}?txHash=${txHash}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create game";
      setError(message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <Head>
        <title>Create Game</title>
      </Head>
      <main className="mx-auto min-h-[60vh] w-[92%] max-w-6xl py-10">
        <RequireWallet
          title="Connect your  Wallet To Create a Game"
          description="Connect your wallet to configure the game."
        >
          <CreateGameConfigBar creating={creating} error={error} onCreate={handleCreate} />
        </RequireWallet>
      </main>
    </>
  );
}
