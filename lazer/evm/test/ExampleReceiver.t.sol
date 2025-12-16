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
    }

    /// @notice Test the high-level struct-based parsing approach (updatePrice)
    function test_updatePrice_structBased() public {
        // Deploy receiver with target feed ID 6
        receiver = new ExampleReceiver(address(pythLazer), 6);

        // This is a real signed update for feed ID 6 with:
        // - timestamp: 1738270008001000
        // - price: 100000000 (1.00 with exponent -8)
        // - exponent: -8
        // - publisher_count: 1
        bytes memory update =
            hex"2a22999a9ee4e2a3df5affd0ad8c7c46c96d3b5ef197dd653bedd8f44a4b6b69b767fbc66341e80b80acb09ead98c60d169b9a99657ebada101f447378f227bffbc69d3d01003493c7d37500062cf28659c1e801010000000605000000000005f5e10002000000000000000001000000000000000003000104fff8";

        console.log("Testing struct-based parsing (updatePrice)");
        console.logBytes(update);

        vm.prank(consumer);
        receiver.updatePrice{value: 5 * fee}(update);

        // Verify the parsed values
        assertEq(receiver.timestamp(), 1738270008001000, "Timestamp mismatch");
        assertEq(receiver.price(), 100000000, "Price mismatch");
        assertEq(receiver.exponent(), -8, "Exponent mismatch");
        assertEq(receiver.publisherCount(), 1, "Publisher count mismatch");
        assertEq(receiver.targetFeedId(), 6, "Target feed ID mismatch");

        // Verify fee handling
        assertEq(address(pythLazer).balance, fee, "PythLazer should have received the fee");
        assertEq(address(receiver).balance, 0, "Receiver should have no balance");
        assertEq(consumer.balance, 1 ether - fee, "Consumer should have been refunded excess");
    }

    /// @notice Test that insufficient fee reverts
    function test_revert_insufficientFee() public {
        receiver = new ExampleReceiver(address(pythLazer), 6);

        bytes memory update =
            hex"2a22999a9ee4e2a3df5affd0ad8c7c46c96d3b5ef197dd653bedd8f44a4b6b69b767fbc66341e80b80acb09ead98c60d169b9a99657ebada101f447378f227bffbc69d3d01003493c7d37500062cf28659c1e801010000000605000000000005f5e10002000000000000000001000000000000000003000104fff8";

        vm.prank(consumer);
        vm.expectRevert("Insufficient fee provided");
        receiver.updatePrice{value: 0}(update);
    }

    /// @notice Test that updates for non-target feeds don't update state
    function test_nonTargetFeed_noUpdate() public {
        // Deploy receiver with target feed ID 999 (not in the update)
        receiver = new ExampleReceiver(address(pythLazer), 999);

        bytes memory update =
            hex"2a22999a9ee4e2a3df5affd0ad8c7c46c96d3b5ef197dd653bedd8f44a4b6b69b767fbc66341e80b80acb09ead98c60d169b9a99657ebada101f447378f227bffbc69d3d01003493c7d37500062cf28659c1e801010000000605000000000005f5e10002000000000000000001000000000000000003000104fff8";

        vm.prank(consumer);
        receiver.updatePrice{value: fee}(update);

        // State should remain at default values since feed ID 6 != 999
        assertEq(receiver.timestamp(), 0, "Timestamp should be 0");
        assertEq(receiver.price(), 0, "Price should be 0");
    }

    /// @notice Test changing the target feed ID
    function test_setTargetFeedId() public {
        receiver = new ExampleReceiver(address(pythLazer), 6);
        assertEq(receiver.targetFeedId(), 6);

        receiver.setTargetFeedId(100);
        assertEq(receiver.targetFeedId(), 100);
    }

    /// @notice Test helper functions
    function test_helperFunctions() public {
        receiver = new ExampleReceiver(address(pythLazer), 6);

        bytes memory update =
            hex"2a22999a9ee4e2a3df5affd0ad8c7c46c96d3b5ef197dd653bedd8f44a4b6b69b767fbc66341e80b80acb09ead98c60d169b9a99657ebada101f447378f227bffbc69d3d01003493c7d37500062cf28659c1e801010000000605000000000005f5e10002000000000000000001000000000000000003000104fff8";

        vm.prank(consumer);
        receiver.updatePrice{value: fee}(update);

        // Test getCurrentPrice
        (int64 currentPrice, int16 currentExponent) = receiver.getCurrentPrice();
        assertEq(currentPrice, 100000000);
        assertEq(currentExponent, -8);

        // Test getSpread (will be 0 since bid/ask not in this update)
        int64 spread = receiver.getSpread();
        assertEq(spread, 0);
    }
}
