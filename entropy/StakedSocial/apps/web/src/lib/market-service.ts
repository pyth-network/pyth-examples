import { ethers } from "ethers";
import { saveMessage, type ChatMessage } from "./chat-metadata";
import { sdk } from "@farcaster/frame-sdk";
import { useSignMessage } from "wagmi";


// Degen Mode Enum - integrated throughout
enum DegenMode {
  STANDARD = 0,
  RANDOM_RANGE = 1,
  CASCADING_ODDS = 2,
  VOLATILITY_BOOST = 3,
}

// Contract ABI (comprehensive degen_mode support)
const BETTING_CONTRACT_ABI = [
  "function createMarket(bytes32 metadataHash, uint64 deadline, address resolverAddr, uint256 shareSize, address[] memory targetList, uint256 outcomesCount) external returns (uint256 id)",
  "function createDegenMarket(bytes32 metadataHash, uint64 deadline, address resolverAddr, uint256 shareSize, address[] memory targetList, uint8 degenMode, uint256 rngThreshold) external returns (uint256 id)",
  "function placeBet(uint256 id, uint256 outcome) external payable",
  "function placeDegenBet(uint256 marketId, uint8 side) external payable",
  "function requestDegenResolution(uint256 marketId) external payable",
  "function withdrawDegen(uint256 marketId) external",
  "function voteResolve(uint256 id, uint8 outcome) external",
  "function voteToCancel(uint256 id, bool v) external",
  "function systemResolve(uint256 id, uint8 outcome, bytes32 metadataHash) external",
  "function systemCancel(uint256 id) external",
  "function withdraw(uint256 id) external",
  "function getDegenBets(uint256 marketId) external view returns (tuple(uint256 marketId, address bettor, uint256 amount, uint8 side, uint256 timestamp, bool claimed)[] memory)",
  "function getRNGHistory(uint256 marketId) external view returns (bytes32[] memory)",
  "function isDegenMarket(uint256 marketId) external view returns (bool)",
  "function getDegenThreshold(uint256 marketId) external view returns (uint256)",
  "event MarketCreated(uint256 indexed id, bytes32 metadataHash)",
  "event DegenMarketCreated(uint256 indexed id, uint8 degenMode, uint256 threshold, bytes32 metadataHash)",
  "event BetPlaced(uint256 indexed id, address indexed user, uint256 outcome, uint256 amt)",
  "event DegenBetPlaced(uint256 indexed marketId, address indexed bettor, uint256 amount, uint8 side, uint256 timestamp)",
  "event EntropyRequested(uint256 indexed marketId, bytes32 sequenceNumber, uint256 timestamp)",
  "event EntropyCallbackReceived(uint256 indexed marketId, bytes32 sequenceNumber, bytes32 randomNumber, uint256 timestamp)",
  "event DegenOutcomeResolved(uint256 indexed marketId, uint256 rngValue, uint8 winningOutcome, bytes32 randomHash)",
  "event RNGHistoryRecorded(uint256 indexed marketId, uint256 historyIndex, bytes32 randomHash)",
];

// Environment variables - try to load from secrets for backend, or use public env vars
let ADMIN_ADDRESS: string;
let ADMIN_MNEMONIC: string;
let CONTRACT_ADDRESS: string;
let RPC_URL: string;

// Check if this is running on the server (has access to secrets) or client
if (typeof window === "undefined") {
  // Server-side: import secrets
  try {
    const secrets = require("./secrets.local.js");
    ADMIN_ADDRESS = secrets.ADMIN_ADDRESS;
    ADMIN_MNEMONIC = secrets.ADMIN_MNEMONIC;
    CONTRACT_ADDRESS = secrets.CONTRACT_ADDRESS;
    RPC_URL = secrets.RPC_URL;
  } catch (e) {
    console.warn("[MARKET] Could not load secrets.local.js");
  }
} else {
  // Client-side: use public environment variables
  ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_ADDRESS || "0x7A19e4496bf4428Eb414cf7ad4a80DfE53b2a965";
  CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xB0bD3b5D742FF7Ce8246DE6e650085957BaAC852";
  RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://forno.celo-sepolia.celo-testnet.org";
  ADMIN_MNEMONIC = ""; // Not available on client
}

