// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {BatchCallAndSponsor} from "../src/BatchCallAndSponsor.sol";

contract DeployBatchCallAndSponsor is Script {
    BatchCallAndSponsor public batchCallAndSponsor;
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        batchCallAndSponsor = new BatchCallAndSponsor();
        console.log("BatchCallAndSponsor deployed at:", address(batchCallAndSponsor));
        vm.stopBroadcast();
    }
}