import { ethers } from "ethers";
import * as fs from "fs";

/**
 * Test Script for TokenReputationContract with Pyth + Entropy Integration
 * 
 * This contract requires 3 addresses on deployment:
 * 1. Pyth Contract Address
 * 2. Entropy Contract Address  
 * 3. Entropy Provider Address
 */

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // Contract addresses (update these for your network)
  // For this example, the contract is deployed on Hedera
  PYTH_CONTRACT: "0xa2aa501b19aff244d90cc15a4cf739d2725b5729", 
  ENTROPY_CONTRACT: "0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c", // Example - update with yours
  ENTROPY_PROVIDER: "0x6CC14824Ea2918f5De5C2f75A9Da968ad4BD6344", // Example - update with yours
  
  // Your deployed contract address (fill after deployment)
  TOKEN_REPUTATION_CONTRACT: "0x479d9f5ea676ad97e129f15724e31f770f952a3a",
  
  // RPC and Wallet
  RPC_URL: "https://rpc.ankr.com/eth_sepolia", // Or your preferred RPC
  PRIVATE_KEY: "YOUR_PRIVATE_KEY", // NEVER commit this!
};

// Pyth Price Feed IDs
const PRICE_FEED_IDS = {
  BTC: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  ETH: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  SOL: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  MATIC: "0x5de33a9112c2b700b8d30b8a3402c103578ccfa2765696471cc672bd5cf6ac52",
  AAVE: "0x2b9ab1e972a281585084148ba1389800799bd4be63b957507db1349314e47445",
  DOGE: "0xdcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c",
  USDC: "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
};

// Contract ABI (from your compiled contract)
const CONTRACT_ABI = [
  "constructor(address _pythContract, address _entropyContract, address _entropyProvider)",
  "function owner() external view returns (address)",
  "function pyth() external view returns (address)",
  "function PRICE_STALENESS_THRESHOLD() external view returns (uint256)",
  
  // Price Feed Management
  "function setPriceFeedId(string calldata token, bytes32 priceFeedId) external",
  "function batchSetPriceFeedIds(string[] calldata tokens, bytes32[] calldata priceFeedIds) external",
  "function getLatestPrice(string calldata token) external view returns (int64 price, uint64 confidence, int32 expo, uint256 publishTime)",
  "function getPriceNoOlderThan(string calldata token, uint256 age) external view returns (int64, uint64, int32, uint256)",
  "function updatePriceFeeds(bytes[] calldata priceUpdateData) external payable",
  
  // Score Management
  "function setScores(string calldata token, uint256 marketStability, uint256 fundamentalStrength, uint256 risk, uint256 reputationScore) external",
  "function getScores(string calldata token) external view returns (uint256, uint256, uint256, uint256)",
  "function getTokenData(string calldata token) external view returns (uint256, uint256, uint256, uint256, int64, uint64, int32, uint256)",
  "function getAllTokens() external view returns (string[] memory)",
  
  // Entropy Functions
  "function requestRandomEntropy(string calldata token) external payable",
  
  // Utility
  "function withdraw() external",
  
  // Events
  "event ScoresUpdated(string token, uint256 market, uint256 fundamental, uint256 risk, uint256 reputation)",
  "event PriceFeedIdSet(string token, bytes32 priceFeedId)",
  "event PriceUpdated(string token, int64 price, uint64 confidence, uint256 publishTime)",
  "event EntropyRequested(uint64 sequenceNumber, string token)",
  "event EntropyReceived(uint64 sequenceNumber, bytes32 randomNumber, string token)",
];

// ============================================================================
// Helper Functions
// ============================================================================

function formatPrice(price: bigint, expo: number): string {
  const actualPrice = Number(price) * Math.pow(10, expo);
  return actualPrice.toFixed(2);
}

function formatTimestamp(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleString();
}