console.log("[MARKET] Config loaded:", {
  ADMIN_ADDRESS,
  CONTRACT_ADDRESS,
  RPC_URL,
  isServer: typeof window === "undefined",
});

// Degen Bet interface
export interface DegenBet {
  marketId: string;
  bettor: string;
  amount: string;
  side: number; // 0 = Below, 1 = Above
  timestamp: number;
  claimed: boolean;
}

// Market metadata interface (with full degen_mode integration)
export interface MarketMetadata {
  metadataHash: string;
  static: {
    version: number;
    question: string;
    description: string;
    groupId: string;
    outcomes: string[];
  };
  onchain: {
    chainId: number;
    contractAddress: string;
    marketId: string;
    creator: string;
    resolver: string;
    deadline: string;
    shareSizeWei: string;
    targets: string[];
    outcomesCount: number;
  };
  runtime: {
    createdAt: number;
    chatId?: string;
    creatorUsername?: string;
    status: {
      resolved: boolean;
      cancelled: boolean;
      winningOutcome: number | null;
      finalizedAt: number | null;
    };
  };
  degen?: {
    isDegen: boolean;
    degenMode?: DegenMode;
    rngThreshold?: number;
    entropySequenceNumber?: string;
    entropyCallbackReceived?: boolean;
    randomNumberHash?: string;
    rngRequestTimestamp?: number;
    entropyProvider?: string;
    rngHistory?: string[];
    degenBets?: DegenBet[];
  };
}

// User position/trade interface
export interface UserPosition {
  id: string; // Unique identifier for this position
  marketId: string;
  userAddress: string;
  username: string;
  outcomeIndex: number;
  shares: string; // Number of shares in Wei
  costPerShare: string; // Share size in Wei
  totalCost: string; // Total amount in Wei (shares * costPerShare)
  txHash: string; // Transaction hash
  createdAt: number; // Timestamp
  status: 'pending' | 'confirmed' | 'failed';
}

// Storage keys
const MARKETS_STORAGE_KEY = "markets_metadata";
const POSITIONS_STORAGE_KEY = "user_positions"; // All positions across all markets

// Get all markets from localStorage
export function getAllMarkets(): Record<string, MarketMetadata> {
  if (typeof window === "undefined") return {};
  const stored = localStorage.getItem(MARKETS_STORAGE_KEY);
  return stored ? JSON.parse(stored) : {};
}

// Save market to localStorage
export function saveMarket(marketId: string, metadata: MarketMetadata) {
  if (typeof window === "undefined") return;
  const markets = getAllMarkets();
  markets[marketId] = metadata;
  localStorage.setItem(MARKETS_STORAGE_KEY, JSON.stringify(markets));
}

// Get market by ID
export function getMarket(marketId: string): MarketMetadata | null {
  const markets = getAllMarkets();
  return markets[marketId] || null;
}

// Compute metadata hash (must match on-chain)
function computeStaticMetadataHash(staticPart: any): string {
  const json = JSON.stringify(staticPart);
  return ethers.keccak256(ethers.toUtf8Bytes(json));
}

