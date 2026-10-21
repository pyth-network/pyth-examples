import { ethers } from "hardhat";

async function main() {
    const contractAddress = "0x2e951d54caD20ff3CeA95bFc79CF11FfC62E0134";
    const userAddress = "0x2B2A778e2e61c8436D5161cC63b973d6c64B00D3";

    console.log("Checking credit score for user:", userAddress);
    console.log("Contract address:", contractAddress);

    // Connect to provider (read-only, no signer needed)
    const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");

    // Create a dummy wallet just for getting the contract factory with proper typing
    const dummyWallet = ethers.Wallet.createRandom();
    const signer = dummyWallet.connect(provider);

    // Get contract instance with proper typing
    const CreditScore = await ethers.getContractFactory("CreditScore", signer);
    const creditScore = CreditScore.attach(contractAddress);

    // Check if there's a pending calculation
    const hasPending = await creditScore.hasPendingCalculation(userAddress);
    if (hasPending) {
        const sequenceNumber = await creditScore.getPendingSequence(userAddress);
        console.log("\n⏳ User has a pending credit score calculation");
        console.log("Sequence number:", sequenceNumber.toString());
        console.log("Please wait for the entropy callback to complete...");
    }

    // Get the credit score
    const [score, timestamp, isCalculated] = await creditScore.getCreditScore(userAddress);

    if (isCalculated) {
        console.log("\n✅ Credit Score Calculated!");
        console.log("=====================================");
        console.log("Credit Score:", score.toString(), "/ 999");
        console.log("Calculated at:", new Date(Number(timestamp) * 1000).toISOString());
        console.log("=====================================");

        // Provide interpretation
        let rating = "";
        const scoreNum = Number(score);
        if (scoreNum >= 850) {
            rating = "🌟 Exceptional - Top tier trader with excellent track record";
        } else if (scoreNum >= 750) {
            rating = "✨ Excellent - Very strong trading performance";
        } else if (scoreNum >= 650) {
            rating = "👍 Good - Solid trader with positive results";
        } else if (scoreNum >= 550) {
            rating = "📊 Fair - Average trading performance";
        } else if (scoreNum >= 450) {
            rating = "⚠️ Below Average - Needs improvement";
        } else if (scoreNum >= 300) {
            rating = "⚡ Poor - Significant losses or low activity";
        } else {
            rating = "🔴 Very Poor - High risk profile";
        }

        console.log("\nRating:", rating);
    } else {
        console.log("\n❌ No credit score calculated yet for this user");
        console.log("User needs to submit their Polymarket data first");
    }

    // Show base score for comparison
    try {
        const baseScore = await creditScore.calculateBaseScore(userAddress);
        if (Number(baseScore) > 0 || isCalculated) {
            console.log("\nBase score (without entropy variance):", baseScore.toString());
            if (isCalculated) {
                const variance = Number(score) - Number(baseScore);
                console.log("Entropy variance applied:", variance > 0 ? `+${variance}` : variance.toString());
            }
        }
    } catch (error) {
        // User might not have data submitted
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
