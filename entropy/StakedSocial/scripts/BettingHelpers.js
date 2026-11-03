// helpers.js
// Backend helpers for FriendsGroupBets:
// - Maintains JSON metadata per market
// - Computes/uses metadataHash to anchor semantics on-chain
// - Wraps all contract calls (create, bet, vote, system resolve/cancel, withdraw)
// - Provides query helpers (who bet what, totals, targets, participants, votes, etc.)

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

// -----------------------------
// CONFIG: file storage
// -----------------------------

const DATA_DIR = path.join(__dirname, "data");
const MARKETS_DIR = path.join(DATA_DIR, "markets");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(MARKETS_DIR)) fs.mkdirSync(MARKETS_DIR, { recursive: true });

// -----------------------------
// Low-level metadata utilities
// -----------------------------

function marketFilePath(marketId) {
  return path.join(MARKETS_DIR, `market_${marketId}.json`);
}

function loadMetadata(marketId) {
  const fp = marketFilePath(marketId);
  if (!fs.existsSync(fp)) {
    throw new Error(`metadata file not found for market ${marketId}`);
  }
  const raw = fs.readFileSync(fp, "utf8");
  return JSON.parse(raw);
}

function saveMetadata(marketId, metadata) {
  const fp = marketFilePath(marketId);
  fs.writeFileSync(fp, JSON.stringify(metadata, null, 2));
}

// hash static part only (immutable semantics)
function computeStaticMetadataHash(staticPart) {
  const json = JSON.stringify(staticPart);
  return ethers.keccak256(ethers.toUtf8Bytes(json));
}

// recompute hash from stored metadata (for safety checks if needed)
function recomputeStoredHash(metadata) {
  return computeStaticMetadataHash(metadata.static);
}

// small helper
async function getSignerAddressFromContract(contract) {
  if (!contract.runner || !contract.runner.getAddress) {
    throw new Error("Contract is not connected to a signer");
  }
  return contract.runner.getAddress();
}

async function getChainIdFromContract(contract) {
  const runner = contract.runner;
  let provider = runner.provider || runner;
  if (!provider || !provider.getNetwork) {
    throw new Error("No provider attached to contract");
  }
  const network = await provider.getNetwork();
  return Number(network.chainId);
}

// -----------------------------
// CREATE MARKET + METADATA
// -----------------------------

/**
 * Create a market and write initial metadata JSON.
 *
 * params:
 *  - question: string
 *  - description: string (optional)
 *  - groupId: string (optional)
 *  - outcomes: string[] (labels)
 *  - deadline: number | bigint (unix seconds)
 *  - shareSizeWei: bigint | string
 *  - resolverAddr: string
 *  - targetAddresses: string[]
 */