// Create degen market on-chain with Pyth Entropy integration
export async function createDegenMarket(params: {
  question: string;
  description: string;
  deadline: string;
  shareSizeWei: string;
  targets: string[];
  degenMode: DegenMode;
  rngThreshold: number; // 0-10000 for 0-100.00
  chatId?: string;
  creatorUsername?: string;
  groupId?: string;
}): Promise<{ marketId: string; metadata: MarketMetadata }> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = ethers.Wallet.fromPhrase(ADMIN_MNEMONIC).connect(provider);

    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      BETTING_CONTRACT_ABI,
      wallet
    );

    const deadlineTimestamp = Math.floor(new Date(params.deadline).getTime() / 1000);

    const staticMeta = {
      version: 1,
      question: params.question,
      description: params.description || "",
      groupId: params.groupId || params.chatId || "",
      outcomes: ["Below Threshold", "Above Threshold"],
    };

    const metadataHash = computeStaticMetadataHash(staticMeta);
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);

    console.log("[DEGEN] Creating degen market with mode:", DegenMode[params.degenMode], "threshold:", params.rngThreshold);

    const tx = await contract.createDegenMarket(
      metadataHash,
      deadlineTimestamp,
      ADMIN_ADDRESS,
      params.shareSizeWei,
      params.targets,
      params.degenMode,
      params.rngThreshold
    );

    const receipt = await tx.wait();
    console.log("[DEGEN] Degen market transaction confirmed:", receipt);

    const degenMarketCreatedEvent = receipt.logs
      .map((log: any) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .find((ev: any) => ev?.name === "DegenMarketCreated");

    if (!degenMarketCreatedEvent) {
      throw new Error("DegenMarketCreated event not found");
    }

    const marketId = degenMarketCreatedEvent.args.id.toString();
    console.log("[DEGEN] Degen market created with ID:", marketId);

    const metadata: MarketMetadata = {
      metadataHash,
      static: staticMeta,
      onchain: {
        chainId,
        contractAddress: CONTRACT_ADDRESS,
        marketId,
        creator: ADMIN_ADDRESS,
        resolver: ADMIN_ADDRESS,
        deadline: deadlineTimestamp.toString(),
        shareSizeWei: params.shareSizeWei,
        targets: params.targets,
        outcomesCount: 2,
      },
      runtime: {
        createdAt: Math.floor(Date.now() / 1000),
        chatId: params.chatId,
        creatorUsername: params.creatorUsername,
        status: {
          resolved: false,
          cancelled: false,
          winningOutcome: null,
          finalizedAt: null,
        },
      },
      degen: {
        isDegen: true,
        degenMode: params.degenMode,
        rngThreshold: params.rngThreshold,
        entropyCallbackReceived: false,
        rngHistory: [],
        degenBets: [],
      },
    };

    saveMarket(marketId, metadata);

    if (params.chatId) {
      const betMessage: ChatMessage = {
        id: `degen-bet-${marketId}`,
        chatId: params.chatId,
        content: `🎲 ${params.question} (Degen Mode: ${DegenMode[params.degenMode]})`,
        senderAddress: ADMIN_ADDRESS,
        timestamp: metadata.runtime.createdAt * 1000,
        status: 'sent',
        type: 'bet',
        marketId: marketId,
      };
      saveMessage(betMessage);
    }

    return { marketId, metadata };
  } catch (error: any) {
    console.error("[DEGEN] Error creating degen market:", error);
    throw error;
  }
}

