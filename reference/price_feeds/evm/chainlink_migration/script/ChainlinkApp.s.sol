// SPDX-License-Identifier: Apache 2
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import {PythAggregatorV3} from "@pythnetwork/pyth-sdk-solidity/PythAggregatorV3.sol";
import {ChainlinkApp} from "../src/ChainlinkApp.sol";

contract PythAggregatorV3Deployment is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Get the address for your ecosystem from:
        // https://docs.pyth.network/price-feeds/contract-addresses/evm
        address pythPriceFeedsContract = vm.envAddress("PYTH_ADDRESS");
        // Get the price feed ids from:
        // https://docs.pyth.network/price-feeds/price-feed-ids
        bytes32 ethFeedId = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;
        bytes32 solFeedId = 0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d;

        // Deploy an instance of PythAggregatorV3 for every feed.
        // You can deploy these contracts beforehand if you are integrating with
        PythAggregatorV3 ethAggregator = new PythAggregatorV3(pythPriceFeedsContract, ethFeedId);
        PythAggregatorV3 solAggregator = new PythAggregatorV3(pythPriceFeedsContract, solFeedId);

        // Pass the address of the PythAggregatorV3 contract to your chainlink-compatible app.
        ChainlinkApp app = new ChainlinkApp(address(ethAggregator), address(solAggregator));

        vm.stopBroadcast();
    }
}
