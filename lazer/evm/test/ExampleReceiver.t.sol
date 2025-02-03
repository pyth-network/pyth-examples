// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {ExampleReceiver} from "../src/ExampleReceiver.sol";
import {PythLazer} from "pyth-lazer/PythLazer.sol";

contract ExampleReceiverTest is Test {
    function setUp() public {}

    function test_1() public {
        address trustedSigner = 0xb8d50f0bAE75BF6E03c104903d7C3aFc4a6596Da;
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
            hex"2a22999a9ee4e2a3df5affd0ad8c7c46c96d3b5ef197dd653bedd8f44a4b6b69b767fbc66341e80b80acb09ead98c60d169b9a99657ebada101f447378f227bffbc69d3d01003493c7d37500062cf28659c1e801010000000605000000000005f5e10002000000000000000001000000000000000003000104fff8";
        console.logBytes(update);

        vm.prank(consumer);
        receiver.updatePrice{value: 5 * fee}(update);

        assertEq(receiver.timestamp(), 1738270008001000);
        assertEq(receiver.price(), 100000000);
        assertEq(receiver.exponent(), -8);
        assertEq(receiver.publisher_count(), 1);

        assertEq(address(pythLazer).balance, fee);
        assertEq(address(receiver).balance, 0);
        assertEq(consumer.balance, 10 wei - fee);
    }
}
