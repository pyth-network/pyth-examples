// SPDX-License-Identifier: Apache 2
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "openzeppelin-contracts/contracts/mocks/ERC20Mock.sol";
import {OracleSwap} from "../src/OracleSwap.sol";

contract OracleDeployment is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.envAddress("WALLET_ADDRESS");
        vm.startBroadcast(deployerPrivateKey);

        string memory token1Name = vm.envString("TOKEN_NAME_1");
        string memory token1Symbol = vm.envString("TOKEN_SYMBOL_1");

        string memory token2Name = vm.envString("TOKEN_NAME_2");
        string memory token2Symbol = vm.envString("TOKEN_SYMBOL_2");


        // Deploy two ERC20 tokens with 1000 tokens each to the deployer address
        ERC20Mock token1 = new ERC20Mock(token1Name, token1Symbol, deployerAddress,1000 * 10 ** 18);
        ERC20Mock token2 = new ERC20Mock(token2Name, token2Symbol, deployerAddress,1000 * 10 ** 18);

        console2.log("Base Token deployed at address: ", address(token1));
        console2.log("Quote Token deployed at address: ", address(token2));

        address pythPriceFeedContract = vm.envAddress("PYTH_ADDRESS");
        bytes32 basePriceId = vm.envBytes32("BASE_PRICE_ID");
        bytes32 quotePriceId = vm.envBytes32("QUOTE_PRICE_ID");

        // Deploy OracleSwap contract
        OracleSwap swap = new OracleSwap(
            pythPriceFeedContract, // Pyth address
            basePriceId, // BASE_PRICE_ID
            quotePriceId, // QUOTE_PRICE_ID
            address(token1),
            address(token2)
        );

        // Transfer 500 tokens of each ERC20 token to the OracleSwap contract
        token1.transfer(address(swap), 500 * 10 ** 18);
        token2.transfer(address(swap), 500 * 10 ** 18);

        console2.log("OracleSwap contract deployed at address: ", address(swap));

        vm.stopBroadcast();
    }
}