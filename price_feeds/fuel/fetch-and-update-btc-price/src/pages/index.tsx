import { TestContractAbi__factory } from "@/sway-api";
import PYTH_CONTRACT_ABI from "../abi/pyth-contract-abi.json";
import contractIds from "@/sway-api/contract-ids.json";
import { FuelLogo } from "@/components/FuelLogo";
import { arrayify, Contract, hexlify } from "fuels";
import { useState } from "react";
import { Link } from "@/components/Link";
import { Button } from "@/components/Button";
import toast from "react-hot-toast";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import useAsync from "react-use/lib/useAsync";
import { CURRENT_ENVIRONMENT } from "@/lib";
import { PriceOutput } from "@/sway-api/contracts/TestContractAbi";
import { HermesClient } from "@pythnetwork/hermes-client";

const FUEL_ETH_BASE_ASSET_ID =
  "0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07";
const PRICE_FEED_ID =
  "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"; // ETH/USD

const contractId =
  CURRENT_ENVIRONMENT === "local"
    ? contractIds.testContract
    : (process.env.NEXT_PUBLIC_TESTNET_CONTRACT_ID as string); // Testnet Contract ID
const pythContractId = process.env
  .NEXT_PUBLIC_PYTH_TESTNET_CONTRACT_ID as string; // Testnet Contract ID

const hermesUrl = process.env.NEXT_PUBLIC_HERMES_URL as string;

const hasContract = process.env.NEXT_PUBLIC_HAS_CONTRACT === "true";
const hasPredicate = process.env.NEXT_PUBLIC_HAS_PREDICATE === "true";
const hasScript = process.env.NEXT_PUBLIC_HAS_SCRIPT === "true";

export default function Home() {
  const { wallet, walletBalance, refreshWalletBalance } = useActiveWallet();
  const [contract, setContract] = useState<Contract>();
  const [pythContract, setPythContract] = useState<Contract>();
  const [price, setPrice] = useState<PriceOutput>();

  const fetchPriceUpdateData = async () => {
    const connection = new HermesClient(hermesUrl);

    // Latest price updates
    const priceUpdates = await connection.getLatestPriceUpdates([
      PRICE_FEED_ID,
    ]);

    const buffer = Buffer.from(priceUpdates.binary.data[0], "hex");
    return buffer;
  };

  /**
   * useAsync is a wrapper around useEffect that allows us to run asynchronous code
   * See: https://github.com/streamich/react-use/blob/master/docs/useAsync.md
   */
  useAsync(async () => {
    if (hasContract && wallet) {
      const testContractAbiInterface = TestContractAbi__factory.connect(
        contractId,
        wallet
      ).interface;
      const testContract = new Contract(
        contractId,
        testContractAbiInterface,
        wallet
      );
      setContract(testContract);
      const pythContract = new Contract(
        pythContractId,
        PYTH_CONTRACT_ABI,
        wallet
      );
      setPythContract(pythContract);
    }
  }, [wallet]);

  // eslint-disable-next-line consistent-return
  const onUpdatePricePressed = async () => {
    if (!contract || !pythContract) {
      return toast.error("Contract not loaded");
    }

    if (walletBalance?.eq(0)) {
      return toast.error(
        "Your wallet does not have enough funds. Please click the 'Top-up Wallet' button in the top right corner, or use the local faucet."
      );
    }

    try {
      const updateData = await fetchPriceUpdateData();

      const { waitForResult: waitForResultFee } = await contract.functions
        .update_fee([arrayify(updateData)])
        .addContracts([pythContract])
        .call();
      const { value: fee } = await waitForResultFee();

      await contract.functions
        .update_price_feeds(fee, [arrayify(updateData)])
        .addContracts([pythContract])
        .callParams({
          forward: [fee, hexlify(FUEL_ETH_BASE_ASSET_ID)],
        })
        .call();

      const { value: price } = await contract.functions
        .get_price(hexlify(PRICE_FEED_ID))
        .addContracts([pythContract])
        .get();

      setPrice(price);

      await refreshWalletBalance?.();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Error updating price: ${error.message}`);
      } else {
        toast.error("An unexpected error occurred");
      }
    }
  };

  return (
    <>
      <div className="flex gap-4 items-center">
        <FuelLogo />
        <h1 className="text-2xl font-semibold ali">Welcome to Fuel</h1>
      </div>

      {hasContract && (
        <span className="text-gray-400">
          Get started by editing <i>sway-programs/contract/main.sw</i> or{" "}
          <i>src/pages/index.tsx</i>.
        </span>
      )}

      <span className="text-gray-400">
        This template uses the new{" "}
        <Link href="https://docs.fuel.network/docs/fuels-ts/fuels/#fuels-cli">
          Fuels CLI
        </Link>{" "}
        to enable type-safe hot-reloading for your Sway programs.
      </span>

      {hasContract && (
        <>
          <h3 className="text-xl font-semibold">Price</h3>
          <span data-testid="price" className="text-gray-400 text-6xl">
            {price?.price?.toString()}
          </span>

          <Button onClick={onUpdatePricePressed} className="mt-6">
            Update Price
          </Button>
        </>
      )}

      {hasPredicate && (
        <Link href="/predicate" className="mt-4">
          Predicate Example
        </Link>
      )}

      {hasScript && (
        <Link href="/script" className="mt-4">
          Script Example
        </Link>
      )}

      <Link href="https://docs.fuel.network" target="_blank" className="mt-12">
        Fuel Docs
      </Link>
    </>
  );
}
