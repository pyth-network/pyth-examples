import logo from "./logo.svg";
import "./App.css";
import {
  AnchorWallet,
  ConnectionProvider,
  WalletProvider,
  useAnchorWallet,
  useConnection,
} from "@solana/wallet-adapter-react";
import {
  WalletDisconnectButton,
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import {
  PythSolanaReceiver,
  InstructionWithEphemeralSigners,
} from "@pythnetwork/pyth-solana-receiver";
import { Connection, PublicKey } from "@solana/web3.js";
import * as buffer from "buffer";
import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
import { SendUSDApp, IDL } from "./idl/send_usd_app";
import { HermesClient } from "@pythnetwork/hermes-client";
import { useState } from "react";
window.Buffer = buffer.Buffer;

require("@solana/wallet-adapter-react-ui/styles.css");

const SOL_PRICE_FEED_ID =
  "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";
const SEND_USD_PROGRAM_ID: PublicKey = new PublicKey(
  "2e5gZD3suxgJgkCg4pkoogxDKszy1SAwokz8mNeZUj4M"
);
const HERMES_URL = "https://hermes.pyth.network/";
const DEVNET_RPC_URL = "https://api.devnet.solana.com";

async function postPriceUpdate(
  connection: Connection,
  wallet: AnchorWallet | undefined,
  destination: PublicKey | undefined,
  amount: number | undefined
) {
  if (!(wallet && destination && amount)) {
    return;
  } else {
    const hermesClient = new HermesClient(HERMES_URL);
    const pythSolanaReceiver = new PythSolanaReceiver({
      connection,
      wallet: wallet as Wallet,
    });

    const priceUpdateData = await hermesClient.getLatestPriceUpdates([SOL_PRICE_FEED_ID], { encoding: "base64" });

    const sendUsdApp = new Program<SendUSDApp>(
      IDL as SendUSDApp,
      SEND_USD_PROGRAM_ID,
      new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions())
    );

    const transactionBuilder = pythSolanaReceiver.newTransactionBuilder({
      closeUpdateAccounts: true,
    });
    await transactionBuilder.addPostPriceUpdates(priceUpdateData.binary.data);

    await transactionBuilder.addPriceConsumerInstructions(
      async (
        getPriceUpdateAccount: (priceFeedId: string) => PublicKey
      ): Promise<InstructionWithEphemeralSigners[]> => {
        return [
          {
            instruction: await sendUsdApp.methods
              .send(new BN(amount))
              .accounts({
                destination,
                priceUpdate: getPriceUpdateAccount(SOL_PRICE_FEED_ID),
              })
              .instruction(),
            signers: [],
          },
        ];
      }
    );

    await pythSolanaReceiver.provider.sendAll(
      await transactionBuilder.buildVersionedTransactions({
        computeUnitPriceMicroLamports: 50000,
      }),
      { skipPreflight: true }
    );
  }
}

async function postTwapPriceUpdate(
  connection: Connection,
  wallet: AnchorWallet | undefined,
  destination: PublicKey | undefined,
  amount: number | undefined,
  twapWindowSeconds: number
) {
  if (!(wallet && destination && amount)) {
    return;
  } else {
    const hermesClient = new HermesClient(HERMES_URL);
    const pythSolanaReceiver = new PythSolanaReceiver({
      connection,
      wallet: wallet as Wallet,
    });

    const twapUpdateData = await hermesClient.getLatestTwaps([SOL_PRICE_FEED_ID], twapWindowSeconds, { encoding: "base64" });

    const sendUsdApp = new Program<SendUSDApp>(
      IDL as SendUSDApp,
      SEND_USD_PROGRAM_ID,
      new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions())
    );

    const transactionBuilder = pythSolanaReceiver.newTransactionBuilder({
      closeUpdateAccounts: true,
    });
    await transactionBuilder.addPostTwapUpdates(twapUpdateData.binary.data);

    await transactionBuilder.addTwapConsumerInstructions(
      async (
        getTwapUpdateAccount: (priceFeedId: string) => PublicKey
      ): Promise<InstructionWithEphemeralSigners[]> => {
        return [
          {
            instruction: await sendUsdApp.methods
              .sendUsingTwap(new BN(amount), new BN(twapWindowSeconds))
              .accounts({
                destination,
                twapUpdate: getTwapUpdateAccount(SOL_PRICE_FEED_ID),
              })
              .instruction(),
            signers: [],
          },
        ];
      }
    );

    await pythSolanaReceiver.provider.sendAll(
      await transactionBuilder.buildVersionedTransactions({
        computeUnitPriceMicroLamports: 50000,
      }),
      { skipPreflight: true }
    );
  }
}

function Buttons(props: {
  destination: PublicKey | undefined;
  amount: number | undefined;
}) {
  const connectionContext = useConnection();
  const wallet = useAnchorWallet();
  const [twapWindowSeconds, setTwapWindowSeconds] = useState<number>(300);
  return (
    <>
      <div style={{ display: "flex", marginBottom: "20px" }}>
        <button
          onClick={async () => {
            await postPriceUpdate(
              connectionContext.connection,
              wallet,
              props.destination,
              props.amount
            );
          }}
          className="wallet-adapter-button wallet-adapter-button-trigger"
          style={{ flex: "1", marginRight: "20px", height: "48px", fontSize: "16px" }}
        >
          Send using Spot Price
        </button>
        <div style={{ flex: "1", display: "flex", flexDirection: "column" }}>
          <button
            onClick={async () => {
              await postTwapPriceUpdate(
                connectionContext.connection,
                wallet,
                props.destination,
                props.amount,
                twapWindowSeconds
              );
            }}
            className="wallet-adapter-button wallet-adapter-button-trigger"
            style={{ height: "48px", fontSize: "16px", marginBottom: "10px" }}
          >
            Send using TWAP Price
          </button>
          <p style={{ fontSize: "16px", margin: "5px 0" }}>TWAP Window (seconds): {twapWindowSeconds}</p>
          <input
            type="range"
            min="0"
            max="599"
            value={twapWindowSeconds}
            onChange={(e) => setTwapWindowSeconds(parseInt(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </>
  );
}

function App() {
  const [destination, setDestination] = useState<PublicKey>();
  const [amount, setAmount] = useState<number>();

  const handleSetDestination = (event: any) => {
    try {
      setDestination(new PublicKey(event.target.value));
    } catch (e) {
      setDestination(undefined);
    }
  };
  const handleSetAmount = (event: any) => {
    try {
      setAmount(parseInt(event.target.value));
    } catch (e) {
      setAmount(undefined);
    }
  };

  return (
    <ConnectionProvider endpoint={DEVNET_RPC_URL}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>
          <div className="App">
            <header className="App-header">
              <img src={logo} className="App-logo" alt="logo" />
              <WalletMultiButton />
              <WalletDisconnectButton />
              <p>Click to send the amount of USD in SOL</p>
              <div style={{ width: "50%", margin: "0 auto" }}>
                <p style={{ fontSize: "16px" }}>
                  Destination (paste a Solana public key)
                </p>
                <input
                  type="text"
                  value={destination ? destination.toString() : ""}
                  onChange={handleSetDestination}
                  style={{ width: "100%", height: "40px", fontSize: "16px", marginBottom: "20px" }}
                />
                <p style={{ fontSize: "16px" }}>Amount (USD)</p>
                <input
                  type="text"
                  value={amount ? amount.toString() : ""}
                  onChange={handleSetAmount}
                  style={{ width: "100%", height: "40px", fontSize: "16px", marginBottom: "20px" }}
                />

                <Buttons destination={destination} amount={amount} />
              </div>
            </header>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
