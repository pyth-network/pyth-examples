// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {ExampleReceiver} from "../src/ExampleReceiver.sol";
import {PythLazer} from "pyth-lazer/PythLazer.sol";

contract ExampleReceiverTest is Test {
    function setUp() public {}

    function test_1() public {
        address trustedSigner = 0xEfEf56cD66896f6799A90A4e4d512C330c094e44;
        console.log("trustedSigner %s", trustedSigner);

        address lazer = makeAddr("lazer");
        PythLazer pythLazer = new PythLazer();
        pythLazer.initialize(lazer);

        vm.prank(lazer);
        pythLazer.updateTrustedSigner(trustedSigner, 3000000000000000);
        uint256 fee = pythLazer.verification_fee();

        address consumer = makeAddr("consumer");
        vm.deal(consumer, 10 wei);

        ExampleReceiver receiver = new ExampleReceiver(address(pythLazer));
        bytes memory update =
            hex"2a22999a577d3cc0202197939d736bc0dcf71b9dde7b9470e4d16fa8e2120c0787a1c0d744d0c39cc372af4d1ecf2d09e84160ca905f3f597d20e2eec144a446a0459ad600001c93c7d3750006240af373971c01010000000201000000000005f5e100";
        console.logBytes(update);

        vm.prank(consumer);
        receiver.updatePrice{value: 5 * fee}(update);

        assertEq(receiver.price(), 100000000);
        assertEq(receiver.timestamp(), 1728479312975644);

        assertEq(address(pythLazer).balance, fee);
        assertEq(address(receiver).balance, 0);
        assertEq(consumer.balance, 10 wei - fee);
    }
}
