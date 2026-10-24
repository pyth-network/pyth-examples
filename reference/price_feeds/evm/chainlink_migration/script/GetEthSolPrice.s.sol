// SPDX-License-Identifier: Apache 2
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import {ChainlinkApp} from "../src/ChainlinkApp.sol";

contract GetEthSolPrice is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        ChainlinkApp app = ChainlinkApp(vm.envAddress("CONTRACT_ADDR"));
        console2.log(app.getEthSolPrice());

        vm.stopBroadcast();
    }
}
