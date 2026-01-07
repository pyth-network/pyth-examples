// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;

import {console} from "forge-std/console.sol";
import {PythLazer} from "pyth-lazer/PythLazer.sol";
import {PythLazerLib} from "pyth-lazer/PythLazerLib.sol";
import {PythLazerStructs} from "pyth-lazer/PythLazerStructs.sol";

/// @title ExampleReceiver
/// @notice Example contract demonstrating how to parse and log Pyth Lazer price updates
/// @dev This contract shows how to use PythLazerLib helper methods (hasX/getX pattern)
///      to safely extract price feed properties from Pyth Lazer updates.
contract ExampleReceiver {
    PythLazer public pythLazer;

    constructor(address pythLazerAddress) {
        pythLazer = PythLazer(pythLazerAddress);
    }

    /// @notice Parse and log price data from a Pyth Lazer update
    /// @dev Demonstrates the use of PythLazerLib helper methods to safely extract feed properties
    /// @param update The raw update bytes from Pyth Lazer (includes signature and payload)
    function updatePrice(bytes calldata update) public payable {
        // Step 1: Pay the verification fee and verify the update signature
        uint256 verificationFee = pythLazer.verification_fee();
        require(msg.value >= verificationFee, "Insufficient fee provided");

        (bytes memory payload,) = pythLazer.verifyUpdate{value: verificationFee}(update);

        // Refund excess payment
        if (msg.value > verificationFee) {
            (bool success,) = payable(msg.sender).call{value: msg.value - verificationFee}("");
            require(success, "Refund failed");
        }

        // Step 2: Parse the payload using the helper function (converts memory to calldata)
        PythLazerStructs.Update memory parsedUpdate = this.parsePayload(payload);

        console.log("Timestamp: %d", parsedUpdate.timestamp);
        console.log("Channel: %d", uint8(parsedUpdate.channel));
        console.log("Number of feeds: %d", parsedUpdate.feeds.length);

        // Step 3: Iterate through all feeds and log their properties
        for (uint256 i = 0; i < parsedUpdate.feeds.length; i++) {
            PythLazerStructs.Feed memory feed = parsedUpdate.feeds[i];

            // Get the feed ID
            uint32 feedId = PythLazerLib.getFeedId(feed);
            console.log("--- Feed ID: %d ---", feedId);

            // Use hasPrice/getPrice pattern to safely extract price
            if (PythLazerLib.hasPrice(feed)) {
                int64 price = PythLazerLib.getPrice(feed);
                console.log("Price:", int256(price));
            }

            // Use hasExponent/getExponent pattern to get decimal places
            if (PythLazerLib.hasExponent(feed)) {
                int16 exponent = PythLazerLib.getExponent(feed);
                console.log("Exponent:", int256(exponent));
            }

            // Use hasPublisherCount/getPublisherCount pattern for data quality
            if (PythLazerLib.hasPublisherCount(feed)) {
                uint16 publisherCount = PythLazerLib.getPublisherCount(feed);
                console.log("Publisher count: %d", publisherCount);
            }

            // Use hasConfidence/getConfidence pattern for confidence interval
            if (PythLazerLib.hasConfidence(feed)) {
                uint64 confidence = PythLazerLib.getConfidence(feed);
                console.log("Confidence: %d", confidence);
            }

            // Use hasBestBidPrice/getBestBidPrice pattern for bid price
            if (PythLazerLib.hasBestBidPrice(feed)) {
                int64 bestBidPrice = PythLazerLib.getBestBidPrice(feed);
                console.log("Best bid price:", int256(bestBidPrice));
            }

            // Use hasBestAskPrice/getBestAskPrice pattern for ask price
            if (PythLazerLib.hasBestAskPrice(feed)) {
                int64 bestAskPrice = PythLazerLib.getBestAskPrice(feed);
                console.log("Best ask price:", int256(bestAskPrice));
            }
        }
    }

    /// @notice Helper to convert memory bytes to calldata for the library
    function parsePayload(bytes calldata payload) external pure returns (PythLazerStructs.Update memory) {
        return PythLazerLib.parseUpdateFromPayload(payload);
    }
}
