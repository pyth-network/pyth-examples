"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  RefreshCw,
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Coins,
  Clock,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useBalance,
  useChainId,
  useSwitchChain,
  useWalletClient,
} from "wagmi";
import { virtualBase } from "@/lib/wagmi";
import { useTokens } from "@/contexts/TokenContext";
import { PriceDisplay } from "@/components/PriceDisplay";
import { Copy } from "lucide-react";
import { addTenderlyBalance, addTenderlyErc20Balance } from "@/contracts/fund";
import { approveToken, borrow, repay, getPosition, getTotalPositions } from "@/contracts/lendinpool";
import { WalletClient, parseEther } from "viem";
import { getBaseTokenData, getQuoteTokenData } from "@/contracts/tokens";

export default function LendingProtocol() {
  const { theme, setTheme } = useTheme();
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const {
    baseToken,
    quoteToken,
    isLoading: tokensLoading,
    error: tokensError,
    refetch,
  } = useTokens();
  const [isUpdatingPoolInfo, setIsUpdatingPoolInfo] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [borrowAmount, setBorrowAmount] = useState("");
  const [repayPositionId, setRepayPositionId] = useState("");
  const [borrowSuccess, setBorrowSuccess] = useState(false);
  const [newPositionId, setNewPositionId] = useState<number | null>(null);
  const [isProcessingBorrow, setIsProcessingBorrow] = useState(false);
  const [tenderlySuccess, setTenderlySuccess] = useState(false);
  const [pwethSuccess, setPwethSuccess] = useState(false);
  const [pusdtSuccess, setPusdtSuccess] = useState(false);
  const [approvePwethAmount, setApprovePwethAmount] = useState("");
  const [approvePusdtAmount, setApprovePusdtAmount] = useState("");
  const [isApprovingPweth, setIsApprovingPweth] = useState(false);
  const [isApprovingPusdt, setIsApprovingPusdt] = useState(false);
  const [pwethApprovalSuccess, setPwethApprovalSuccess] = useState(false);
  const [pusdtApprovalSuccess, setPusdtApprovalSuccess] = useState(false);
  const [isProcessingRepay, setIsProcessingRepay] = useState(false);
  const [repaySuccess, setRepaySuccess] = useState(false);
  const { data: walletClient } = useWalletClient();
  const [totalPositions, setTotalPositions] = useState<number>(0);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (walletClient) {
      getTotalPositions(walletClient as WalletClient).then(setTotalPositions);
    }
  }, [walletClient]);

  const handleUpdatePoolInfo = async () => {
    setIsUpdatingPoolInfo(true);
    if (walletClient) {
      const totalPositions = await getTotalPositions(walletClient as WalletClient);
      setTotalPositions(totalPositions);
      await refetch(); // <-- This updates the token context
      setIsUpdatingPoolInfo(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Pyth 7702 Lending
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {isConnected && balance && (
                <div className="flex items-center space-x-2 text-sm">
                  <Coins className="w-4 h-4 text-green-500" />
                  <span className="font-medium">
                    {Number(balance.formatted).toFixed(4)} {balance.symbol}
                  </span>
                </div>
              )}

              <ConnectButton />

              {isConnected && address && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(address)}
                  title="Copy address"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              )}

              {isConnected && chainId !== virtualBase.id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => switchChain({ chainId: virtualBase.id })}
                  className="text-xs"
                >
                  Add Base Network
                </Button>
              )}

              {mounted && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? (
                    <Sun className="w-4 h-4" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Dashboard Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Protocol Dashboard</span>
                </CardTitle>
                <CardDescription>
                  Real-time protocol information and price feeds
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Account Info */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Account Info
                  </h3>
                  {isConnected ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <Badge variant="secondary" className="text-green-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                          Connected
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Address:</span>
                        <span className="font-mono">
                          {formatAddress(address!)}
                        </span>
                      </div>
                      {balance && (
                        <div className="flex justify-between items-center">
                          <span>Balance:</span>
                          <span className="font-mono">
                            {Number(balance.formatted).toFixed(4)}{" "}
                            {balance.symbol}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground mb-2">
                        Connect your wallet to start
                      </p>
                      <ConnectButton />
                    </div>
                  )}
                </div>

                <Separator />

                {/* Protocol Stats */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Protocol Stats
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Active Positions:</span>
                      <span className="font-semibold">
                        {totalPositions}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Token Information */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Token Information
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleUpdatePoolInfo}
                      disabled={isUpdatingPoolInfo}
                    >
                      <RefreshCw
                        className={`w-4 h-4 mr-2 ${
                          isUpdatingPoolInfo ? "animate-spin" : ""
                        }`}
                      />
                      Update
                    </Button>
                  </div>

                  {tokensLoading ? (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="animate-pulse space-y-2">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
                      </div>
                    </div>
                  ) : tokensError ? (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="text-sm text-red-600 dark:text-red-400">
                        Error loading tokens: {tokensError}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Base Token */}
                      {baseToken && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">
                              {baseToken.symbol}
                            </span>
                            <Badge variant="outline">Base</Badge>
                          </div>
                          <div className="text-xs font-mono text-muted-foreground break-all">
                            {baseToken.address}
                          </div>
                          <div className="flex justify-between text-xs">
                            <span>Decimals: {baseToken.decimals}</span>
                            <span>
                              Pool:{" "}
                              {Number(baseToken.poolBalance) /
                                Math.pow(10, baseToken.decimals)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Quote Token */}
                      {quoteToken && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">
                              {quoteToken.symbol}
                            </span>
                            <Badge variant="outline">Quote</Badge>
                          </div>
                          <div className="text-xs font-mono text-muted-foreground break-all">
                            {quoteToken.address}
                          </div>
                          <div className="flex justify-between text-xs">
                            <span>Decimals: {quoteToken.decimals}</span>
                            <span>
                              Pool:{" "}
                              {Number(quoteToken.poolBalance) /
                                Math.pow(10, quoteToken.decimals)}
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Price Display */}
            <PriceDisplay />

            <Tabs defaultValue="lending" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger
                  value="lending"
                  className="flex items-center space-x-2"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Lending Protocol</span>
                </TabsTrigger>
                <TabsTrigger
                  value="faucet"
                  className="flex items-center space-x-2"
                >
                  <Coins className="w-4 h-4" />
                  <span>Token Faucet</span>
                </TabsTrigger>
              </TabsList>

              {/* Lending Tab */}
              <TabsContent value="lending" className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  {/* Token Approvals Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <RefreshCw className="w-5 h-5 text-blue-500" />
                        <span>Token Approvals</span>
                      </CardTitle>
                      <CardDescription>
                        Approve tokens for lending operations
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="approve-pweth-amount">
                            Approve {baseToken?.symbol} Amount
                          </Label>
                          <Input
                            id="approve-pweth-amount"
                            placeholder="0.0"
                            value={approvePwethAmount}
                            onChange={(e) =>
                              setApprovePwethAmount(e.target.value)
                            }
                          />
                          <Button
                            className="w-full"
                            variant="outline"
                            disabled={
                              !approvePwethAmount ||
                              Number(approvePwethAmount) <= 0 ||
                              isApprovingPweth
                            }
                            onClick={async () => {
                              if (walletClient && baseToken) {
                                try {
                                  setIsApprovingPweth(true);
                                  const amountInWei =
                                    parseEther(approvePwethAmount);
                                  await approveToken(
                                    baseToken.address,
                                    amountInWei,
                                    walletClient as WalletClient
                                  );
                                  setPwethApprovalSuccess(true);
                                  setTimeout(
                                    () => setPwethApprovalSuccess(false),
                                    3000
                                  );
                                } catch (error) {
                                  console.error(
                                    "Failed to approve PWETH:",
                                    error
                                  );
                                } finally {
                                  setIsApprovingPweth(false);
                                }
                              }
                            }}
                          >
                            {isApprovingPweth ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Approving...
                              </>
                            ) : pwethApprovalSuccess ? (
                              <>
                                <svg
                                  className="w-4 h-4 mr-2 text-green-500"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                                Approved!
                              </>
                            ) : (
                              `Approve ${baseToken?.symbol}`
                            )}
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="approve-pusdt-amount">
                            Approve {quoteToken?.symbol} Amount
                          </Label>
                          <Input
                            id="approve-pusdt-amount"
                            placeholder="0.0"
                            value={approvePusdtAmount}
                            onChange={(e) =>
                              setApprovePusdtAmount(e.target.value)
                            }
                          />
                          <Button
                            className="w-full"
                            variant="outline"
                            disabled={
                              !approvePusdtAmount ||
                              Number(approvePusdtAmount) <= 0 ||
                              isApprovingPusdt
                            }
                            onClick={async () => {
                              if (walletClient && quoteToken) {
                                try {
                                  setIsApprovingPusdt(true);
                                  const amountInWei =
                                    parseEther(approvePusdtAmount);
                                  await approveToken(
                                    quoteToken.address,
                                    amountInWei,
                                    walletClient as WalletClient
                                  );
                                  setPusdtApprovalSuccess(true);
                                  setTimeout(
                                    () => setPusdtApprovalSuccess(false),
                                    3000
                                  );
                                } catch (error) {
                                  console.error(
                                    "Failed to approve PUSDT:",
                                    error
                                  );
                                } finally {
                                  setIsApprovingPusdt(false);
                                }
                              }
                            }}
                          >
                            {isApprovingPusdt ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Approving...
                              </>
                            ) : pusdtApprovalSuccess ? (
                              <>
                                <svg
                                  className="w-4 h-4 mr-2 text-green-500"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                                Approved!
                              </>
                            ) : (
                              `Approve ${quoteToken?.symbol}`
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Borrow Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <TrendingDown className="w-5 h-5 text-orange-500" />
                        <span>Borrow {baseToken?.symbol}</span>
                      </CardTitle>
                      <CardDescription>
                        Borrow {baseToken?.symbol} by providing{" "}
                        {quoteToken?.symbol} as collateral
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="borrow-amount">
                            Amount to Borrow ({baseToken?.symbol})
                          </Label>
                          <Input
                            id="borrow-amount"
                            placeholder="0.0"
                            value={borrowAmount}
                            onChange={(e) => setBorrowAmount(e.target.value)}
                          />
                        </div>
                      </div>

                      {borrowAmount && Number(borrowAmount) > 0 && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-2">
                          <h4 className="font-semibold text-blue-700 dark:text-blue-300">
                            Transaction Summary
                          </h4>
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span>Borrowing:</span>
                              <span className="font-mono">
                                {borrowAmount} {baseToken?.symbol}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {borrowSuccess && newPositionId !== null && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-800">
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                            <h4 className="font-semibold text-green-700 dark:text-green-300">
                              Borrow Successful!
                            </h4>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-green-600 dark:text-green-400">
                                Your Position ID:
                              </span>
                              <div className="flex items-center space-x-2">
                                <Badge
                                  variant="outline"
                                  className="text-lg font-mono px-3 py-1 bg-green-100 dark:bg-green-900/50"
                                >
                                  #{newPositionId}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    copyToClipboard(newPositionId.toString())
                                  }
                                  className="h-8 w-8 p-0"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 002 2v8a2 2 0 002 2z"
                                    />
                                  </svg>
                                </Button>
                              </div>
                            </div>
                            <div className="text-xs text-green-600 dark:text-green-400">
                              Save this Position ID - you&apos;ll need it to repay
                              your loan
                            </div>
                            <div className="flex space-x-2 mt-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setRepayPositionId(newPositionId.toString())
                                }
                                className="flex-1"
                              >
                                Go to Repay
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setBorrowSuccess(false)}
                                className="flex-1"
                              >
                                Close
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      <Button
                        className="w-full"
                        disabled={
                          !borrowAmount ||
                          Number(borrowAmount) <= 0 ||
                          isProcessingBorrow ||
                          !walletClient ||
                          !isConnected
                        }
                        onClick={async () => {
                          if (!walletClient || !isConnected) {
                            console.error("Wallet not connected");
                            return;
                          }

                          try {
                            setIsProcessingBorrow(true);
                            const amountInWei = parseEther(borrowAmount);
                            
                            const result = await borrow(
                              amountInWei,
                              walletClient as WalletClient
                            );
                            
                            if (result.status) {
                              setNewPositionId(result.positionId);
                              setBorrowSuccess(true);
                            } else {
                              console.error("Borrow failed");
                            }
                          } catch (error) {
                            console.error("Failed to borrow:", error);
                            // You might want to show an error toast here
                          } finally {
                            setIsProcessingBorrow(false);
                          }
                        }}
                      >
                        {isProcessingBorrow ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Borrow"
                        )}
                      </Button>
                      <Button
                        className="w-full"
                        variant="outline"
                        disabled={isProcessingBorrow}
                        onClick={() => {
                          // Smart Borrow functionality to be implemented
                        }}
                      >
                        Smart Borrow
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Repay Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <RefreshCw className="w-5 h-5 text-blue-500" />
                        <span>Repay Loan</span>
                      </CardTitle>
                      <CardDescription>
                        Repay your borrowed tokens using Position ID
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="position-id">Position ID</Label>
                          <Input
                            id="position-id"
                            placeholder="0"
                            value={repayPositionId}
                            onChange={(e) => setRepayPositionId(e.target.value)}
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            className="w-full"
                            disabled={
                              !repayPositionId ||
                              isProcessingRepay ||
                              !walletClient ||
                              !isConnected
                            }
                            onClick={async () => {
                              if (!walletClient || !isConnected) {
                                console.error("Wallet not connected");
                                return;
                              }

                              try {
                                setIsProcessingRepay(true);
                                const positionId = parseInt(repayPositionId);
                                
                                if (isNaN(positionId)) {
                                  throw new Error("Invalid position ID");
                                }

                                const result = await repay(
                                  positionId,
                                  walletClient as WalletClient
                                );
                                
                                if (result.status) {
                                  setRepaySuccess(true);
                                  setTimeout(() => setRepaySuccess(false), 3000);
                                  setRepayPositionId(""); // Clear the input
                                } else {
                                  console.error("Repay failed");
                                }
                              } catch (error) {
                                console.error("Failed to repay:", error);
                              } finally {
                                setIsProcessingRepay(false);
                              }
                            }}
                          >
                            {isProcessingRepay ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : repaySuccess ? (
                              <>
                                <svg
                                  className="w-4 h-4 mr-2 text-green-500"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                                Repaid!
                              </>
                            ) : (
                              "Repay Position"
                            )}
                          </Button>
                        </div>
                      </div>

                      {repayPositionId && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">
                            Position Details
                          </h4>
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span>Position ID:</span>
                              <span className="font-mono">
                                #{repayPositionId}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Status:</span>
                              <Badge variant="secondary">Active</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-2">
                              Repaying will return your collateral and close the
                              position
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Active Positions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Wallet className="w-5 h-5 text-purple-500" />
                        <span>Your Positions</span>
                      </CardTitle>
                      <CardDescription>
                        Manage your active borrowing positions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {totalPositions === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No active positions</p>
                          <p className="text-sm">
                            Borrow tokens to create your first position
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Example position - replace with actual data */}
                          <div className="p-4 border rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">Position #0</Badge>
                                <Badge
                                  variant="secondary"
                                  className="text-green-600"
                                >
                                  Active
                                </Badge>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setRepayPositionId("0")}
                              >
                                Repay
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">
                                  Borrowed:
                                </span>
                                <div className="font-mono">
                                  1.5 {baseToken?.symbol}
                                </div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Collateral:
                                </span>
                                <div className="font-mono">
                                  4500 {quoteToken?.symbol}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Faucet Tab */}
              <TabsContent value="faucet" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Native Token Faucet */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Coins className="w-5 h-5 text-purple-500" />
                        <span>Native Token Faucet</span>
                      </CardTitle>
                      <CardDescription>
                        Get test ETH for gas fees
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="text-sm text-muted-foreground mb-2">
                          Available to claim:
                        </div>
                        <div className="text-2xl font-bold text-purple-600">
                          1.0 ETH
                        </div>
                      </div>
                      <Button
                        className="w-full"
                        onClick={async () => {
                          if (walletClient) {
                            const result = await addTenderlyBalance(
                              walletClient as WalletClient
                            );
                            if (result.success) {
                              setTenderlySuccess(true);
                              setTimeout(() => setTenderlySuccess(false), 3000); // Hide after 3 seconds
                            }
                          }
                        }}
                      >
                        {tenderlySuccess ? (
                          <>
                            <svg
                              className="w-4 h-4 mr-2 text-green-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Success!
                          </>
                        ) : (
                          "Claim ETH"
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* ERC20 Token Faucet */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Wallet className="w-5 h-5 text-green-500" />
                        <span>ERC20 Token Faucet</span>
                      </CardTitle>
                      <CardDescription>
                        Get test tokens for lending
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">PWETH</span>
                            <span className="text-sm text-muted-foreground">
                              1000 available
                            </span>
                          </div>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">PUSDT</span>
                            <span className="text-sm text-muted-foreground">
                              1000 available
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Button
                          className="w-full bg-transparent"
                          variant="outline"
                          onClick={async () => {
                            if (walletClient && baseToken) {
                              const result = await addTenderlyErc20Balance(
                                walletClient as WalletClient,
                                baseToken.address
                              );
                              if (result.success) {
                                setPwethSuccess(true);
                                setTimeout(() => setPwethSuccess(false), 3000);
                              }
                            }
                          }}
                        >
                          {pwethSuccess ? (
                            <>
                              <svg
                                className="w-4 h-4 mr-2 text-green-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              Success!
                            </>
                          ) : (
                            "Claim PWETH"
                          )}
                        </Button>
                        <Button
                          className="w-full bg-transparent"
                          variant="outline"
                          onClick={async () => {
                            if (walletClient && quoteToken) {
                              const result = await addTenderlyErc20Balance(
                                walletClient as WalletClient,
                                quoteToken.address
                              );
                              if (result.success) {
                                setPusdtSuccess(true);
                                setTimeout(() => setPusdtSuccess(false), 3000);
                              }
                            }
                          }}
                        >
                          {pusdtSuccess ? (
                            <>
                              <svg
                                className="w-4 h-4 mr-2 text-green-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              Success!
                            </>
                          ) : (
                            "Claim PUSDT"
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Faucet Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Faucet Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold">Rate Limit:</span>
                        <p className="text-muted-foreground">
                          Once per 24 hours per address
                        </p>
                      </div>
                      <div>
                        <span className="font-semibold">Network:</span>
                        <p className="text-muted-foreground">
                          Base Testnet (Chain ID: 8453)
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