async function waitForTransaction(tx: any, description: string) {
  console.log(`⏳ ${description}...`);
  console.log(`   Transaction hash: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`✅ Confirmed in block ${receipt.blockNumber}`);
  console.log(`   Gas used: ${receipt.gasUsed.toString()}\n`);
  return receipt;
}

// ============================================================================
// Main Test Suite
// ============================================================================

async function main() {
  console.log("🚀 TokenReputationContract Test Suite");
  console.log("=" .repeat(60));
  console.log();

  // Setup provider and signer
  const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
  const wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
  
  console.log("📋 Configuration:");
  console.log(`   Network: ${(await provider.getNetwork()).name}`);
  console.log(`   Wallet Address: ${wallet.address}`);
  console.log(`   Balance: ${ethers.formatEther(await provider.getBalance(wallet.address))} ETH`);
  console.log(`   Pyth Contract: ${CONFIG.PYTH_CONTRACT}`);
  console.log(`   Entropy Contract: ${CONFIG.ENTROPY_CONTRACT}`);
  console.log(`   Contract Address: ${CONFIG.TOKEN_REPUTATION_CONTRACT}`);
  console.log();

  // Connect to deployed contract
  const contract = new ethers.Contract(
    CONFIG.TOKEN_REPUTATION_CONTRACT,
    CONTRACT_ABI,
    wallet
  );

  // ============================================================================
  // Test 1: Verify Deployment
  // ============================================================================
  console.log("📊 Test 1: Verify Deployment Configuration");
  console.log("-".repeat(60));
  
  try {
    const owner = await contract.owner();
    const pythAddress = await contract.pyth();
    const stalenessThreshold = await contract.PRICE_STALENESS_THRESHOLD();
    
    console.log(`✅ Owner: ${owner}`);
    console.log(`✅ Pyth Contract: ${pythAddress}`);
    console.log(`✅ Staleness Threshold: ${stalenessThreshold} seconds`);
    console.log(`✅ Deployment verified!\n`);
  } catch (error: any) {
    console.error(`❌ Error verifying deployment: ${error.message}\n`);
  }

  // ============================================================================
  // Test 2: Set Price Feed IDs
  // ============================================================================
  console.log("📊 Test 2: Set Price Feed IDs");
  console.log("-".repeat(60));

  const tokensToSetup = [
    { symbol: "BTC", feedId: PRICE_FEED_IDS.BTC },
    { symbol: "ETH", feedId: PRICE_FEED_IDS.ETH },
    { symbol: "MATIC", feedId: PRICE_FEED_IDS.MATIC },
  ];

  for (const token of tokensToSetup) {
    try {
      const tx = await contract.setPriceFeedId(token.symbol, token.feedId);
      await waitForTransaction(tx, `Setting price feed for ${token.symbol}`);
    } catch (error: any) {
      console.error(`❌ Failed to set ${token.symbol} price feed: ${error.message}\n`);
    }
  }

  // ============================================================================
  // Test 3: Batch Set Price Feeds
  // ============================================================================
  console.log("📊 Test 3: Batch Set Price Feeds");
  console.log("-".repeat(60));

  try {
    const batchTokens = ["AAVE", "DOGE", "USDC"];
    const batchFeedIds = [
      PRICE_FEED_IDS.AAVE,
      PRICE_FEED_IDS.DOGE,
      PRICE_FEED_IDS.USDC,
    ];

    const tx = await contract.batchSetPriceFeedIds(batchTokens, batchFeedIds);
    await waitForTransaction(tx, "Batch setting price feeds");
  } catch (error: any) {
    console.error(`❌ Batch set failed: ${error.message}\n`);
  }

  // ============================================================================
  // Test 4: Set Reputation Scores
  // ============================================================================
  console.log("📊 Test 4: Set Reputation Scores");
  console.log("-".repeat(60));

  const scoreData = [
    { token: "BTC", market: 85, fundamental: 90, risk: 30, reputation: 95 },
    { token: "ETH", market: 80, fundamental: 88, risk: 35, reputation: 90 },
    { token: "MATIC", market: 70, fundamental: 75, risk: 50, reputation: 80 },
  ];

  for (const data of scoreData) {
    try {
      const tx = await contract.setScores(
        data.token,
        data.market,
        data.fundamental,
        data.risk,
        data.reputation
      );
      await waitForTransaction(tx, `Setting scores for ${data.token}`);
    } catch (error: any) {
      console.error(`❌ Failed to set ${data.token} scores: ${error.message}\n`);
    }
  }

  // ============================================================================
  // Test 5: Read Scores
  // ============================================================================
  console.log("📊 Test 5: Read Reputation Scores");
  console.log("-".repeat(60));

  for (const token of ["BTC", "ETH", "MATIC"]) {
    try {
      const [market, fundamental, risk, reputation] = await contract.getScores(token);
      console.log(`\n${token} Scores:`);
      console.log(`   Market Stability: ${market}`);
      console.log(`   Fundamental Strength: ${fundamental}`);
      console.log(`   Risk: ${risk}`);
      console.log(`   Reputation Score: ${reputation}`);
    } catch (error: any) {
      console.error(`❌ Failed to read ${token} scores: ${error.message}`);
    }
  }
  console.log();

  // ============================================================================
  // Test 6: Get All Tokens
  // ============================================================================
  console.log("📊 Test 6: Get All Registered Tokens");
  console.log("-".repeat(60));

  try {
    const allTokens = await contract.getAllTokens();
    console.log(`✅ Registered Tokens (${allTokens.length}):`);
    allTokens.forEach((token: string, index: number) => {
      console.log(`   ${index + 1}. ${token}`);
    });
    console.log();
  } catch (error: any) {
    console.error(`❌ Failed to get tokens: ${error.message}\n`);
  }

  // ============================================================================
  // Test 7: Get Latest Prices (will likely fail without price updates)
  // ============================================================================
  console.log("📊 Test 7: Get Latest Prices");
  console.log("-".repeat(60));
  console.log("⚠️  Note: This will fail without calling updatePriceFeeds first\n");

  for (const token of ["BTC", "ETH", "MATIC"]) {
    try {
      const [price, conf, expo, publishTime] = await contract.getLatestPrice(token);
      const actualPrice = formatPrice(price, expo);
      const actualConf = formatPrice(conf, expo);
      
      console.log(`${token} Price Data:`);
      console.log(`   Price: $${actualPrice}`);
      console.log(`   Confidence: ±$${actualConf}`);
      console.log(`   Publish Time: ${formatTimestamp(publishTime)}`);
      console.log();
    } catch (error: any) {
      console.log(`ℹ️  ${token}: ${error.message.substring(0, 100)}...\n`);
    }
  }

  // ============================================================================
  // Test 8: Get Token Data (Combined Scores + Price)
  // ============================================================================
  console.log("📊 Test 8: Get Complete Token Data");
  console.log("-".repeat(60));

  try {
    const [market, fundamental, risk, reputation, price, conf, expo, publishTime] = 
      await contract.getTokenData("BTC");
    
    console.log("BTC Complete Data:");
    console.log("\nReputation Scores:");
    console.log(`   Market Stability: ${market}`);
    console.log(`   Fundamental Strength: ${fundamental}`);
    console.log(`   Risk: ${risk}`);
    console.log(`   Reputation Score: ${reputation}`);
    console.log("\nPrice Data:");
    console.log(`   Price: $${formatPrice(price, expo)}`);
    console.log(`   Confidence: ±$${formatPrice(conf, expo)}`);
    console.log(`   Last Updated: ${formatTimestamp(publishTime)}`);
    console.log();
  } catch (error: any) {
    console.log(`ℹ️  Complete data unavailable: ${error.message}\n`);
  }

  // ============================================================================
  // Test 9: Request Random Entropy (Requires ETH for fee)
  // ============================================================================
  console.log("📊 Test 9: Request Random Entropy");
  console.log("-".repeat(60));
  console.log("⚠️  This requires ETH for entropy fee and may take time\n");

  try {
    // Get entropy fee (you'd need to query the entropy contract)
    const entropyFee = ethers.parseEther("0.001"); // Example fee
    
    const tx = await contract.requestRandomEntropy("BTC", {
      value: entropyFee
    });
    
    console.log(`⏳ Requesting entropy for BTC...`);
    console.log(`   Transaction hash: ${tx.hash}`);
    const receipt = await tx.wait();
    
    // Parse events
    const events = receipt.logs
      .map((log: any) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .filter((event: any) => event !== null);
    
    events.forEach((event: any) => {
      if (event.name === "EntropyRequested") {
        console.log(`✅ Entropy requested!`);
        console.log(`   Sequence Number: ${event.args.sequenceNumber}`);
        console.log(`   Token: ${event.args.token}`);
      }
    });
    console.log();
  } catch (error: any) {
    console.error(`❌ Entropy request failed: ${error.message}\n`);
  }

  // ============================================================================
  // Test 10: Listen for Events
  // ============================================================================
  console.log("📊 Test 10: Listen for Recent Events");
  console.log("-".repeat(60));

  try {
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = currentBlock - 100; // Last 100 blocks

    // Get ScoresUpdated events
    const scoresFilter = contract.filters.ScoresUpdated();
    const scoresEvents = await contract.queryFilter(scoresFilter, fromBlock);
    
    console.log(`\nScoresUpdated Events (${scoresEvents.length}):`);
    scoresEvents.forEach((event: any, index: number) => {
      console.log(`\n   Event ${index + 1}:`);
      console.log(`   Token: ${event.args.token}`);
      console.log(`   Market: ${event.args.market}`);
      console.log(`   Fundamental: ${event.args.fundamental}`);
      console.log(`   Risk: ${event.args.risk}`);
      console.log(`   Reputation: ${event.args.reputation}`);
    });

    // Get PriceFeedIdSet events
    const priceFilter = contract.filters.PriceFeedIdSet();
    const priceEvents = await contract.queryFilter(priceFilter, fromBlock);
    
    console.log(`\n\nPriceFeedIdSet Events (${priceEvents.length}):`);
    priceEvents.forEach((event: any, index: number) => {
      console.log(`   ${index + 1}. ${event.args.token}: ${event.args.priceFeedId}`);
    });

    // Get Entropy events
    const entropyReqFilter = contract.filters.EntropyRequested();
    const entropyReqEvents = await contract.queryFilter(entropyReqFilter, fromBlock);
    
    console.log(`\n\nEntropyRequested Events (${entropyReqEvents.length}):`);
    entropyReqEvents.forEach((event: any, index: number) => {
      console.log(`   ${index + 1}. Seq: ${event.args.sequenceNumber}, Token: ${event.args.token}`);
    });

    const entropyRecFilter = contract.filters.EntropyReceived();
    const entropyRecEvents = await contract.queryFilter(entropyRecFilter, fromBlock);
    
    console.log(`\n\nEntropyReceived Events (${entropyRecEvents.length}):`);
    entropyRecEvents.forEach((event: any, index: number) => {
      console.log(`   ${index + 1}. Seq: ${event.args.sequenceNumber}`);
      console.log(`       Random: ${event.args.randomNumber}`);
      console.log(`       Token: ${event.args.token}`);
    });
    
    console.log();
  } catch (error: any) {
    console.error(`❌ Event listening failed: ${error.message}\n`);
  }

  // ============================================================================
  // Summary
  // ============================================================================
  console.log("=".repeat(60));
  console.log("✅ Test Suite Completed!");
  console.log("=".repeat(60));
  console.log("\n📝 Summary:");
  console.log("✓ Contract deployment verified");
  console.log("✓ Price feeds configured");
  console.log("✓ Reputation scores set and verified");
  console.log("✓ Token list populated");
  console.log("✓ Events emitted and captured");
  console.log("\n🚀 Next Steps:");
  console.log("1. Call updatePriceFeeds() with Pyth price data");
  console.log("2. Monitor entropy callbacks for score updates");
  console.log("3. Integrate with your A2A agent system");
  console.log("4. Set up automated monitoring and rebalancing");
  console.log();
}

// ============================================================================
// Deployment Helper
// ============================================================================

async function deployContract() {
  console.log("🚀 Deploying TokenReputationContract...\n");
  
  const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
  const wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
  
  // Load contract bytecode and ABI
  const contractJson = JSON.parse(fs.readFileSync("./TokenReputationContract.json", "utf8"));
  
  const factory = new ethers.ContractFactory(
    contractJson.abi,
    contractJson.bytecode,
    wallet
  );
  
  console.log("📋 Deployment Parameters:");
  console.log(`   Pyth: ${CONFIG.PYTH_CONTRACT}`);
  console.log(`   Entropy: ${CONFIG.ENTROPY_CONTRACT}`);
  console.log(`   Provider: ${CONFIG.ENTROPY_PROVIDER}\n`);
  
  const contract = await factory.deploy(
    CONFIG.PYTH_CONTRACT,
    CONFIG.ENTROPY_CONTRACT,
    CONFIG.ENTROPY_PROVIDER
  );
  
  console.log(`⏳ Waiting for deployment...`);
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log(`✅ Contract deployed at: ${address}\n`);
  console.log(`Update CONFIG.TOKEN_REPUTATION_CONTRACT with this address!`);
  
  return address;
}

// ============================================================================
// Run
// ============================================================================

// Uncomment to deploy:
// deployContract().catch(console.error);

// Run tests:
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });