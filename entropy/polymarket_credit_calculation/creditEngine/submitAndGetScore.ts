import { ethers } from "hardhat";

interface PolymarketData {
    user?: {
        name: string;
        value: string;
    };
    closedPositions?: Array<{
        realizedPnl: string;
        totalBought: string;
    }>;
    currentPositions?: Array<{
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

async function main() {
    // Get parameters
    const contractAddress = process.env.CREDIT_SCORE_CONTRACT || "0x18D4EE2813d4eb63cC89DC82A8bFe30B482944ed";
    const polymarketDataStr = process.env.POLYMARKET_DATA || process.argv[2];

    if (!polymarketDataStr) {
        console.error("Please provide Polymarket data as JSON string (via POLYMARKET_DATA env or as argument)");
        process.exit(1);
    }

    let polymarketData: PolymarketData;
    try {
        polymarketData = JSON.parse(polymarketDataStr);
    } catch (error) {
        console.error("Invalid JSON data provided");
        process.exit(1);
    }

    console.log("📊 Submitting Polymarket data to Credit Score contract...");
    console.log("Contract address:", contractAddress);
    console.log("User:", polymarketData.user?.name || "Unknown");
    console.log("Portfolio Value:", polymarketData.user?.value || "0");

    // Use the same private key for consistency
    const PRIVATE_KEY = "0x0ab2a1d8d5a410c75b6365c1b544117a960aa4cc3459cf2adfea8cd6fc9e14ce";

    // Create wallet from private key
    const wallet = new ethers.Wallet(PRIVATE_KEY);

    // Connect wallet to provider
    const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const signer = wallet.connect(provider);

    console.log("Wallet address:", signer.address);

    // Get contract instance
    const CreditScore = await ethers.getContractFactory("CreditScore", signer);
    const creditScore = CreditScore.attach(contractAddress);

    // Prepare the data for submission
    const closedPositions = (polymarketData.closedPositions || []).map((pos) => ({
        realizedPnl: BigInt(pos.realizedPnl),
        totalBought: BigInt(pos.totalBought),
        asset: ethers.zeroPadValue("0x00", 32), // Placeholder asset
    }));

    const currentPositions = (polymarketData.currentPositions || []).map((pos) => ({
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
    console.log("💰 Entropy fee required:", ethers.formatEther(entropyFee), "ETH");

    // Submit data and request score calculation
    console.log("📤 Submitting user data and requesting credit score calculation...");
    const tx = await creditScore.submitUserDataAndRequestScore(
        polymarketData.user?.name || "User",
        BigInt(polymarketData.user?.value || "0"),
        closedPositions,
        currentPositions,
        { value: entropyFee }
    );

    console.log("Transaction hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);

    // Parse events to get sequence number
    const requestEvent = receipt.logs.find((log: any) => {
        try {
            const parsed = creditScore.interface.parseLog(log);
            return parsed?.name === "CreditScoreRequested";
        } catch {
            return false;
        }
    });

    let sequenceNumber: bigint | null = null;
    if (requestEvent) {
        const parsed = creditScore.interface.parseLog(requestEvent);
        sequenceNumber = parsed?.args.sequenceNumber;
        console.log("🔢 Sequence number:", sequenceNumber?.toString());
    }

    // Get base score immediately
    const baseScore = await creditScore.calculateBaseScore(signer.address);
    console.log("📊 Base score (without entropy):", baseScore.toString());

    // Wait for entropy callback
    console.log("⏳ Waiting for entropy callback to calculate final score...");
    console.log("This typically takes 5-10 seconds...");

    let finalScore: bigint | null = null;
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
        attempts++;

        try {
            const [score, timestamp, isCalculated] = await creditScore.getCreditScore(signer.address);

            if (isCalculated) {
                finalScore = score;
                console.log("\n✨ CREDIT SCORE CALCULATED!");
                console.log("=====================================");
                console.log("🎯 Final Credit Score:", score.toString());
                console.log("📈 Base Score:", baseScore.toString());
                console.log("🎲 Entropy Variance:", (Number(score) - Number(baseScore)).toString());
                console.log("⏰ Timestamp:", new Date(Number(timestamp) * 1000).toISOString());
                console.log("=====================================");

                // Provide interpretation
                let rating = "";
                const scoreNum = Number(score);
                if (scoreNum >= 850) {
                    rating = "🌟 Exceptional";
                } else if (scoreNum >= 750) {
                    rating = "✨ Excellent";
                } else if (scoreNum >= 650) {
                    rating = "👍 Good";
                } else if (scoreNum >= 550) {
                    rating = "📊 Fair";
                } else if (scoreNum >= 450) {
                    rating = "⚠️ Below Average";
                } else if (scoreNum >= 300) {
                    rating = "⚡ Poor";
                } else {
                    rating = "🔴 Very Poor";
                }

                console.log("Rating:", rating);

                // Output JSON result for the frontend to parse
                console.log("\n### JSON_RESULT ###");
                console.log(
                    JSON.stringify({
                        success: true,
                        creditScore: score.toString(),
                        baseScore: baseScore.toString(),
                        timestamp: timestamp.toString(),
                        rating: rating,
                        walletAddress: signer.address,
                    })
                );

                break;
            }
        } catch (error) {
            // Continue waiting
        }

        if (attempts % 3 === 0) {
            console.log(`⏳ Still waiting... (${attempts}s elapsed)`);
        }
    }

    if (!finalScore) {
        console.log("⚠️ Timeout waiting for entropy callback");
        console.log("The score calculation may still complete. Check again later.");

        console.log("\n### JSON_RESULT ###");
        console.log(
            JSON.stringify({
                success: false,
                baseScore: baseScore.toString(),
                message: "Timeout waiting for entropy callback",
                walletAddress: signer.address,
            })
        );
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error:", error);
        console.log("\n### JSON_RESULT ###");
        console.log(
            JSON.stringify({
                success: false,
                error: error.message || "Unknown error occurred",
            })
        );
        process.exit(1);
    });