// Create standard market on-chain
export async function createMarket(params: {
  question: string;
  description: string;
  outcomes: string[];
  deadline: string; // ISO date string
  shareSizeWei: string;
  targets: string[];
  chatId?: string;
  creatorUsername?: string;
  groupId?: string;
}): Promise<{ marketId: string; metadata: MarketMetadata }> {
  try {
    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = ethers.Wallet.fromPhrase(ADMIN_MNEMONIC).connect(provider);

    // Connect to contract
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      BETTING_CONTRACT_ABI,
      wallet
    );

    // Convert deadline to unix timestamp
    const deadlineTimestamp = Math.floor(new Date(params.deadline).getTime() / 1000);

    // Build static metadata
    const staticMeta = {
      version: 1,
      question: params.question,
      description: params.description || "",
      groupId: params.groupId || params.chatId || "",
      outcomes: params.outcomes,
    };

    // Compute metadata hash
    const metadataHash = computeStaticMetadataHash(staticMeta);

    // Get network info
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);

    // Call contract to create market
    console.log("[MARKET] Creating market on-chain...", {
      metadataHash,
      deadline: deadlineTimestamp,
      resolver: ADMIN_ADDRESS,
      shareSize: params.shareSizeWei,
      targets: params.targets,
      outcomesCount: params.outcomes.length,
    });

    const tx = await contract.createMarket(
      metadataHash,
      deadlineTimestamp,
      ADMIN_ADDRESS, // resolver (admin)
      params.shareSizeWei,
      params.targets,
      params.outcomes.length
    );

    console.log("[MARKET] Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("[MARKET] Transaction confirmed:", receipt);

    // Parse MarketCreated event
    const marketCreatedEvent = receipt.logs
      .map((log: any) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .find((ev: any) => ev?.name === "MarketCreated");

    if (!marketCreatedEvent) {
      throw new Error("MarketCreated event not found in transaction");
    }

    const marketId = marketCreatedEvent.args.id.toString();
    console.log("[MARKET] Market created with ID:", marketId);

    // Build full metadata
    const metadata: MarketMetadata = {
      metadataHash,
      static: staticMeta,
      onchain: {
        chainId,
        contractAddress: CONTRACT_ADDRESS,
        marketId,
        creator: ADMIN_ADDRESS,
        resolver: ADMIN_ADDRESS,
        deadline: deadlineTimestamp.toString(),
        shareSizeWei: params.shareSizeWei,
        targets: params.targets,
        outcomesCount: params.outcomes.length,
      },
      runtime: {
        createdAt: Math.floor(Date.now() / 1000),
        chatId: params.chatId,
        creatorUsername: params.creatorUsername,
        status: {
          resolved: false,
          cancelled: false,
          winningOutcome: null,
          finalizedAt: null,
        },
      },
    };

    // Save to localStorage
    saveMarket(marketId, metadata);

    // Create a bet message in the chat
    if (params.chatId) {
      const betMessage: ChatMessage = {
        id: `bet-${marketId}`,
        chatId: params.chatId,
        content: params.question,
        senderAddress: ADMIN_ADDRESS,
        timestamp: metadata.runtime.createdAt * 1000, // Convert to ms
        status: 'sent',
        type: 'bet',
        marketId: marketId,
      };
      saveMessage(betMessage);
    }

    return { marketId, metadata };
  } catch (error: any) {
    console.error("[MARKET] Error creating market:", error);

    // Check for specific error types
    if (error.message?.includes("insufficient funds")) {
      throw new Error("INSUFFICIENT_FUNDS");
    }

    throw error;
  }
}

// Get markets for a specific chat
export function getMarketsForChat(chatId: string): MarketMetadata[] {
  const markets = getAllMarkets();
  return Object.values(markets).filter(
    (market) => market.runtime.chatId === chatId
  );
}

// ============================================
// USER POSITIONS/TRADES STORAGE
// ============================================

// Get all positions from localStorage
export function getAllPositions(): UserPosition[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(POSITIONS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("[POSITIONS] Error loading positions:", error);
    return [];
  }
}

// Save a position to localStorage
export function savePosition(position: UserPosition): void {
  if (typeof window === "undefined") return;
  try {
    const positions = getAllPositions();
    const existingIndex = positions.findIndex(p => p.id === position.id);

    if (existingIndex >= 0) {
      positions[existingIndex] = position;
    } else {
      positions.push(position);
    }

    localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(positions));
    console.log("[POSITIONS] Position saved:", position.id);
  } catch (error) {
    console.error("[POSITIONS] Error saving position:", error);
  }
}

// Get positions for a specific user
export function getUserPositions(userAddress: string): UserPosition[] {
  const positions = getAllPositions();
  return positions.filter(p => p.userAddress.toLowerCase() === userAddress.toLowerCase());
}

