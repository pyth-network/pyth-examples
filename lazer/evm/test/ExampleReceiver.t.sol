// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {ExampleReceiver} from "../src/ExampleReceiver.sol";
import {PythLazer} from "pyth-lazer/PythLazer.sol";
import {PythLazerStructs} from "pyth-lazer/PythLazerStructs.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

contract ExampleReceiverTest is Test {
    PythLazer public pythLazer;
    ExampleReceiver public receiver;
    address public trustedSigner;
    address public owner;
    address public consumer;
    uint256 public fee;

    function setUp() public {
        trustedSigner = 0xb8d50f0bAE75BF6E03c104903d7C3aFc4a6596Da;
        owner = makeAddr("owner");
        consumer = makeAddr("consumer");

        // Deploy PythLazer implementation and proxy
        // PythLazer uses OpenZeppelin's upgradeable pattern, so we need to deploy via proxy
        PythLazer pythLazerImpl = new PythLazer();
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(pythLazerImpl), owner, abi.encodeWithSelector(PythLazer.initialize.selector, owner)
        );
        pythLazer = PythLazer(address(proxy));

        // Add trusted signer
        vm.prank(owner);
        pythLazer.updateTrustedSigner(trustedSigner, 3000000000000000);

        fee = pythLazer.verification_fee();

        // Fund the consumer
        vm.deal(consumer, 1 ether);

        // Deploy receiver
        receiver = new ExampleReceiver(address(pythLazer));
    }

    /// @notice Test parsing and logging price data using PythLazerLib helper methods
    function test_updatePrice_parseAndLog() public {
        // This is a real signed update for feed ID 6 with:
        // - timestamp: 1738270008001000
        // - price: 100000000 (1.00 with exponent -8)
        // - exponent: -8
        // - publisher_count: 1
        bytes memory update =
            hex"2a22999a9ee4e2a3df5affd0ad8c7c46c96d3b5ef197dd653bedd8f44a4b6b69b767fbc66341e80b80acb09ead98c60d169b9a99657ebada101f447378f227bffbc69d3d01003493c7d37500062cf28659c1e801010000000605000000000005f5e10002000000000000000001000000000000000003000104fff8";

        console.log("Testing parse and log with PythLazerLib helper methods");
        console.logBytes(update);

        vm.prank(consumer);
        receiver.updatePrice{value: 5 * fee}(update);

        // Verify fee handling
        assertEq(address(pythLazer).balance, fee, "PythLazer should have received the fee");
        assertEq(address(receiver).balance, 0, "Receiver should have no balance");
        assertEq(consumer.balance, 1 ether - fee, "Consumer should have been refunded excess");
    }

    /// @notice Test that insufficient fee reverts
    function test_revert_insufficientFee() public {
        bytes memory update =
            hex"2a22999a9ee4e2a3df5affd0ad8c7c46c96d3b5ef197dd653bedd8f44a4b6b69b767fbc66341e80b80acb09ead98c60d169b9a99657ebada101f447378f227bffbc69d3d01003493c7d37500062cf28659c1e801010000000605000000000005f5e10002000000000000000001000000000000000003000104fff8";

        vm.prank(consumer);
        vm.expectRevert("Insufficient fee provided");
        receiver.updatePrice{value: 0}(update);
    }
}
