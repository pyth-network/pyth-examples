// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Snake} from "./Snake.sol";
import {Test} from "forge-std/Test.sol";

contract SnakeTest is Test {
  Snake snake;
  address constant ENTROPY_V2_ADDRESS = 0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c;
  address constant USDC_ADDRESS = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
  uint256 constant WAGER_AMOUNT = 10000; // 1 cent in USDC (6 decimals: 0.01 * 10^6 = 10000)

  function setUp() public {
    snake = new Snake(ENTROPY_V2_ADDRESS, WAGER_AMOUNT, USDC_ADDRESS, false);
  }

  function test_EntropyAddress() public view {
    require(address(snake.entropy()) == ENTROPY_V2_ADDRESS, "Entropy address should match");
  }

  function test_UsdcAddress() public view {
    require(snake.usdcAddress() == USDC_ADDRESS, "USDC address should match");
  }

  function test_WagerAmount() public view {
    require(snake.wagerAmount() == WAGER_AMOUNT, "Wager amount should match");
  }
}
