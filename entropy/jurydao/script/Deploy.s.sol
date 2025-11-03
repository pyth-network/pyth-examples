// script/Deploy.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/GovernanceToken.sol";
import "../contracts/JurorRegistry.sol";
import "../contracts/GovernorSortition.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address entropy = vm.envAddress("PYTH_ENTROPY");
        address entropyProvider = vm.envAddress("PYTH_PROVIDER");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy GovernanceToken
        GovernanceToken token = new GovernanceToken();
        console.log("GovernanceToken deployed at:", address(token));

        // Deploy JurorRegistry
        JurorRegistry registry = new JurorRegistry(address(token));
        console.log("JurorRegistry deployed at:", address(registry));

        // Deploy GovernorSortition
        GovernorSortition governor = new GovernorSortition(
            entropy,
            entropyProvider,
            address(registry)
        );
        console.log("GovernorSortition deployed at:", address(governor));

        vm.stopBroadcast();
    }
}