// Get positions for a specific market
export function getMarketPositions(marketId: string): UserPosition[] {
  const positions = getAllPositions();
  return positions.filter(p => p.marketId === marketId);
}

// Get user positions for a specific market
export function getUserMarketPosition(marketId: string, userAddress: string): UserPosition | undefined {
  const positions = getAllPositions();
  return positions.find(
    p => p.marketId === marketId && p.userAddress.toLowerCase() === userAddress.toLowerCase()
  );
}

// Get user's position on a specific outcome
export function getUserOutcomePosition(
  marketId: string,
  userAddress: string,
  outcomeIndex: number
): UserPosition | undefined {
  const positions = getAllPositions();
  return positions.find(
    p => p.marketId === marketId &&
         p.userAddress.toLowerCase() === userAddress.toLowerCase() &&
         p.outcomeIndex === outcomeIndex
  );
}

// Get total shares user has on each outcome for a market
export function getUserMarketShares(
  marketId: string,
  userAddress: string
): Record<number, string> {
  const positions = getAllPositions();
  const sharesPerOutcome: Record<number, string> = {};

  positions
    .filter(p => p.marketId === marketId && p.userAddress.toLowerCase() === userAddress.toLowerCase())
    .forEach(p => {
      if (!sharesPerOutcome[p.outcomeIndex]) {
        sharesPerOutcome[p.outcomeIndex] = "0";
      }
      // Add shares (convert to BigInt for proper addition)
      const current = BigInt(sharesPerOutcome[p.outcomeIndex] || "0");
      const shares = BigInt(p.shares);
      sharesPerOutcome[p.outcomeIndex] = (current + shares).toString();
    });

  return sharesPerOutcome;
}

// Place degen bet (Below/Above threshold)
export async function placeDegenBet(params: {
  marketId: string;
  side: number; // 0 = Below, 1 = Above
  amountWei: string;
  userAddress: string;
}): Promise<{ txHash: string; receipt: any }> {
  const market = getMarket(params.marketId);
  if (!market?.degen?.isDegen) {
    throw new Error("Not a degen market");
  }

  const iface = new ethers.Interface(BETTING_CONTRACT_ABI);
  const data = iface.encodeFunctionData("placeDegenBet", [params.marketId, params.side]);

  const eth = window.ethereum;
  if (!eth) throw new Error("MetaMask not available");

  await eth.request({ method: "eth_requestAccounts" });

  const txHash = await eth.request({
    method: "eth_sendTransaction",
    params: [{
      from: params.userAddress,
      to: CONTRACT_ADDRESS,
      data,
      value: params.amountWei
    }]
  });

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const receipt = await provider.waitForTransaction(txHash);

  console.log("[DEGEN] Bet placed, side:", params.side === 0 ? "BELOW" : "ABOVE");

  return { txHash, receipt };
}

// Request Entropy RNG for degen market resolution
export async function requestDegenResolution(params: {
  marketId: string;
  userAddress: string;
  entropyFee: string; // Pyth Entropy fee in wei
}): Promise<{ txHash: string; receipt: any }> {
  const market = getMarket(params.marketId);
  if (!market?.degen?.isDegen) {
    throw new Error("Not a degen market");
  }

  const iface = new ethers.Interface(BETTING_CONTRACT_ABI);
  const data = iface.encodeFunctionData("requestDegenResolution", [params.marketId]);

  const eth = window.ethereum;
  if (!eth) throw new Error("MetaMask not available");

  const txHash = await eth.request({
    method: "eth_sendTransaction",
    params: [{
      from: params.userAddress,
      to: CONTRACT_ADDRESS,
      data,
      value: params.entropyFee
    }]
  });

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const receipt = await provider.waitForTransaction(txHash);

  console.log("[DEGEN] Entropy RNG resolution requested for market:", params.marketId);

  return { txHash, receipt };
}

