import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Contract address on Base Sepolia
const CONTRACT_ADDRESS = "0x2e951d54caD20ff3CeA95bFc79CF11FfC62E0134";

// Get JSON file path from environment variable
const JSON_FILE_PATH = process.env.JSON_FILE || "scripts/creditEngine/sampleData/excellentTrader.json";

// Interface for the JSON data structure
interface PolymarketData {
    user: {
        name: string;
        value: string;
    };
    closedPositions: Array<{
        realizedPnl: string;
        totalBought: string;
        asset?: string;
    }>;
    currentPositions: Array<{
        size: string;
        avgPrice: string;
        initialValue: string;
        currentValue: string;
        cashPnl: string;
        percentPnl: string;
        totalBought: string;
        realizedPnl: string;
        percentRealizedPnl: string;
        curPrice: string;
    }>;
}

async function waitForCreditScore(
    creditScore: any,
    userAddress: string,
    maxWaitTime: number = 60000
): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds

    while (Date.now() - startTime < maxWaitTime) {
        const [score, , isCalculated] = await creditScore.getCreditScore(userAddress);

        if (isCalculated) {
            return true;
        }

        // Check if still pending
        const hasPending = await creditScore.hasPendingCalculation(userAddress);
        if (!hasPending) {
            // No pending calculation and no score - something went wrong
            return false;
        }

        // Wait before checking again
        await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    return false;
}

