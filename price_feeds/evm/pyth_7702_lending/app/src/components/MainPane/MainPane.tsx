"use client";

import { type FC, useState, useEffect } from "react";

import { FieldRoot, FieldLabel, FieldInput } from "@ark-ui/react";
import { Box, Separator, Flex, Heading, Tabs, TabsList, TabsTrigger, TabsContent, NumberInput, Button, Text } from "@chakra-ui/react";
import { useTheme } from "next-themes";
import type { ByteArray } from "viem";
import { useAccount } from "wagmi";

import {getContractData, getPrice } from "@/contracts/utils";
import styles from "@/styles/mainPane.module.css";

import {
  Status,
  Address,
  Chain,
  Balance,
  BlockNumber,
} from "./components";

const MainPane: FC = () => {
  const { isConnected } = useAccount();
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  
  const [contractData, setContractData] = useState<{
    lendingPool: string;
    baseToken: string;
    quoteToken: string;
    baseTokenSymbol: string;
    quoteTokenSymbol: string;
    baseTokenDecimals: number;
    quoteTokenDecimals: number;
    baseTokenPoolBalance: bigint;
    quoteTokenPoolBalance: bigint;
    numberOfPositions: number;
    baseTokenPriceId: ByteArray;
    quoteTokenPriceId: ByteArray;
  } | null>(null);

  const [baseTokenPrice, setBaseTokenPrice] = useState<number | bigint | null>(null);
  const [baseTokenLastUpdate, setBaseTokenLastUpdate] = useState<bigint | null>(null);
  const [quoteTokenPrice, setQuoteTokenPrice] = useState<number | bigint | null>(null);
  const [quoteTokenLastUpdate, setQuoteTokenLastUpdate] = useState<bigint | null>(null);

  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const contractData = await getContractData();
        setContractData(contractData);
      } catch (error) {
        console.error("Failed to fetch contract addresses:", error);
      }
    };
    
    fetchAddresses();
  }, []);

  useEffect(() => {
    if (!contractData) return;
    getPrice(contractData.baseTokenPriceId).then(price => {
      let value: number | bigint;
      if (price.expo >= 0) {
        value = price.price * 10n ** BigInt(price.expo);
      } else {
        value = Number(price.price) / 10 ** Math.abs(price.expo);
      }
      setBaseTokenPrice(value);
      setBaseTokenLastUpdate(price.publishTime);
    });
    getPrice(contractData.quoteTokenPriceId).then(price => {
      let value: number | bigint;
      if (price.expo >= 0) {
        value = price.price * 10n ** BigInt(price.expo);
      } else {
        value = Number(price.price) / 10 ** Math.abs(price.expo);
      }
      setQuoteTokenPrice(value);
      setQuoteTokenLastUpdate(price.publishTime);
    });
  }, [contractData]);

  return (
    <Box
      className={styles.container}
      border={isDarkMode ? "1px solid rgba(152, 161, 192, 0.24)" : "none"}
    >
      <Heading as="h2" fontSize="2rem" mb={10} className="text-shadow">
        Display Info
      </Heading>

      <Flex className={styles.content}>
        <Status />

        {isConnected && (
          <>
            <Address />
            <Chain />
            <Balance />
            <BlockNumber />

            <Separator mb={5} />

            <Heading as="h3" fontSize="1.5rem" mb={5} className="text-shadow">
              Lending Protocol
            </Heading>

            <Heading as="h4" fontSize="1.25rem" mb={5} className="text-shadow">
              Number of Positions: {contractData?.numberOfPositions}
            </Heading>

            {contractData && (
              <>
                <Heading as="h4" fontSize="1.25rem" mb={5} className="text-shadow">
                  Base Token: {contractData.baseToken}
                  <br />
                  Base Token Symbol: {contractData.baseTokenSymbol}
                  <br />
                  Base Token Decimals: {contractData.baseTokenDecimals}
                  <br />
                  Base Tokens in Pool: {Number(contractData.baseTokenPoolBalance) / Math.pow(10, contractData.baseTokenDecimals)}
                  <br />
                  Base Token Price ID: <span style={{ backgroundColor: '#ffeb3b', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>{contractData.baseTokenPriceId}</span>
                  <br />
                  Current Base Token Price: {baseTokenPrice?.toString() ?? "-"}
                  <br />
                  Last Update: {timeAgo(baseTokenLastUpdate)}
                </Heading>

                <Heading as="h4" fontSize="1.25rem" mb={5} className="text-shadow">
                  Quote Token: {contractData.quoteToken}
                  <br />
                  Quote Token Symbol: {contractData.quoteTokenSymbol}
                  <br />
                  Quote Token Decimals: {contractData.quoteTokenDecimals}
                  <br />
                  Quote Tokens in Pool: {Number(contractData.quoteTokenPoolBalance) / Math.pow(10, contractData.quoteTokenDecimals)}
                  <br />
                  Quote Token Price ID: <span style={{ backgroundColor: '#ffeb3b', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>{contractData.quoteTokenPriceId}</span>
                  <br />
                  Current Quote Token Price: {quoteTokenPrice?.toString() ?? "-"}
                  <br />
                  Last Update: {timeAgo(quoteTokenLastUpdate)}
                </Heading>

                {/* Tabs for Borrow and Repay */}
                <Tabs.Root>
                  <TabsList gap={5}>
                    <TabsTrigger value="borrow">Borrow</TabsTrigger>
                    <TabsTrigger value="repay">Repay</TabsTrigger>
                  </TabsList>
                  <TabsContent value="borrow">
                    <BorrowForm contractData={contractData} />
                  </TabsContent>
                  <TabsContent value="repay">
                    <RepayForm contractData={contractData} />
                  </TabsContent>
                </Tabs.Root>
              </>
            )}
            
          </>
        )}
      </Flex>
    </Box>
  );
};

// BorrowForm component
function BorrowForm({ contractData }: { contractData: any }) {
  const [amount, setAmount] = useState("");
  const [collateral, setCollateral] = useState<string | null>(null);

  // Dummy price and LTV for now; replace with real price feed and config
  const basePrice = 1; // e.g., 1 ETH = 2000 USD
  const quotePrice = 1; // e.g., 1 DAI = 1 USD
  const loanToValueBps = 5000; // 50% LTV

  // Calculate collateral required
  function calculateCollateral(amount: string) {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return "-";
    // Use the formula from your contract
    const required = (amt * basePrice * 10000) / (quotePrice * loanToValueBps) + 1;
    return required.toFixed(4);
  }

  // Update collateral as user types
  function handleAmountChange(value: string) {
    setAmount(value);
    setCollateral(calculateCollateral(value));
  }

  return (
    <FieldRoot>
      <FieldLabel>Amount to Borrow ({contractData.baseTokenSymbol})</FieldLabel>
      <NumberInput.Root value={amount} onValueChange={(e) => handleAmountChange(e.value)} min={0}>
        <NumberInput.Input />
      </NumberInput.Root>
      <Text mb={2}>Collateral Required ({contractData.quoteTokenSymbol}): <b>{collateral ?? "-"}</b></Text>
      <Button colorScheme="blue" disabled={!amount || Number(amount) <= 0}>
        Borrow
      </Button>
    </FieldRoot>
  );
}

// RepayForm component
function RepayForm({ contractData }: { contractData: any }) {
  const [positionId, setPositionId] = useState("");
  return (
    <FieldRoot>
      <FieldLabel>Position ID to Repay</FieldLabel>
      <Box mb={2}>
        <FieldInput value={positionId} onChange={e => setPositionId(e.target.value)} placeholder="Enter Position ID" />
      </Box>
      <Button colorScheme="green" disabled={!positionId}>
        Repay
      </Button>
    </FieldRoot>
  );
}

function timeAgo(unixSeconds: bigint | number | null): string {
  if (!unixSeconds) return "-";
  const now = Date.now() / 1000;
  const diff = Math.floor(now - Number(unixSeconds));
  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

export default MainPane;
