// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;

import {console} from "forge-std/console.sol";
import {PythLazer} from "pyth-lazer/PythLazer.sol";
import {PythLazerLib} from "pyth-lazer/PythLazerLib.sol";
import {PythLazerStructs} from "pyth-lazer/PythLazerStructs.sol";

/**
 * @title ExampleReceiver
 * @notice Example contract demonstrating how to consume Pyth Lazer price updates.
 *
 * @dev This contract showcases the recommended pattern for integrating with Pyth Lazer on EVM chains.
 *
 * ## API Methods
 *
 * For each property X (e.g., Price, BestBidPrice, Exponent):
 *
 * - `isXRequested(feed)`: Was this property included in the update?
 * - `hasX(feed)`: Does it have a value for this timestamp?
 * - `getX(feed)`: Get the value (reverts if not present)
 *
 * **Important**: `getX()` internally checks both `isXRequested()` and `hasX()` before returning.
 * If you're confident the property exists, you can call `getX()` directly - it will revert with
 * a descriptive error if the property is missing.
 *
 * ## Usage Patterns
 *
 * Pattern 1 - Direct access (when you're certain property exists):
 * ```
 * int64 priceValue = PythLazerLib.getPrice(feed);  // Reverts if missing
 * ```
 *
 * Pattern 2 - Graceful handling (when property might be missing):
 * ```
 * if (PythLazerLib.hasPrice(feed)) {
 *     int64 priceValue = PythLazerLib.getPrice(feed);
 * }
 * ```
 *
 * Pattern 3 - Full check (when you need to distinguish all states):
 * ```
 * if (PythLazerLib.isPriceRequested(feed)) {
 *     if (PythLazerLib.hasPrice(feed)) {
 *         int64 priceValue = PythLazerLib.getPrice(feed);
 *     } else {
 *         // Property requested but missing for this timestamp
 *     }
 * } else {
 *     // Property not applicable for this feed
 * }
 * ```
 */
