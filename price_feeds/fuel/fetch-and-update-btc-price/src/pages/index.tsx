import type { TestContractAbi } from "@/sway-api";
import { TestContractAbi__factory } from "@/sway-api";
import contractIds from "@/sway-api/contract-ids.json";
import { FuelLogo } from "@/components/FuelLogo";
import { bn } from "fuels";
import { useState } from "react";
import { Link } from "@/components/Link";
import { Button } from "@/components/Button";
import toast from "react-hot-toast";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import useAsync from "react-use/lib/useAsync";
import { CURRENT_ENVIRONMENT } from "@/lib";
import { PriceOutput } from "@/sway-api/contracts/TestContractAbi";

const contractId =
  CURRENT_ENVIRONMENT === "local"
    ? contractIds.testContract
    : (process.env.NEXT_PUBLIC_TESTNET_CONTRACT_ID as string); // Testnet Contract ID

const hermesBtcUrl = process.env.NEXT_PUBLIC_HERMES_BTC_URL as string;

const hasContract = process.env.NEXT_PUBLIC_HAS_CONTRACT === "true";
const hasPredicate = process.env.NEXT_PUBLIC_HAS_PREDICATE === "true";
const hasScript = process.env.NEXT_PUBLIC_HAS_SCRIPT === "true";

export default function Home() {
  const { wallet, walletBalance, refreshWalletBalance } = useActiveWallet();
  const [contract, setContract] = useState<TestContractAbi>();
  const [price, setPrice] = useState<PriceOutput>();

  const fetchBtcPriceUpdateData = async () => {
    const response = await fetch(hermesBtcUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch BTC price");
    }
    const data = await response.json();
    const binaryData = data.binary.data[0];
    const buffer = Buffer.from(binaryData, "hex");
    return buffer;
  };

  /**
   * useAsync is a wrapper around useEffect that allows us to run asynchronous code
   * See: https://github.com/streamich/react-use/blob/master/docs/useAsync.md
   */
  useAsync(async () => {
    if (hasContract && wallet) {
      const testContract = TestContractAbi__factory.connect(contractId, wallet);
      setContract(testContract);
      const { value } = await testContract.functions.get_price().get();
      setPrice(value);
    }
  }, [wallet]);

  // eslint-disable-next-line consistent-return
  const onUpdatePricePressed = async () => {
    if (!contract) {
      return toast.error("Contract not loaded");
    }

    if (walletBalance?.eq(0)) {
      return toast.error(
        "Your wallet does not have enough funds. Please click the 'Top-up Wallet' button in the top right corner, or use the local faucet."
      );
    }

    try {
      const updateData = await fetchBtcPriceUpdateData();
      await contract.functions.update_price_feeds(updateData).call();
      const { value } = await contract.functions.get_price().get();
      setPrice(value);

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
            {price?.price}
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
