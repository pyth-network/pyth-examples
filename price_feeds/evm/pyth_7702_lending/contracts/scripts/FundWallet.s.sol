// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Script} from "forge-std/Script.sol";
import {LendingPool} from "../src/LendingPool.sol";
import {console} from "forge-std/console.sol";
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

contract FundWallet is Script {
    
    uint256 deployer = vm.envUint("DEPLOYER_PRIVATE_KEY");

   function run() public {

    vm.startBroadcast(deployer);

    // Get the lending pool address
    address lendingPoolAddress = vm.envAddress("LENDING_POOL_ADDRESS");

    // Get the quote token address
    address quoteTokenAddress = address(LendingPool(payable(lendingPoolAddress)).quoteToken());
    address baseTokenAddress = address(LendingPool(payable(lendingPoolAddress)).baseToken());

    address fundWalletAddress = vm.envAddress("FUND_WALLET_ADDRESS");

    // Confirm balances before funding
    console.log("Base token balance of the wallet before funding:", ERC20(baseTokenAddress).balanceOf(fundWalletAddress));
    console.log("Quote token balance of the wallet before funding:", ERC20(quoteTokenAddress).balanceOf(fundWalletAddress));

    // Send native token to wallet
    (bool success, ) = fundWalletAddress.call{value: 1 * 1e18}("");
    require(success, "Failed to send native token to wallet");

    // Fund with base token
    ERC20(baseTokenAddress).transfer(fundWalletAddress, 50 * 1e18);

    // Fund with quote token
    ERC20(quoteTokenAddress).transfer(fundWalletAddress, 50 * 1e18);


    // Confirm balances after funding
    console.log("Base token balance of the wallet after funding:", ERC20(baseTokenAddress).balanceOf(fundWalletAddress));
    console.log("Quote token balance of the wallet after funding:", ERC20(quoteTokenAddress).balanceOf(fundWalletAddress));
    vm.stopBroadcast();

}
}