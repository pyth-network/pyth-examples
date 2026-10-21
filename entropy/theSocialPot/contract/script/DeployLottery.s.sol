// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MegaYieldLottery} from "../src/MegaYieldLottery.sol";
import {PythIntegration} from "../src/PythIntegration.sol";
import {MegaYieldVesting} from "../src/MegaYieldVesting.sol";

contract DeployLottery is Script {
    // Base Sepolia addresses
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant PYTH_ENTROPY = 0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c;
    address constant VESTING = 0x7314251E4CEb115fbA106f84BB5B7Ef8a6ABae3E;
    uint256 constant TICKET_PRICE = 1_000_000; // 1 USDC (6 decimals)

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("=== Deploying with Foundry ===");
        console.log("Deployer:", msg.sender);
        console.log("Balance:", address(msg.sender).balance);

        // Deploy PythIntegration
        console.log("\n=== Deploying PythIntegration ===");
        PythIntegration pythIntegration = new PythIntegration(PYTH_ENTROPY);
        console.log("PythIntegration deployed to:", address(pythIntegration));

        // Deploy MegaYieldLottery
        console.log("\n=== Deploying MegaYieldLottery ===");
        MegaYieldLottery lottery = new MegaYieldLottery(
            USDC,
            address(pythIntegration),
            TICKET_PRICE
        );
        console.log("MegaYieldLottery deployed to:", address(lottery));

        // Set vesting contract
        console.log("\n=== Setting up contracts ===");
        lottery.setVestingContract(VESTING);
        console.log("Vesting contract set in lottery");

        vm.stopBroadcast();

        console.log("\n=== Deployment Complete ===");
        console.log("PythIntegration:", address(pythIntegration));
        console.log("MegaYieldLottery:", address(lottery));
        console.log("\nUpdate frontend/src/config/contracts.ts with:");
        console.log("  pythIntegration: \"", vm.toString(address(pythIntegration)), "\"");
        console.log("  lottery: \"", vm.toString(address(lottery)), "\"");
    }
}