contract ExampleReceiver {
    PythLazer pythLazer;

    // State variables to store the latest price data from any feed in the update
    // Note: price is int64 to match the Feed._price type in PythLazerStructs
    int64 public price;
    uint64 public timestamp;
    int16 public exponent;
    uint16 public publisherCount;

    constructor(address pythLazerAddress) {
        pythLazer = PythLazer(pythLazerAddress);
    }

    /**
     * @notice Updates the stored price from a Pyth Lazer update message.
     * @dev Demonstrates the new verifyAndParseUpdate() API which combines signature
     *      verification and payload parsing into a single call.
     *
     * The flow is:
     * 1. Call verifyAndParseUpdate() - verifies signature and parses into structured Update
     * 2. Access update.timestamp and update.channel from the Update struct
     * 3. Iterate over update.feeds[] array
     * 4. Use isXRequested(), hasX(), getX() to safely access properties
     *
     * @param update The raw update bytes from Pyth Lazer (includes signature + payload)
     */
    function updatePrice(bytes calldata update) public payable {
        // =========================================================================
        // STEP 0: Handle verification fee
        // =========================================================================
        // Pyth Lazer requires a small verification fee to cover on-chain signature
        // verification costs. Get the required fee and ensure sufficient payment.
        // Any excess payment will be automatically refunded by verifyAndParseUpdate().
        // =========================================================================

        uint256 verificationFee = pythLazer.verification_fee();
        require(msg.value >= verificationFee, "Insufficient fee provided");

        // =========================================================================
        // STEP 1: Verify and parse the update in a single call
        // =========================================================================
        // verifyAndParseUpdate() does two things:
        // 1. Verifies the cryptographic signature against trusted signers
        // 2. Parses the payload into a structured Update object
        // =========================================================================

        (, PythLazerStructs.Update memory parsedUpdate) =
            pythLazer.verifyAndParseUpdate{value: msg.value}(update);

        // =========================================================================
        // STEP 2: Access update metadata from the structured Update object
        // =========================================================================
        // The Update struct contains:
        // - timestamp: Unix timestamp in microseconds
        // - channel: The data channel (RealTime, FixedRate50, etc.)
        // - feeds[]: Array of Feed structs, one per price feed in the update
        // =========================================================================

        console.log("timestamp %d", parsedUpdate.timestamp);
        console.log("channel %d", uint8(parsedUpdate.channel));
        console.log("feedsLen %d", parsedUpdate.feeds.length);

        // =========================================================================
        // STEP 3: Iterate over feeds and access properties safely
        // =========================================================================
        for (uint256 i = 0; i < parsedUpdate.feeds.length; i++) {
            PythLazerStructs.Feed memory feed = parsedUpdate.feeds[i];

            console.log("feedId %d", feed.feedId);

            // =====================================================================
            // EXAMPLE: Handling Price property with full state check
            // =====================================================================
            // This demonstrates checking all states explicitly.
            // Use this pattern when you need to handle missing data gracefully.
            // =====================================================================

            if (PythLazerLib.isPriceRequested(feed)) {
                // Price was included in the update request
                if (PythLazerLib.hasPrice(feed)) {
                    // Price has a valid value for this timestamp
                    int64 _price = PythLazerLib.getPrice(feed);
                    console.log("price %d", _price);

                    // Update state if this is a newer update
                    if (parsedUpdate.timestamp > timestamp) {
                        price = _price;
                        timestamp = parsedUpdate.timestamp;
                    }
                } else {
                    // Price was requested but no value available for this timestamp
                    console.log("price requested but not available for this timestamp");
                }
            } else {
                // Price was not included in this update
                console.log("price not requested in this update");
            }

            // =====================================================================
            // EXAMPLE: Handling BestBidPrice with graceful fallback
            // =====================================================================
            // For optional properties like bid/ask, you might just check hasX()
            // and skip if not present.
            // =====================================================================

            if (PythLazerLib.hasBestBidPrice(feed)) {
                int64 bestBidPrice = PythLazerLib.getBestBidPrice(feed);
                console.log("best bid price %d", bestBidPrice);
            }

            // =====================================================================
            // EXAMPLE: Handling BestAskPrice
            // =====================================================================

            if (PythLazerLib.hasBestAskPrice(feed)) {
                int64 bestAskPrice = PythLazerLib.getBestAskPrice(feed);
                console.log("best ask price %d", bestAskPrice);
            }

            // =====================================================================
            // EXAMPLE: Handling Exponent with direct access
            // =====================================================================
            // Exponent is typically always present when requested.
            // Here we use getExponent() directly - it will revert with a clear
            // error message if the exponent is missing.
            //
            // Note: getX() internally checks both isXRequested() and hasX(),
            // so you don't need to check them separately if you're okay with reverting.
            // =====================================================================

            if (PythLazerLib.hasExponent(feed)) {
                int16 _exponent = PythLazerLib.getExponent(feed);
                console.log("exponent %d", _exponent);
                exponent = _exponent;
            }

            // =====================================================================
            // EXAMPLE: Handling PublisherCount
            // =====================================================================

            if (PythLazerLib.hasPublisherCount(feed)) {
                uint16 _publisherCount = PythLazerLib.getPublisherCount(feed);
                console.log("publisher count %d", _publisherCount);
                publisherCount = _publisherCount;
            }

            // =====================================================================
            // EXAMPLE: Handling Confidence (optional property)
            // =====================================================================

            if (PythLazerLib.hasConfidence(feed)) {
                uint64 confidence = PythLazerLib.getConfidence(feed);
                console.log("confidence %d", confidence);
            }

            // =====================================================================
            // EXAMPLE: Handling Funding Rate properties (for perpetual feeds)
            // =====================================================================
            // Funding rate properties are only applicable to perpetual/futures feeds.
            // For spot feeds, isXRequested() will return false.
            // =====================================================================

            if (PythLazerLib.isFundingRateRequested(feed)) {
                if (PythLazerLib.hasFundingRate(feed)) {
                    int64 fundingRate = PythLazerLib.getFundingRate(feed);
                    console.log("funding rate %d", fundingRate);
                } else {
                    console.log("funding rate requested but not available");
                }
            }

            if (PythLazerLib.hasFundingTimestamp(feed)) {
                uint64 fundingTimestamp = PythLazerLib.getFundingTimestamp(feed);
                console.log("funding timestamp %d", fundingTimestamp);
            }

            if (PythLazerLib.hasFundingRateInterval(feed)) {
                uint64 fundingRateInterval = PythLazerLib.getFundingRateInterval(feed);
                console.log("funding rate interval %d", fundingRateInterval);
            }
        }
    }
}
