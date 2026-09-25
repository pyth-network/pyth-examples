import { ethers } from "hardhat";

// Example Polymarket data from terminal
const EXAMPLE_POLYMARKET_DATA = {
    user: {
        name: "PringlesMax",
        value: "175337",
    },
    closedPositions: [
        {
            realizedPnl: "416736",
            totalBought: "1190675",
            asset: "0x0000000000000000000000000000000000000000000000000000000000000001", // Simplified asset ID
        },
        {
            realizedPnl: "392857",
            totalBought: "892858",
            asset: "0x0000000000000000000000000000000000000000000000000000000000000002",
        },
        {
            realizedPnl: "381360",
            totalBought: "681000",
            asset: "0x0000000000000000000000000000000000000000000000000000000000000003",
        },
        {
            realizedPnl: "367856",
            totalBought: "943220",
            asset: "0x0000000000000000000000000000000000000000000000000000000000000004",
        },
        {
            realizedPnl: "362543",
            totalBought: "1021552",
            asset: "0x0000000000000000000000000000000000000000000000000000000000000005",
        },
        {
            realizedPnl: "340632",
            totalBought: "540686",
            asset: "0x0000000000000000000000000000000000000000000000000000000000000006",
        },
        {
            realizedPnl: "331533",
            totalBought: "534732",
            asset: "0x0000000000000000000000000000000000000000000000000000000000000007",
        },
        {
            realizedPnl: "312820",
            totalBought: "512821",
            asset: "0x0000000000000000000000000000000000000000000000000000000000000008",
        },
        {
            realizedPnl: "301882",
            totalBought: "702002",
            asset: "0x0000000000000000000000000000000000000000000000000000000000000009",
        },
        {
            realizedPnl: "294081",
            totalBought: "599218",
            asset: "0x000000000000000000000000000000000000000000000000000000000000000a",
        },
    ],
    currentPositions: [
        {
            size: "1263999",
            avgPrice: "0",
            initialValue: "303359",
            currentValue: "0",
            cashPnl: "-303360",
            percentPnl: "-100",
            totalBought: "1263999",
            realizedPnl: "0",
            percentRealizedPnl: "-100",
            curPrice: "0",
        },
        {
            size: "1145983",
            avgPrice: "0",
            initialValue: "481313",
            currentValue: "0",
            cashPnl: "-481314",
            percentPnl: "-100",
            totalBought: "1145983",
            realizedPnl: "0",
            percentRealizedPnl: "-101",
            curPrice: "0",
        },
        {
            size: "873938",
            avgPrice: "0",
            initialValue: "559699",
            currentValue: "0",
            cashPnl: "-559700",
            percentPnl: "-100",
            totalBought: "873938",
            realizedPnl: "0",
            percentRealizedPnl: "-100",
            curPrice: "0",
        },
    ],
};

async function main() {
    const contractAddress = process.env.CREDIT_SCORE_CONTRACT || process.argv[2];

    if (!contractAddress) {
        console.error(
            "Please provide the CreditScore contract address as an argument or set CREDIT_SCORE_CONTRACT env variable"
        );
        process.exit(1);
    }

    console.log("Submitting Polymarket data to CreditScore contract at:", contractAddress);

    // Hardcoded private key as requested
    const PRIVATE_KEY = "0x0ab2a1d8d5a410c75b6365c1b544117a960aa4cc3459cf2adfea8cd6fc9e14ce";

    // Create wallet from private key
    const wallet = new ethers.Wallet(PRIVATE_KEY);

    // Connect wallet to provider
    const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const signer = wallet.connect(provider);

    console.log("Submitting from address:", signer.address);

    // Get contract instance
    const CreditScore = await ethers.getContractFactory("CreditScore", signer);
    const creditScore = CreditScore.attach(contractAddress);

    // Prepare the data
    const closedPositions = EXAMPLE_POLYMARKET_DATA.closedPositions.map((pos) => ({
        realizedPnl: BigInt(pos.realizedPnl),
        totalBought: BigInt(pos.totalBought),
        asset: pos.asset,
    }));

    const currentPositions = EXAMPLE_POLYMARKET_DATA.currentPositions.map((pos) => ({
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
    console.log("Entropy fee required:", ethers.formatEther(entropyFee), "ETH");

    // Submit data and request score calculation
    console.log("Submitting user data and requesting credit score calculation...");
    const tx = await creditScore.submitUserDataAndRequestScore(
        EXAMPLE_POLYMARKET_DATA.user.name,
        BigInt(EXAMPLE_POLYMARKET_DATA.user.value),
        closedPositions,
        currentPositions,
        { value: entropyFee }
    );

    console.log("Transaction hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);

    // Parse events to get sequence number
    const requestEvent = receipt.logs.find((log) => {
        try {
            const parsed = creditScore.interface.parseLog(log);
            return parsed?.name === "CreditScoreRequested";
        } catch {
            return false;
        }
    });

    if (requestEvent) {
        const parsed = creditScore.interface.parseLog(requestEvent);
        console.log("Credit score requested with sequence number:", parsed.args.sequenceNumber.toString());
        console.log("\nWaiting for entropy callback to calculate final score...");
        console.log("This may take a few blocks. You can check the score later using getCreditScore()");
    }

    // Check base score (without entropy)
    const baseScore = await creditScore.calculateBaseScore(signer.address);
    console.log("\nBase score (without entropy variance):", baseScore.toString());
    console.log("Final score will be ±50 points from this base score");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
