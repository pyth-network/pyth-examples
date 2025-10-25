// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";

import { CrashGame } from "../src/CrashGame.sol";
import {Script, console2} from "forge-std/Script.sol";

contract DeployCrashGame is Script {
    function run() external returns (CrashGame) {
        vm.startBroadcast();
        CrashGame game = new CrashGame(
            // OWNER ADDRESS,
            // ENTROPY V2 ADDRESS
        );
        vm.stopBroadcast();
        console2.log("Crash Game deployed to:", address(game));
        return game;
    }
}
