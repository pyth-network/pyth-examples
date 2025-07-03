"use client";

import { type FC, useState, useEffect } from "react";

import { Box, Separator, Flex, Heading } from "@chakra-ui/react";
import { useTheme } from "next-themes";
import { useAccount } from "wagmi";
import {getContractData } from "@/contracts/addresses";

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
  } | null>(null);


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

            {contractData && (
              <>
                <Heading as="h4" fontSize="1.25rem" mb={5} className="text-shadow">
                  Base Token: {contractData.baseToken}
                  <br />
                  Base Token Symbol: {contractData.baseTokenSymbol}
                  <br />
                  Base Token Decimals: {contractData.baseTokenDecimals}
                  <br />
                  Base Tokens in Pool: {contractData.baseTokenPoolBalance}
                </Heading>

                <Heading as="h4" fontSize="1.25rem" mb={5} className="text-shadow">
                  Quote Token: {contractData.quoteToken}
                  <br />
                  Quote Token Symbol: {contractData.quoteTokenSymbol}
                  <br />
                  Quote Token Decimals: {contractData.quoteTokenDecimals}
                  <br />
                  Quote Tokens in Pool: {contractData.quoteTokenPoolBalance}
                </Heading>
              </>
            )}
            
          </>
        )}
      </Flex>
    </Box>
  );
};

export default MainPane;
