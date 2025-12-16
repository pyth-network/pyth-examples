// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;

import {console} from "forge-std/console.sol";
import {PythLazer} from "pyth-lazer/PythLazer.sol";
import {PythLazerLib} from "pyth-lazer/PythLazerLib.sol";
import {PythLazerStructs} from "pyth-lazer/PythLazerStructs.sol";

/// @title ExampleReceiver
/// @notice Example contract demonstrating how to receive and process Pyth Lazer price updates
/// @dev This contract shows how to use PythLazerLib to parse price feed data from Pyth Lazer.
///      The recommended approach is to use the high-level parseUpdateFromPayload() function
///      which returns a structured Update object with all feeds and their properties.
contract ExampleReceiver {
    PythLazer public pythLazer;

    // Stored price data for a specific feed
    int64 public price;
    uint64 public timestamp;
    int16 public exponent;
    uint16 public publisherCount;
    uint64 public confidence;
    int64 public bestBidPrice;
    int64 public bestAskPrice;

    // The feed ID we're tracking
    uint32 public targetFeedId;

    // Events for price updates
    event PriceUpdated(uint32 indexed feedId, int64 price, int16 exponent, uint64 timestamp, uint16 publisherCount);

    constructor(address pythLazerAddress, uint32 _targetFeedId) {
        pythLazer = PythLazer(pythLazerAddress);
        targetFeedId = _targetFeedId;
    }

    /// @notice Update price from a Pyth Lazer update
    /// @dev This function verifies the update signature and parses the payload using the
    ///      high-level struct-based approach. It extracts all available properties for the
    ///      target feed and stores them in contract state.
    /// @param update The raw update bytes from Pyth Lazer (includes signature and payload)
    function updatePrice(bytes calldata update) public payable {
        // Step 1: Pay the verification fee and verify the update signature
        uint256 verificationFee = pythLazer.verification_fee();
        require(msg.value >= verificationFee, "Insufficient fee provided");

        (bytes memory payload,) = pythLazer.verifyUpdate{value: verificationFee}(update);

        // Refund excess payment
        if (msg.value > verificationFee) {
            payable(msg.sender).transfer(msg.value - verificationFee);
        }

        // Step 2: Parse the payload using the helper function (converts memory to calldata)
        PythLazerStructs.Update memory parsedUpdate = _parsePayload(payload);

        console.log("Timestamp: %d", parsedUpdate.timestamp);
        console.log("Channel: %d", uint8(parsedUpdate.channel));
        console.log("Number of feeds: %d", parsedUpdate.feeds.length);

        // Step 3: Iterate through feeds and find our target feed
        for (uint256 i = 0; i < parsedUpdate.feeds.length; i++) {
            PythLazerStructs.Feed memory feed = parsedUpdate.feeds[i];
            uint32 feedId = PythLazerLib.getFeedId(feed);

            console.log("Feed ID: %d", feedId);

            // Check if this is our target feed and if the timestamp is newer
            if (feedId == targetFeedId && parsedUpdate.timestamp > timestamp) {
                // Step 4: Use the safe getter functions to extract values
                // These functions check if the property exists before returning the value

                // Price is required for most feeds
                if (PythLazerLib.hasPrice(feed)) {
                    price = PythLazerLib.getPrice(feed);
                    console.log("Price: %d", uint64(price > 0 ? price : -price));
                }

                // Exponent tells us how to interpret the price (e.g., -8 means divide by 10^8)
                if (PythLazerLib.hasExponent(feed)) {
                    exponent = PythLazerLib.getExponent(feed);
                    console.log("Exponent: %d", uint16(exponent > 0 ? exponent : -exponent));
                }

                // Publisher count indicates data quality
                if (PythLazerLib.hasPublisherCount(feed)) {
                    publisherCount = PythLazerLib.getPublisherCount(feed);
                    console.log("Publisher count: %d", publisherCount);
                }

                // Confidence interval (optional)
                if (PythLazerLib.hasConfidence(feed)) {
                    confidence = PythLazerLib.getConfidence(feed);
                    console.log("Confidence: %d", confidence);
                }

                // Best bid/ask prices (optional, useful for spread calculation)
                if (PythLazerLib.hasBestBidPrice(feed)) {
                    bestBidPrice = PythLazerLib.getBestBidPrice(feed);
                    console.log("Best bid price: %d", uint64(bestBidPrice > 0 ? bestBidPrice : -bestBidPrice));
                }

                if (PythLazerLib.hasBestAskPrice(feed)) {
                    bestAskPrice = PythLazerLib.getBestAskPrice(feed);
                    console.log("Best ask price: %d", uint64(bestAskPrice > 0 ? bestAskPrice : -bestAskPrice));
                }

                // Update timestamp
                timestamp = parsedUpdate.timestamp;

                emit PriceUpdated(feedId, price, exponent, timestamp, publisherCount);
            }
        }
    }

    /// @notice Helper function to parse payload (converts memory bytes to calldata for library)
    /// @dev This is needed because PythLazerLib.parseUpdateFromPayload expects calldata bytes,
    ///      but verifyUpdate returns memory bytes. This external call converts memory to calldata.
    /// @param payload The payload bytes to parse
    /// @return update The parsed Update struct
    function _parsePayload(bytes memory payload) internal view returns (PythLazerStructs.Update memory) {
        return this.parsePayloadExternal(payload);
    }

    /// @notice External wrapper for parseUpdateFromPayload (enables memory to calldata conversion)
    /// @dev This function is called via this.parsePayloadExternal() to convert memory to calldata
    /// @param payload The payload bytes to parse
    /// @return The parsed Update struct
    function parsePayloadExternal(bytes calldata payload) external view returns (PythLazerStructs.Update memory) {
        return PythLazerLib.parseUpdateFromPayload(payload);
    }

    /// @notice Get the current price with proper decimal adjustment
    /// @return The price as a signed integer
    /// @return The exponent (negative means divide by 10^|exponent|)
    function getCurrentPrice() external view returns (int64, int16) {
        return (price, exponent);
    }

    /// @notice Get the bid-ask spread
    /// @return spread The spread between best ask and best bid prices
    function getSpread() external view returns (int64 spread) {
        return bestAskPrice - bestBidPrice;
    }

    /// @notice Check if the price data is fresh (within maxAge microseconds)
    /// @param maxAge Maximum age in microseconds
    /// @return True if the price is fresh
    function isPriceFresh(uint64 maxAge) external view returns (bool) {
        return block.timestamp * 1_000_000 - timestamp <= maxAge;
    }

    /// @notice Update the target feed ID
    /// @param _targetFeedId The new feed ID to track
    function setTargetFeedId(uint32 _targetFeedId) external {
        targetFeedId = _targetFeedId;
    }
}
