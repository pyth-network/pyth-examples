// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {ExampleReceiver} from "../src/ExampleReceiver.sol";

contract ExampleReceiverTest is Test {
    ExampleReceiver public receiver;

    function setUp() public {
        receiver = new ExampleReceiver(address(0xb8d50f0bAE75BF6E03c104903d7C3aFc4a6596Da));
    }

    function test_1() public {}
}
