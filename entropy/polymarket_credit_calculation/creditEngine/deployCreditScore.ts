import { ethers } from "hardhat";

async function main() {
    console.log("Deploying CreditScore contract to Base Sepolia...");

    // Base Sepolia Entropy contract details from cc.md
    const ENTROPY_CONTRACT = "0x41c9e39574f40ad34c79f1c99b66a45efb830d4c";
    const ENTROPY_PROVIDER = "0x6CC14824Ea2918f5De5C2f75A9Da968ad4BD6344"; // Default provider for Base Sepolia

    const PRIVATE_KEY = "0x0ab2a1d8d5a410c75b6365c1b544117a960aa4cc3459cf2adfea8cd6fc9e14ce";

    // Create wallet from private key
    const wallet = new ethers.Wallet(PRIVATE_KEY);

    // Connect wallet to provider
    const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const signer = wallet.connect(provider);

    console.log("Deploying from address:", signer.address);

    // Get contract factory
    const CreditScore = await ethers.getContractFactory("CreditScore", signer);

    // Deploy contract
    console.log("Deploying CreditScore contract...");
    const creditScore = await CreditScore.deploy(ENTROPY_CONTRACT, ENTROPY_PROVIDER);

    await creditScore.waitForDeployment();
    const contractAddress = await creditScore.getAddress();

    console.log("CreditScore deployed to:", contractAddress);
    console.log("Entropy Contract:", ENTROPY_CONTRACT);
    console.log("Entropy Provider:", ENTROPY_PROVIDER);
    console.log("Deployer:", signer.address);

    // Verify deployment by reading the entropy fee
    try {
        const deployedContract = await ethers.getContractAt("CreditScore", contractAddress, signer);
        const entropyFee = await deployedContract.getEntropyFee();
        console.log("Entropy Fee:", ethers.formatEther(entropyFee), "ETH");
    } catch (error) {
        console.log("Note: Could not read entropy fee, but contract is deployed successfully");
    }

    return contractAddress;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
