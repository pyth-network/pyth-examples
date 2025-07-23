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
import { borrow, repay, getTotalPositions, getUserPositions, type Position } from "@/contracts/lendinpool";
import { approveToken, getTokenAllowance } from "@/contracts/tokens";
import { WalletClient, parseEther } from "viem";
import {smartBorrow } from "@/contracts/smart";
import { addTenderlyNetworkToMetaMask } from "@/lib/add-network";

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
  const [isProcessingSmartBorrow, setIsProcessingSmartBorrow] = useState(false);
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
  const [userPositions, setUserPositions] = useState<Position[]>([]);
  const [isLoadingUserPositions, setIsLoadingUserPositions] = useState(false);
  const [isAddingNetwork, setIsAddingNetwork] = useState(false);
  const [networkAddSuccess, setNetworkAddSuccess] = useState(false);
  const [pwethAllowance, setPwethAllowance] = useState<bigint>(BigInt(0));
  const [pusdtAllowance, setPusdtAllowance] = useState<bigint>(BigInt(0));
  const [isLoadingAllowances, setIsLoadingAllowances] = useState(false);
  
  // Token balances
  const { data: pwethBalance, isLoading: pwethBalanceLoading } = useBalance({
    address,
    token: baseToken?.address as `0x${string}`,
  });
  
  const { data: pusdtBalance, isLoading: pusdtBalanceLoading } = useBalance({
    address,
    token: quoteToken?.address as `0x${string}`,
  });

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (walletClient) {
      getTotalPositions(walletClient as WalletClient).then(setTotalPositions);
    }
  }, [walletClient]);

  // Function to fetch token allowances
  const fetchAllowances = async () => {
    if (!walletClient || !baseToken || !quoteToken) return;
    
    try {
      setIsLoadingAllowances(true);
      const [pwethAllowanceResult, pusdtAllowanceResult] = await Promise.all([
        getTokenAllowance(baseToken.address, walletClient as WalletClient),
        getTokenAllowance(quoteToken.address, walletClient as WalletClient)
      ]);
      setPwethAllowance(pwethAllowanceResult);
      setPusdtAllowance(pusdtAllowanceResult);
    } catch (error) {
      console.error("Failed to fetch allowances:", error);
    } finally {
      setIsLoadingAllowances(false);
    }
  };

  // Function to fetch user positions
  const fetchUserPositions = async () => {
    if (!walletClient || !isConnected) return;
    
    try {
      setIsLoadingUserPositions(true);
      const positions = await getUserPositions(walletClient as WalletClient);
      setUserPositions(positions);
    } catch (error) {
      console.error("Failed to fetch user positions:", error);
    } finally {
      setIsLoadingUserPositions(false);
    }
  };

  // Fetch allowances when wallet is connected and tokens are loaded
  useEffect(() => {
    if (walletClient && baseToken && quoteToken) {
      fetchAllowances();
    }
  }, [walletClient, baseToken, quoteToken]);

  // Fetch user positions when wallet is connected
  useEffect(() => {
    if (walletClient && isConnected) {
      fetchUserPositions();
    }
  }, [walletClient, isConnected]);

  const handleUpdatePoolInfo = async () => {
    setIsUpdatingPoolInfo(true);
    if (walletClient) {
      const totalPositions = await getTotalPositions(walletClient as WalletClient);
      setTotalPositions(totalPositions);
      await refetch(); // <-- This updates the token context
      // Refresh allowances and user positions
      await fetchAllowances();
      await fetchUserPositions();
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
                    {Number(balance.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })} {balance.symbol}
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

              <Button
                variant="outline"
                size="sm"
                disabled={isAddingNetwork}
                onClick={async () => {
                  try {
                    setIsAddingNetwork(true);
                    const result = await addTenderlyNetworkToMetaMask();
                    if (result.success) {
                      setNetworkAddSuccess(true);
                      setTimeout(() => setNetworkAddSuccess(false), 3000);
                    } else {
                      console.error("Failed to add network:", result.message);
                    }
                  } catch (error) {
                    console.error("Error adding network:", error);
                  } finally {
                    setIsAddingNetwork(false);
                  }
                }}
                className="text-xs"
              >
                {isAddingNetwork ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : networkAddSuccess ? (
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
                    Added!
                  </>
                ) : (
                  "Add vNet to MetaMask"
                )}
              </Button>

              {isConnected && chainId !== virtualBase.id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => switchChain({ chainId: virtualBase.id })}
                  className="text-xs"
                >
                  Switch to Base
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
                          <span>ETH Balance:</span>
                          <span className="font-mono">
                            {Number(balance.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })}{" "}
                            {balance.symbol}
                          </span>
                        </div>
                      )}
                      
                      {pwethBalanceLoading ? (
                        <div className="flex justify-between items-center">
                          <span>{baseToken?.symbol} Balance:</span>
                          <span className="text-muted-foreground text-sm">Loading...</span>
                        </div>
                      ) : pwethBalance ? (
                        <div className="flex justify-between items-center">
                          <span>{baseToken?.symbol} Balance:</span>
                          <span className="font-mono">
                            {Number(pwethBalance.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })}{" "}
                            {pwethBalance.symbol}
                          </span>
                        </div>
                      ) : null}
                      
                      {pusdtBalanceLoading ? (
                        <div className="flex justify-between items-center">
                          <span>{quoteToken?.symbol} Balance:</span>
                          <span className="text-muted-foreground text-sm">Loading...</span>
                        </div>
                      ) : pusdtBalance ? (
                        <div className="flex justify-between items-center">
                          <span>{quoteToken?.symbol} Balance:</span>
                          <span className="font-mono">
                            {Number(pusdtBalance.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })}{" "}
                            {pusdtBalance.symbol}
                          </span>
                        </div>
                      ) : null}
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
                              {(Number(baseToken.poolBalance) /
                                Math.pow(10, baseToken.decimals)).toLocaleString()}
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
                              {(Number(quoteToken.poolBalance) /
                                Math.pow(10, quoteToken.decimals)).toLocaleString()}
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
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center space-x-2">
                            <RefreshCw className="w-5 h-5 text-blue-500" />
                            <span>Token Approvals</span>
                          </CardTitle>
                          <CardDescription>
                            Approve tokens for lending operations
                          </CardDescription>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={fetchAllowances}
                          disabled={isLoadingAllowances || !walletClient}
                        >
                          <RefreshCw
                            className={`w-4 h-4 mr-2 ${
                              isLoadingAllowances ? "animate-spin" : ""
                            }`}
                          />
                          Refresh Allowances
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="approve-pweth-amount">
                              Approve {baseToken?.symbol} Amount
                            </Label>
                            <div className="text-xs text-muted-foreground">
                              {isLoadingAllowances ? (
                                <span className="flex items-center">
                                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                  Loading...
                                </span>
                              ) : (
                                <span>
                                  Current Allowance: {(Number(pwethAllowance) / Math.pow(10, baseToken?.decimals || 18)).toLocaleString()} {baseToken?.symbol}
                                </span>
                              )}
                            </div>
                          </div>
                          <Input
                            id="approve-pweth-amount"
                            placeholder="1000"
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
                                  // Refresh allowances after successful approval
                                  await fetchAllowances();
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
                          <div className="flex items-center justify-between">
                            <Label htmlFor="approve-pusdt-amount">
                              Approve {quoteToken?.symbol} Amount
                            </Label>
                            <div className="text-xs text-muted-foreground">
                              {isLoadingAllowances ? (
                                <span className="flex items-center">
                                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                  Loading...
                                </span>
                              ) : (
                                <span>
                                  Current Allowance: {(Number(pusdtAllowance) / Math.pow(10, quoteToken?.decimals || 18)).toLocaleString()} {quoteToken?.symbol}
                                </span>
                              )}
                            </div>
                          </div>
                          <Input
                            id="approve-pusdt-amount"
                            placeholder="1000000"
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
                                  // Refresh allowances after successful approval
                                  await fetchAllowances();
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
                            placeholder="1.5"
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
                                {Number(borrowAmount).toLocaleString()} {baseToken?.symbol}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Amount in Wei:</span>
                              <span className="font-mono">
                                {parseEther(borrowAmount).toString()}
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
                              // Convert human-readable amount to wei using token decimals
                              const amountInWei = parseEther(borrowAmount);
                              
                              const result = await borrow(
                                amountInWei,
                                walletClient as WalletClient
                              );
                              
                                                          if (result.status) {
                              setNewPositionId(result.positionId);
                              setBorrowSuccess(true);
                              // Refresh user positions after successful borrow
                              await fetchUserPositions();
                            } else {
                              console.error("Borrow failed");
                            }
                            } catch (error) {
                              console.error("Failed to borrow:", error);
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
                        disabled={isProcessingBorrow || isProcessingSmartBorrow}
                        onClick={async () => {
                          if (!walletClient || !isConnected) {
                            console.error("Wallet not connected");
                            return;
                          }
                          try {
                            setIsProcessingSmartBorrow(true);
                            // Convert human-readable amount to wei using token decimals
                            const amountInWei = parseEther(borrowAmount);
                            const result = await smartBorrow(
                              amountInWei,
                              walletClient as WalletClient
                            );
                            if (result.status && result.positionId) {
                              setNewPositionId(result.positionId);
                              setBorrowSuccess(true);
                              // Refresh user positions after successful smart borrow
                              await fetchUserPositions();
                            } else {
                              console.error("Smart Borrow failed", result);
                            }
                          } catch (error) {
                            console.error("Failed to smart borrow:", error);
                          } finally {
                            setIsProcessingSmartBorrow(false);
                          }
                        }}
                      >
                        {isProcessingSmartBorrow ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Smart Borrow"
                        )}
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
                                  // Refresh user positions after successful repay
                                  await fetchUserPositions();
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
                      {isLoadingUserPositions ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <RefreshCw className="w-12 h-12 mx-auto mb-4 animate-spin opacity-50" />
                          <p>Loading positions...</p>
                        </div>
                      ) : userPositions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No active positions</p>
                          <p className="text-sm">
                            Borrow tokens to create your first position
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {userPositions.map((position) => (
                            <div key={position.positionId} className="p-4 border rounded-lg space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline">Position #{position.positionId}</Badge>
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
                                  onClick={() => setRepayPositionId(position.positionId.toString())}
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
                                    {(Number(position.amount) / Math.pow(10, baseToken?.decimals || 18)).toLocaleString()} {baseToken?.symbol}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">
                                    Collateral:
                                  </span>
                                  <div className="font-mono">
                                    {(Number(position.collateral) / Math.pow(10, quoteToken?.decimals || 18)).toLocaleString()} {quoteToken?.symbol}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
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
                          1 ETH
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
                              1,000 available
                            </span>
                          </div>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">PUSDT</span>
                            <span className="text-sm text-muted-foreground">
                              1,000,000 available
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