// Withdraw degen market winnings
export async function withdrawDegenWinnings(params: {
  marketId: string;
  userAddress: string;
}): Promise<{ txHash: string; receipt: any }> {
  const market = getMarket(params.marketId);
  if (!market?.degen?.isDegen) {
    throw new Error("Not a degen market");
  }

  const iface = new ethers.Interface(BETTING_CONTRACT_ABI);
  const data = iface.encodeFunctionData("withdrawDegen", [params.marketId]);

  const eth = window.ethereum;
  if (!eth) throw new Error("MetaMask not available");

  const txHash = await eth.request({
    method: "eth_sendTransaction",
    params: [{
      from: params.userAddress,
      to: CONTRACT_ADDRESS,
      data,
    }]
  });

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const receipt = await provider.waitForTransaction(txHash);

  console.log("[DEGEN] Withdrawal processed for market:", params.marketId);

  return { txHash, receipt };
}

// Fetch degen bets for a market
export async function fetchDegenBets(marketId: string): Promise<DegenBet[]> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      BETTING_CONTRACT_ABI,
      provider
    );

    const bets = await contract.getDegenBets(marketId);
    const market = getMarket(marketId);

    if (market?.degen) {
      market.degen.degenBets = bets;
      saveMarket(marketId, market);
    }

    console.log("[DEGEN] Fetched", bets.length, "degen bets for market:", marketId);
    return bets;
  } catch (error) {
    console.error("[DEGEN] Error fetching degen bets:", error);
    return [];
  }
}

// Fetch RNG history for a market
export async function fetchRNGHistory(marketId: string): Promise<string[]> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      BETTING_CONTRACT_ABI,
      provider
    );

    const history = await contract.getRNGHistory(marketId);
    const market = getMarket(marketId);

    if (market?.degen) {
      market.degen.rngHistory = history;
      saveMarket(marketId, market);
    }

    console.log("[DEGEN] Fetched", history.length, "RNG history entries for market:", marketId);
    return history;
  } catch (error) {
    console.error("[DEGEN] Error fetching RNG history:", error);
    return [];
  }
}

// Check if market is degen
export async function checkIsDegenMarket(marketId: string): Promise<boolean> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      BETTING_CONTRACT_ABI,
      provider
    );

    const isDegen = await contract.isDegenMarket(marketId);
    console.log("[DEGEN] Market", marketId, "isDegen:", isDegen);
    return isDegen;
  } catch (error) {
    console.error("[DEGEN] Error checking degen market:", error);
    return false;
  }
}

// Get degen threshold
export async function getDegenThreshold(marketId: string): Promise<number> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      BETTING_CONTRACT_ABI,
      provider
    );

    const threshold = await contract.getDegenThreshold(marketId);
    console.log("[DEGEN] Market", marketId, "RNG threshold:", Number(threshold));
    return Number(threshold);
  } catch (error) {
    console.error("[DEGEN] Error getting threshold:", error);
    return 0;
  }
}

// Place bet on a market - uses user's signer (requires wallet connection)
export async function placeBet(params) {
  const { marketId, outcomeIndex, amountWei, userAddress } = params;

  const market = getMarket(marketId);
  const amountBN = BigInt(amountWei);
  const shareSizeBN = BigInt(market.onchain.shareSizeWei);

  const iface = new ethers.Interface(BETTING_CONTRACT_ABI);
  const data = iface.encodeFunctionData("placeBet", [marketId, outcomeIndex]);

  const eth = window.ethereum;
  if (!eth) throw new Error("MetaMask not available.");

  await eth.request({ method: "eth_requestAccounts" });

  const txHash = await eth.request({
    method: "eth_sendTransaction",
    params: [{
      from: userAddress,
      to: CONTRACT_ADDRESS,
      data,
      value: amountWei
    }]
  });

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const receipt = await provider.waitForTransaction(txHash);

  return { txHash, receipt };
}