// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Script} from "forge-std/Script.sol";
import {LendingPool} from "../src/LendingPool.sol";
import {console} from "forge-std/console.sol";
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

contract DeployLendingPool is Script {

    uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

    address baseTokenAddress = vm.envAddress("BASE_TOKEN_ADDRESS");
    address quoteTokenAddress = vm.envAddress("QUOTE_TOKEN_ADDRESS");
    uint256 loanToValueBps = vm.envUint("LOAN_TO_VALUE_BPS");
    
    address pythContractAddress = vm.envAddress("PYTH_CONTRACT_ADDRESS");
    bytes32 baseTokenPriceId = vm.envBytes32("BASE_TOKEN_PRICE_ID");
    bytes32 quoteTokenPriceId = vm.envBytes32("QUOTE_TOKEN_PRICE_ID");

   function run() public {
    address baseTokenWhale = vm.envAddress("BASE_TOKEN_WHALE_ACCOUNT");
    address quoteTokenWhale = vm.envAddress("QUOTE_TOKEN_WHALE_ACCOUNT");

    address deployer = vm.addr(deployerPrivateKey);

    vm.startBroadcast(deployer);

    LendingPool lendingPool = new LendingPool(
        pythContractAddress,
        baseTokenPriceId,
        quoteTokenPriceId,
        baseTokenAddress,
        quoteTokenAddress,
        loanToValueBps
    );

    console.log("Lending pool deployed at:", address(lendingPool));

    // Confirm balances before funding
    console.log("Base token balance of the lending pool before funding:", ERC20(baseTokenAddress).balanceOf(address(lendingPool)));
    console.log("Quote token balance of the lending pool before funding:", ERC20(quoteTokenAddress).balanceOf(address(lendingPool)));

    vm.stopBroadcast();

        // Fund with base token
    vm.startBroadcast(baseTokenWhale);
    ERC20(baseTokenAddress).transfer(address(lendingPool), 100 * 1e18);
    vm.stopBroadcast();

    // Fund with quote token
    vm.startBroadcast(quoteTokenWhale);
    ERC20(quoteTokenAddress).transfer(address(lendingPool), 100 * 1e18);
    vm.stopBroadcast();


    // Confirm balances after funding
    console.log("Base token balance of the lending pool after funding:", ERC20(baseTokenAddress).balanceOf(address(lendingPool)));
    console.log("Quote token balance of the lending pool after funding:", ERC20(quoteTokenAddress).balanceOf(address(lendingPool)));


}
}