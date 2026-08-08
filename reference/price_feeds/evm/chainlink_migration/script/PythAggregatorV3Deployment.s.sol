// SPDX-License-Identifier: Apache 2
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import {PythAggregatorV3} from "@pythnetwork/pyth-sdk-solidity/PythAggregatorV3.sol";
import "forge-std/console.sol";
contract PythAggregatorV3Deployment is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Get the address for your ecosystem from:
        // https://docs.pyth.network/price-feeds/contract-addresses/evm
        address pythPriceFeedsContract = vm.envAddress("PYTH_ADDRESS");
        // Get the price feed ids from:
        // https://docs.pyth.network/price-feeds/price-feed-ids
        bytes32 priceFeedId = vm.envBytes32("PRICE_FEED_ID");

        // Deploy an instance of PythAggregatorV3 for every feed.
        // You can deploy these contracts beforehand if you are integrating with
        PythAggregatorV3 aggregator = new PythAggregatorV3(pythPriceFeedsContract, priceFeedId);

        console.log("PythAggregatorV3 deployed at", address(aggregator));

        vm.stopBroadcast();
    }
}
