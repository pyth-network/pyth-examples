// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {PoolManager} from "v4-core/src/PoolManager.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";
import {Currency, CurrencyLibrary} from "v4-core/src/types/Currency.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {HookMiner} from "v4-periphery/src/utils/HookMiner.sol";

import {IEntropyV2} from "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import {IPyth} from "@pythnetwork/pyth-sdk-solidity/IPyth.sol";

import {ChaosHookDeployer} from "../contracts/ChaosHookDeployer.sol";
import {ChaosHook} from "../contracts/ChaosHook.sol";
import {TestToken} from "./TestToken.sol";

contract DeployChaosBaseSepolia is Script {
    using CurrencyLibrary for address;

    // ETH / USD feed id (same one you already use)
    bytes32 constant ETH_USD_FEED_ID =
        0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;

    // Optional override via env, otherwise use official contracts.
    function _pythAddress() internal view returns (address) {
        return vm.envAddress("PYTH_ADDRESS");
    }

    function _entropyAddress() internal view returns (address) {
        return vm.envAddress("ENTROPY_ADDRESS");
    }

    function run() external {
        vm.startBroadcast();
        address deployer = msg.sender;

        // 1. Deploy a fresh PoolManager on Base Sepolia
        PoolManager poolManagerImpl = new PoolManager(deployer);
        IPoolManager poolManager = IPoolManager(address(poolManagerImpl));

        // 2. Deploy simple ERC20s as pool tokens
        TestToken rawTokenA = new TestToken("Token0", "TK0", 18);
        TestToken rawTokenB = new TestToken("Token1", "TK1", 18);

        // 3. Wire real Pyth + Entropy
        IPyth pyth = IPyth(_pythAddress());
        IEntropyV2 entropy = IEntropyV2(_entropyAddress());

        // 4. Deploy ChaosHook with HookMiner to satisfy hook flags
        ChaosHookDeployer hookDeployer = new ChaosHookDeployer();

        uint160 flags = uint160(Hooks.BEFORE_ADD_LIQUIDITY_FLAG);
        bytes memory constructorArgs = abi.encode(
            poolManager,
            address(entropy),
            address(pyth),
            ETH_USD_FEED_ID
        );

        (address chaosAddr, bytes32 salt) = HookMiner.find(
            address(hookDeployer),
            flags,
            type(ChaosHook).creationCode,
            constructorArgs
        );

        ChaosHook chaos = hookDeployer.deploy(
            salt,
            poolManager,
            address(entropy),
            address(pyth),
            ETH_USD_FEED_ID
        );

        require(address(chaos) == chaosAddr, "Chaos hook address mismatch");

        // 5. Build PoolKey, sort currencies by address (v4 requirement)
        Currency cA = Currency.wrap(address(rawTokenA));
        Currency cB = Currency.wrap(address(rawTokenB));
        Currency currency0;
        Currency currency1;
        if (cA < cB) {
            currency0 = cA;
            currency1 = cB;
        } else {
            currency0 = cB;
            currency1 = cA;
        }

        PoolKey memory key = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: 3000,
            tickSpacing: 10,
            hooks: IHooks(address(chaos))
        });

        // 6. Initialize pool at tick 0 on Base Sepolia
        poolManager.initialize(key, TickMath.getSqrtPriceAtTick(0));

        // 7. Serialize to deployments/base-sepolia.json
        string memory root = "chaos-base-sepolia";
        vm.serializeAddress(root, "poolManager", address(poolManager));
        vm.serializeAddress(root, "token0", Currency.unwrap(currency0));
        vm.serializeAddress(root, "token1", Currency.unwrap(currency1));
        vm.serializeAddress(root, "chaosHook", address(chaos));
        vm.serializeAddress(root, "entropy", address(entropy));
        string memory json = vm.serializeAddress(root, "pyth", address(pyth));

        vm.writeJson(json, "./deployments/base-sepolia.json");

        vm.stopBroadcast();
    }
}
