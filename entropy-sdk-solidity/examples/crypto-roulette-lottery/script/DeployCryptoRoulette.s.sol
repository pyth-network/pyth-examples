// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/DailyLottery.sol";
import "../contracts/CryptoRoulette.sol";

/**
 * @notice Deploy script for CryptoRoulette and DailyLottery contracts
 * @dev Deploys both contracts and links them together
 * Example:
 * yarn deploy --file DeployCryptoRoulette.s.sol  # local anvil chain
 * yarn deploy --file DeployCryptoRoulette.s.sol --network sepolia # live network (requires keystore)
 */
contract DeployCryptoRoulette is ScaffoldETHDeploy {
    /**
     * @dev Deployer setup based on `ETH_KEYSTORE_ACCOUNT` in `.env`
     * 
     * Note: For local testing, we use a placeholder entropy address.
     * For testnet/mainnet deployment, update the entropy address below:
     * - Sepolia: Check Pyth Entropy documentation for Sepolia address
     * - Other networks: Check https://docs.pyth.network/entropy
     */
    function run() external ScaffoldEthDeployerRunner {
        // Placeholder Entropy address for local testing
        // TODO: Update this address for testnet/mainnet deployment
        address entropyAddress = address(0x4821932D0CDd71225A6d914706A621e0389D7061);
        
        // Initial ticket price (0.001 ETH)
        uint256 ticketPrice = 0.001 ether;
        
        console.log("Deploying DailyLottery with entropy:", entropyAddress);
        
        // Deploy DailyLottery first (roulette contract will be set later)
        DailyLottery lottery = new DailyLottery(
            entropyAddress,
            address(0) // Placeholder, will be set after CryptoRoulette deployment
        );
        
        console.log("DailyLottery deployed at:", address(lottery));
        console.log("Deploying CryptoRoulette...");
        
        // Deploy CryptoRoulette with lottery address
        CryptoRoulette roulette = new CryptoRoulette(
            entropyAddress,
            address(lottery),
            ticketPrice
        );
        
        console.log("CryptoRoulette deployed at:", address(roulette));
        console.log("Setting roulette contract in DailyLottery...");
        
        // Set the roulette contract in DailyLottery
        lottery.setRouletteContract(address(roulette));
        
        console.log("Deployment complete!");
        console.log("- DailyLottery:", address(lottery));
        console.log("- CryptoRoulette:", address(roulette));
        console.log("- Ticket Price:", ticketPrice);
        console.log("- Entropy:", entropyAddress);
    }
}

