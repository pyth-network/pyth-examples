// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {StdAssertions} from "forge-std/StdAssertions.sol";
import {ExampleReceiver} from "../src/ExampleReceiver.sol";
import {PythLazer} from "pyth-lazer/PythLazer.sol";

contract ExampleReceiverScript is Script, StdAssertions {
    ExampleReceiver public receiver;

    function setUp() public {}

    function run() public {
        address trustedSigner = vm.envAddress("TRUSTED_SIGNER");
        console.log("trustedSigner %s", trustedSigner);

        bytes memory update = vm.envBytes("UPDATE_DATA");
        console.logBytes(update);

        vm.startBroadcast();

        PythLazer pythLazer = new PythLazer();
        pythLazer.initialize(msg.sender);
        pythLazer.updateTrustedSigner(trustedSigner, 3000000000000000);

        receiver = new ExampleReceiver(address(pythLazer));
        receiver.updatePrice(update);
        assertEq(receiver.price(), 100000000);
        assertEq(receiver.timestamp(), 1728479312975644);

        vm.stopBroadcast();
    }
}
