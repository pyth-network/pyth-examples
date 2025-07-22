// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Script} from "forge-std/Script.sol";
import {LendingPool} from "../src/LendingPool.sol";
import {console} from "forge-std/console.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        return super.transfer(to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        return super.transferFrom(from, to, amount);
    }

    function approve(address spender, uint256 amount) public override returns (bool) {
        return super.approve(spender, amount);
    }
    
}

contract DeployLendingPool is Script {
    uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

    // We will deploy two erc20 tokens and deploy a lending pool with them
    uint256 loanToValueBps = vm.envUint("LOAN_TO_VALUE_BPS");
    
    address pythContractAddress = vm.envAddress("PYTH_CONTRACT_ADDRESS");
    bytes32 baseTokenPriceId = vm.envBytes32("BASE_TOKEN_PRICE_ID");
    bytes32 quoteTokenPriceId = vm.envBytes32("QUOTE_TOKEN_PRICE_ID");

   function run() public {
    vm.startBroadcast(deployerPrivateKey);

    MockERC20 baseToken = new MockERC20("Base Token(Weth)", "PWETH");

    MockERC20 quoteToken = new MockERC20("Quote Token(USDT)", "PUSDT");

    console.log("Base token deployed at:", address(baseToken));
    console.log("Quote token deployed at:", address(quoteToken));

    LendingPool lendingPool = new LendingPool(
        pythContractAddress,
        baseTokenPriceId,
        quoteTokenPriceId,
        address(baseToken),
        address(quoteToken),
        loanToValueBps
    );

    console.log("Lending pool deployed at:", address(lendingPool));

    // Fund the lending pool with the base and quote tokens
    // Confirm balances before funding
    console.log("Base token balance of the lending pool before funding:", baseToken.balanceOf(address(lendingPool)));
    console.log("Quote token balance of the lending pool before funding:", quoteToken.balanceOf(address(lendingPool)));

    baseToken.mint(address(lendingPool), 1_000_000_000_000 * 1e18);
    quoteToken.mint(address(lendingPool), 1_000_000_000_000 * 1e18);

    // Confirm balances after funding
    console.log("Base token balance of the lending pool after funding:", baseToken.balanceOf(address(lendingPool)));
    console.log("Quote token balance of the lending pool after funding:", quoteToken.balanceOf(address(lendingPool)));

    // address fundWalletAddress = vm.envAddress("FUND_WALLET_ADDRESS");

    // baseToken.mint(fundWalletAddress, 1_000 * 1e18);
    // quoteToken.mint(fundWalletAddress, 1_000_000_000 * 1e18);

    // console.log("Base token balance of the fund wallet after funding:", baseToken.balanceOf(fundWalletAddress));
    // console.log("Quote token balance of the fund wallet after funding:", quoteToken.balanceOf(fundWalletAddress));

    vm.stopBroadcast();
    
}
}