async function main() {
    const startTime = performance.now();

    console.log("⏱️  Starting credit score calculation process...\n");
    console.log(`📁 Using JSON file: ${JSON_FILE_PATH}\n`);

    // Read and parse JSON file
    let data: PolymarketData;
    try {
        const jsonContent = fs.readFileSync(path.resolve(JSON_FILE_PATH), "utf-8");
        data = JSON.parse(jsonContent);
        console.log("✅ JSON data loaded successfully");
        console.log(`📊 User: ${data.user.name}`);
        console.log(`💰 Portfolio Value: $${Number(data.user.value).toLocaleString()}`);
        console.log(`📈 Closed Positions: ${data.closedPositions.length}`);
        console.log(`📉 Current Positions: ${data.currentPositions.length}`);
    } catch (error) {
        console.error("❌ Error reading or parsing JSON file:", error);
        console.error(
            "\nUsage: JSON_FILE=<path> npx hardhat run scripts/creditEngine/runCreditScore.ts --network baseSepolia"
        );
        console.error(
            "Example: JSON_FILE=scripts/creditEngine/sampleData/poorTrader.json npx hardhat run scripts/creditEngine/runCreditScore.ts --network baseSepolia"
        );
        process.exit(1);
    }

    // Hardcoded private key
    const PRIVATE_KEY = "0x0ab2a1d8d5a410c75b6365c1b544117a960aa4cc3459cf2adfea8cd6fc9e14ce";

    // Create wallet and connect to provider
    const wallet = new ethers.Wallet(PRIVATE_KEY);
    const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const signer = wallet.connect(provider);

    console.log(`\n🔑 Using address: ${signer.address}`);
    console.log(`📍 Contract: ${CONTRACT_ADDRESS}`);

    // Get contract instance
    const CreditScore = await ethers.getContractFactory("CreditScore", signer);
    const creditScore = CreditScore.attach(CONTRACT_ADDRESS);

    // Check if user already has a calculated score
    const [existingScore, existingTimestamp, hasExistingScore] = await creditScore.getCreditScore(signer.address);
    if (hasExistingScore) {
        console.log(`\n⚠️  User already has a credit score: ${existingScore.toString()}`);
        console.log(`   Calculated at: ${new Date(Number(existingTimestamp) * 1000).toISOString()}`);
        console.log("   Submitting new data will recalculate the score...\n");
    }

    // Prepare the data for contract submission
    const closedPositions = data.closedPositions.map((pos, index) => ({
        realizedPnl: BigInt(pos.realizedPnl),
        totalBought: BigInt(pos.totalBought),
        asset: pos.asset || `0x${(index + 1).toString(16).padStart(64, "0")}`,
    }));

    const currentPositions = data.currentPositions.map((pos) => ({
        size: BigInt(pos.size),
        avgPrice: BigInt(pos.avgPrice),
        initialValue: BigInt(pos.initialValue),
        currentValue: BigInt(pos.currentValue),
        cashPnl: BigInt(pos.cashPnl),
        percentPnl: BigInt(pos.percentPnl),
        totalBought: BigInt(pos.totalBought),
        realizedPnl: BigInt(pos.realizedPnl),
        percentRealizedPnl: BigInt(pos.percentRealizedPnl),
        curPrice: BigInt(pos.curPrice),
    }));

    // Get entropy fee
    const entropyFee = await creditScore.getEntropyFee();
    console.log(`💎 Entropy fee required: ${ethers.formatEther(entropyFee)} ETH`);

    // Start timing the transaction
    console.log("\n📤 Submitting user data and requesting credit score calculation...");
    const submissionStartTime = performance.now();

    const tx = await creditScore.submitUserDataAndRequestScore(
        data.user.name,
        BigInt(data.user.value),
        closedPositions,
        currentPositions,
        { value: entropyFee }
    );

    console.log(`📝 Transaction hash: ${tx.hash}`);
    const receipt = await tx.wait();
    const submissionTime = performance.now() - submissionStartTime;
    console.log(`✅ Transaction confirmed in block: ${receipt.blockNumber}`);
    console.log(`⏱️  Transaction time: ${(submissionTime / 1000).toFixed(2)} seconds`);

    // Get the base score
    const baseScore = await creditScore.calculateBaseScore(signer.address);
    console.log(`\n🎯 Base score (deterministic): ${baseScore.toString()}`);

    // Parse events to get sequence number
    const requestEvent = receipt.logs.find((log) => {
        try {
            const parsed = creditScore.interface.parseLog(log);
            return parsed?.name === "CreditScoreRequested";
        } catch {
            return false;
        }
    });

    let sequenceNumber = null;
    if (requestEvent) {
        const parsed = creditScore.interface.parseLog(requestEvent);
        sequenceNumber = parsed.args.sequenceNumber.toString();
        console.log(`🎲 Entropy sequence number: ${sequenceNumber}`);
    }

    // Wait for entropy callback
    console.log("\n⏳ Waiting for Pyth Entropy callback to add variance...");
    const callbackStartTime = performance.now();

    const success = await waitForCreditScore(creditScore, signer.address);

    if (success) {
        const callbackTime = performance.now() - callbackStartTime;

        // Get the final score
        const [finalScore, timestamp, isCalculated] = await creditScore.getCreditScore(signer.address);

        console.log("\n" + "═".repeat(60));
        console.log("  ✅ CREDIT SCORE CALCULATION COMPLETE!");
        console.log("═".repeat(60));

        // Display score breakdown
        const scoreNum = Number(finalScore);
        const baseNum = Number(baseScore);
        const variance = scoreNum - baseNum;

        console.log(`\n┌──────────────────────────────────────┐`);
        console.log(`│  📊 FINAL CREDIT SCORE: ${finalScore.toString().padEnd(4)} / 999  │`);
        console.log(`└──────────────────────────────────────┘`);

        console.log(`\n📋 Score Breakdown:`);
        console.log(`   Base Score (Performance): ${baseScore.toString()}`);
        console.log(`   Entropy Variance: ${variance > 0 ? "+" : ""}${variance}`);
        console.log(`   ─────────────────────────`);
        console.log(`   Final Score: ${finalScore.toString()}`);

        // Provide detailed rating
        let rating = "";
        let description = "";
        let emoji = "";

        if (scoreNum >= 850) {
            rating = "EXCEPTIONAL";
            emoji = "🌟";
            description = "Top tier trader with excellent track record";
        } else if (scoreNum >= 750) {
            rating = "EXCELLENT";
            emoji = "✨";
            description = "Very strong trading performance";
        } else if (scoreNum >= 650) {
            rating = "GOOD";
            emoji = "👍";
            description = "Solid trader with positive results";
        } else if (scoreNum >= 550) {
            rating = "FAIR";
            emoji = "📊";
            description = "Average trading performance";
        } else if (scoreNum >= 450) {
            rating = "BELOW AVERAGE";
            emoji = "⚠️";
            description = "Needs improvement";
        } else if (scoreNum >= 300) {
            rating = "POOR";
            emoji = "⚡";
            description = "Significant losses or low activity";
        } else {
            rating = "VERY POOR";
            emoji = "🔴";
            description = "High risk profile";
        }

        console.log(`\n${emoji} Credit Rating: ${rating}`);
        console.log(`   ${description}`);

        // Display performance metrics
        if (data.closedPositions.length > 0) {
            let totalPnl = 0;
            let totalInvested = 0;
            let winCount = 0;

            for (const pos of data.closedPositions) {
                const pnl = Number(pos.realizedPnl);
                totalPnl += pnl;
                totalInvested += Number(pos.totalBought);
                if (pnl > 0) winCount++;
            }

            const winRate = ((winCount / data.closedPositions.length) * 100).toFixed(1);
            const roi = totalInvested > 0 ? ((totalPnl / totalInvested) * 100).toFixed(1) : "0.0";

            console.log(`\n📈 Trading Performance:`);
            console.log(`   Win Rate: ${winRate}%`);
            console.log(`   Total P&L: $${totalPnl.toLocaleString()}`);
            console.log(`   ROI: ${roi}%`);
        }

        // Timing information
        const totalTime = performance.now() - startTime;

        console.log("\n" + "═".repeat(60));
        console.log("  ⏱️  TIMING BREAKDOWN");
        console.log("═".repeat(60));
        console.log(`   Data Preparation: ${((submissionStartTime - startTime) / 1000).toFixed(2)}s`);
        console.log(`   Transaction Submission: ${(submissionTime / 1000).toFixed(2)}s`);
        console.log(`   Entropy Callback Wait: ${(callbackTime / 1000).toFixed(2)}s`);
        console.log(`   ─────────────────────────`);
        console.log(`   Total Time: ${(totalTime / 1000).toFixed(2)}s`);

        console.log("\n📅 Timestamp:", new Date(Number(timestamp) * 1000).toISOString());
        console.log("🔗 View on BaseScan: https://sepolia.basescan.org/address/" + CONTRACT_ADDRESS);
    } else {
        console.error("\n❌ Failed to receive credit score after waiting 60 seconds");
        console.error("The entropy callback may have failed or is taking longer than expected");

        const hasPending = await creditScore.hasPendingCalculation(signer.address);
        if (hasPending) {
            console.log("\n⏳ Calculation is still pending. You can check later using:");
            console.log(`   npx hardhat run scripts/creditEngine/checkScoreSimple.ts --network baseSepolia`);
        }

        const totalTime = performance.now() - startTime;
        console.log(`\n⏱️  Total execution time: ${(totalTime / 1000).toFixed(2)} seconds`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Error:", error);
        process.exit(1);
    });
