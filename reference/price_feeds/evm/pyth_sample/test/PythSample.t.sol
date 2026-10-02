// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { Test, console2 } from "forge-std/Test.sol";
import { PythSample } from "../src/PythSample.sol";
import { MockPyth } from "@pythnetwork/pyth-sdk-solidity/MockPyth.sol";
import { PythStructs } from "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

contract PythSampleTest is Test {
    MockPyth public pyth;
    PythSample public app;
    
    // @dev: Dummy price ids for testing.
    bytes32 constant ETH_PRICE_FEED_ID = bytes32(uint256(0x1));
    bytes32 constant BTC_PRICE_FEED_ID = bytes32(uint256(0x2));

    // @dev: Setup the test environment.
    function setUp() public {
        pyth = new MockPyth(60, 1);
        app = new PythSample(address(pyth));
    }

    // @dev: Creating a dummyprice update for a given price id and price.
    function createPriceUpdate(
        bytes32 priceId,
        int64 price
    ) private view returns (bytes[] memory) {
        bytes[] memory updateData = new bytes[](1);
        updateData[0] = pyth.createPriceFeedUpdateData(
            priceId,
            price * 100000, // price
            10 * 100000, // confidence
            -5, // exponent
            price * 100000, // emaPrice
            10 * 100000, // emaConfidence
            uint64(block.timestamp), // publishTime
            uint64(block.timestamp) // prevPublishTime
        );
        return updateData;
    }

    // @dev: Testing the getLatestPrice function.
    function testGetLatestPrice() public {
        bytes[] memory updateData = createPriceUpdate(ETH_PRICE_FEED_ID, 2000);
        uint updateFee = pyth.getUpdateFee(updateData);
        
        vm.deal(address(this), updateFee);
        PythStructs.Price memory price = app.getLatestPrice{value: updateFee}(
            ETH_PRICE_FEED_ID,
            updateData
        );

        assertEq(price.price, 2000 * 100000);
    }

    function testGetLatestPrices() public {
        bytes32[] memory priceIds = new bytes32[](2);
        priceIds[0] = ETH_PRICE_FEED_ID;
        priceIds[1] = BTC_PRICE_FEED_ID;

        bytes[] memory updateData = new bytes[](2);
        updateData[0] = pyth.createPriceFeedUpdateData(
            ETH_PRICE_FEED_ID,
            2000 * 100000, // ETH price
            10 * 100000,
            -5,
            2000 * 100000,
            10 * 100000,
            uint64(block.timestamp),
            uint64(block.timestamp)
        );
        updateData[1] = pyth.createPriceFeedUpdateData(
            BTC_PRICE_FEED_ID,
            30000 * 100000, // BTC price
            10 * 100000,
            -5,
            30000 * 100000,
            10 * 100000,
            uint64(block.timestamp),
            uint64(block.timestamp)
        );

        uint updateFee = pyth.getUpdateFee(updateData);
        vm.deal(address(this), updateFee);

        PythStructs.Price[] memory prices = app.getLatestPrices{value: updateFee}(
            priceIds,
            updateData
        );

        assertEq(prices.length, 2);
        assertEq(prices[0].price, 2000 * 100000);
        assertEq(prices[1].price, 30000 * 100000);
    }

    function testStalePrice() public {
        bytes[] memory updateData = createPriceUpdate(ETH_PRICE_FEED_ID, 2000);
        uint updateFee = pyth.getUpdateFee(updateData);
        vm.deal(address(this), updateFee);

        // Update price
        pyth.updatePriceFeeds{value: updateFee}(updateData);

        // Skip 120 seconds (more than the 60-second staleness threshold)
        skip(120);

        // Expect revert when trying to get price
        vm.expectRevert();
        app.getLatestPrice{value: updateFee}(ETH_PRICE_FEED_ID, updateData);
    }
}