async function createMarketWithMetadata(contract, params) {
  const {
    question,
    description = "",
    groupId = "",
    outcomes,
    deadline,
    shareSizeWei,
    resolverAddr,
    targetAddresses = [],
  } = params;

  if (!Array.isArray(outcomes) || outcomes.length === 0) {
    throw new Error("outcomes required");
  }

  const outcomesCount = outcomes.length;
  const shareSizeBN = BigInt(shareSizeWei);
  const deadlineBN = BigInt(deadline);

  const creator = await getSignerAddressFromContract(contract);
  const chainId = await getChainIdFromContract(contract);
  const contractAddress = await contract.getAddress();
  const now = Math.floor(Date.now() / 1000);

  // immutable semantics
  const staticMeta = {
    version: 1,
    question,
    description,
    groupId,
    outcomes,
  };

  const metadataHash = computeStaticMetadataHash(staticMeta);

  // call contract
  const tx = await contract.createMarket(
    metadataHash,
    deadlineBN,
    resolverAddr,
    shareSizeBN,
    targetAddresses,
    outcomesCount
  );
  const receipt = await tx.wait();

  // read event
  const parsedLogs = receipt.logs
    .map((log) => {
      try {
        return contract.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const created = parsedLogs.find((ev) => ev.name === "MarketCreated");
  if (!created) {
    throw new Error("MarketCreated event not found");
  }
  const marketId = created.args.id.toString();

  // runtime + onchain info
  const metadata = {
    metadataHash, // anchor used on-chain
    static: staticMeta,
    onchain: {
      chainId,
      contractAddress,
      marketId,
      creator,
      resolver: resolverAddr,
      deadline: deadlineBN.toString(),
      shareSizeWei: shareSizeBN.toString(),
      targets: targetAddresses,
      outcomesCount,
    },
    runtime: {
      createdAt: now,
      bets: {},           // address -> { totalWei, perOutcomeWei[], txs[] }
      votesResolve: {},   // address -> outcomeIndex
      votesCancel: {},    // address -> boolean
      participants: [],   // addresses that have bet
      status: {
        resolved: false,
        cancelled: false,
        winningOutcome: null,
        finalizedAt: null,
      },
      withdrawals: {},     // address -> { amountWei, txHash, ts }
    },
  };

  saveMetadata(marketId, metadata);

  return { marketId, metadataHash, metadata };
}

// -----------------------------
// BET + METADATA UPDATE
// -----------------------------

/**
 * Place bet and update metadata.
 * params:
 *  - outcomeIndex: number
 *  - amountWei: bigint | string
 */
async function placeBetWithMetadata(contract, marketId, params) {
  const { outcomeIndex, amountWei } = params;

  const metadata = loadMetadata(marketId);
  const outcomesCount = metadata.onchain.outcomesCount;
  if (outcomeIndex < 0 || outcomeIndex >= outcomesCount) {
    throw new Error("invalid outcome index");
  }

  const amountBN = BigInt(amountWei);
  const shareSizeBN = BigInt(metadata.onchain.shareSizeWei);
  if (amountBN <= 0n || amountBN % shareSizeBN !== 0n) {
    throw new Error("amount not valid multiple of share size");
  }

  const bettor = await getSignerAddressFromContract(contract);

  // call contract
  const tx = await contract.placeBet(marketId, outcomeIndex, { value: amountBN });
  const receipt = await tx.wait();

  const ts = Math.floor(Date.now() / 1000); // can also fetch block timestamp if you want

  // update metadata runtime.bets
  if (!metadata.runtime.bets[bettor]) {
    metadata.runtime.bets[bettor] = {
      totalWei: "0",
      perOutcomeWei: Array(outcomesCount).fill("0"),
      txs: [],
    };
  }

  const betInfo = metadata.runtime.bets[bettor];
  const newTotal = BigInt(betInfo.totalWei) + amountBN;
  betInfo.totalWei = newTotal.toString();

  const perOutcome = betInfo.perOutcomeWei.map((v) => BigInt(v));
  perOutcome[outcomeIndex] = perOutcome[outcomeIndex] + amountBN;
  betInfo.perOutcomeWei = perOutcome.map((x) => x.toString());

  betInfo.txs.push({
    txHash: receipt.hash,
    outcomeIndex,
    amountWei: amountBN.toString(),
    ts,
  });

  // participants list
  if (!metadata.runtime.participants.includes(bettor)) {
    metadata.runtime.participants.push(bettor);
  }

  saveMetadata(marketId, metadata);
  return { receipt, metadata };
}

// -----------------------------
// VOTING + METADATA UPDATE
// -----------------------------

async function voteResolveWithMetadata(contract, marketId, outcomeIndex) {
  const metadata = loadMetadata(marketId);
  const outcomesCount = metadata.onchain.outcomesCount;
  if (outcomeIndex < 0 || outcomeIndex >= outcomesCount) {
    throw new Error("invalid outcome index");
  }

  const voter = await getSignerAddressFromContract(contract);

  const tx = await contract.voteResolve(marketId, outcomeIndex);
  const receipt = await tx.wait();

  metadata.runtime.votesResolve[voter] = outcomeIndex;
  saveMetadata(marketId, metadata);

  return { receipt, metadata };
}

async function voteCancelWithMetadata(contract, marketId, flag) {
  const metadata = loadMetadata(marketId);
  const voter = await getSignerAddressFromContract(contract);

  const tx = await contract.voteToCancel(marketId, !!flag);
  const receipt = await tx.wait();

  metadata.runtime.votesCancel[voter] = !!flag;
  saveMetadata(marketId, metadata);

  return { receipt, metadata };
}

// -----------------------------
// SYSTEM RESOLVE/CANCEL + METADATA
// -----------------------------

async function systemResolveWithMetadata(contract, marketId, outcomeIndex) {
  const metadata = loadMetadata(marketId);
  const outcomesCount = metadata.onchain.outcomesCount;
  if (outcomeIndex < 0 || outcomeIndex >= outcomesCount) {
    throw new Error("invalid outcome index");
  }

  const storedHash = metadata.metadataHash;
  // optional safety: recompute and assert match
  const recomputed = recomputeStoredHash(metadata);
  if (storedHash.toLowerCase() !== recomputed.toLowerCase()) {
    throw new Error("metadataHash mismatch: stored vs recomputed static");
  }

  const tx = await contract.systemResolve(
    marketId,
    outcomeIndex,
    storedHash
  );
  const receipt = await tx.wait();

  metadata.runtime.status.resolved = true;
  metadata.runtime.status.cancelled = false;
  metadata.runtime.status.winningOutcome = outcomeIndex;
  metadata.runtime.status.finalizedAt = Math.floor(Date.now() / 1000);

  saveMetadata(marketId, metadata);
  return { receipt, metadata };
}

async function systemCancelWithMetadata(contract, marketId) {
  const metadata = loadMetadata(marketId);

  const tx = await contract.systemCancel(marketId);
  const receipt = await tx.wait();

  metadata.runtime.status.resolved = false;
  metadata.runtime.status.cancelled = true;
  metadata.runtime.status.winningOutcome = null;
  metadata.runtime.status.finalizedAt = Math.floor(Date.now() / 1000);

  saveMetadata(marketId, metadata);
  return { receipt, metadata };
}

// -----------------------------
// WITHDRAW + METADATA
// -----------------------------

async function withdrawWithMetadata(contract, marketId) {
  const metadata = loadMetadata(marketId);
  const user = await getSignerAddressFromContract(contract);

  const tx = await contract.withdraw(marketId);
  const receipt = await tx.wait();

  const parsedLogs = receipt.logs
    .map((log) => {
      try {
        return contract.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const withdrawalEvent = parsedLogs.find(
    (ev) => ev.name === "Withdrawal" && ev.args.user.toLowerCase() === user.toLowerCase()
  );

  const amountWei = withdrawalEvent ? withdrawalEvent.args.amount.toString() : "0";

  metadata.runtime.withdrawals[user] = {
    amountWei,
    txHash: receipt.hash,
    ts: Math.floor(Date.now() / 1000),
  };

  // status might be finalized already; do not override
  saveMetadata(marketId, metadata);
  return { receipt, amountWei, metadata };
}

// -----------------------------
// READ HELPERS (OFF-CHAIN VIEW)
// -----------------------------

function getMarketMetadata(marketId) {
  return loadMetadata(marketId);
}

function listAllMarketIds() {
  const files = fs.readdirSync(MARKETS_DIR);
  return files
    .filter((f) => f.startsWith("market_") && f.endsWith(".json"))
    .map((f) => f.replace("market_", "").replace(".json", ""));
}

function getTargetsFromMetadata(marketId) {
  const metadata = loadMetadata(marketId);
  return metadata.onchain.targets || [];
}

function getParticipantsFromMetadata(marketId) {
  const metadata = loadMetadata(marketId);
  return metadata.runtime.participants || [];
}

function getUserBetSummary(marketId, userAddress) {
  const metadata = loadMetadata(marketId);
  const bets = metadata.runtime.bets[userAddress];
  if (!bets) {
    return {
      totalWei: "0",
      perOutcomeWei: Array(metadata.onchain.outcomesCount).fill("0"),
      txs: [],
    };
  }
  return bets;
}

function getUserTotalBetWei(marketId, userAddress) {
  const summary = getUserBetSummary(marketId, userAddress);
  return summary.totalWei;
}

function getOutcomeTotalsFromMetadata(marketId) {
  const metadata = loadMetadata(marketId);
  const outcomesCount = metadata.onchain.outcomesCount;
  const totals = Array(outcomesCount).fill(0n);

  for (const addr of Object.keys(metadata.runtime.bets)) {
    const info = metadata.runtime.bets[addr];
    const arr = info.perOutcomeWei.map((v) => BigInt(v));
    for (let i = 0; i < outcomesCount; i++) {
      totals[i] += arr[i];
    }
  }

  return totals.map((x) => x.toString());
}

function getAllBets(marketId) {
  const metadata = loadMetadata(marketId);
  return metadata.runtime.bets;
}

function getVotesResolve(marketId) {
  const metadata = loadMetadata(marketId);
  return metadata.runtime.votesResolve;
}

function getVotesCancel(marketId) {
  const metadata = loadMetadata(marketId);
  return metadata.runtime.votesCancel;
}

function getStatus(marketId) {
  const metadata = loadMetadata(marketId);
  return metadata.runtime.status;
}

// -----------------------------
// EXPORTS
// -----------------------------

module.exports = {
  // core hash util
  computeStaticMetadataHash,
  // create + actions
  createMarketWithMetadata,
  placeBetWithMetadata,
  voteResolveWithMetadata,
  voteCancelWithMetadata,
  systemResolveWithMetadata,
  systemCancelWithMetadata,
  withdrawWithMetadata,
  // read-side helpers
  getMarketMetadata,
  listAllMarketIds,
  getTargetsFromMetadata,
  getParticipantsFromMetadata,
  getUserBetSummary,
  getUserTotalBetWei,
  getOutcomeTotalsFromMetadata,
  getAllBets,
  getVotesResolve,
  getVotesCancel,
  getStatus,
};
