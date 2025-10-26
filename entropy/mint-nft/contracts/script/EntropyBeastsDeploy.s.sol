// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script } from "forge-std/Script.sol";
import { EntropyBeasts } from "../src/EntropyBeasts.sol";

contract EntropyBeastsDeploy is Script {
    address PYTH_BASE_TESTNET_ADDRESS = 0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c;
    function run() public {
        vm.startBroadcast();
        new EntropyBeasts(PYTH_BASE_TESTNET_ADDRESS);
        vm.stopBroadcast();
    }
}