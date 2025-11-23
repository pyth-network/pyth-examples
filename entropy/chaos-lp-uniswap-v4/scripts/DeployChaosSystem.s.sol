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

import {ChaosHookDeployer} from "../contracts/ChaosHookDeployer.sol";
import {ChaosHook} from "../contracts/ChaosHook.sol";
import {MockEntropy} from "../test/mocks/MockEntropy.sol";
import {MockPyth} from "../test/mocks/MockPyth.sol";
import {TestToken} from "./TestToken.sol";

contract DeployChaosSystem is Script {
    using CurrencyLibrary for address;

    bytes32 constant ETH_USD_FEED_ID =
        0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PK");
        vm.startBroadcast(pk);

        // 1. Deploy PoolManager
        address deployer = vm.addr(pk);
        PoolManager poolManager = new PoolManager(deployer);

        // 2. Deploy test tokens
        TestToken rawTokenA = new TestToken("Token0", "TK0", 18);
        TestToken rawTokenB = new TestToken("Token1", "TK1", 18);

        // 3. Deploy Pyth + Entropy (local mocks for now)
        MockPyth pyth = new MockPyth();
        MockEntropy entropy = new MockEntropy();

        // Dedicated hook deployer
        ChaosHookDeployer hookDeployer = new ChaosHookDeployer();

        // 4. Deploy ChaosHook
        uint160 flags = uint160(Hooks.BEFORE_ADD_LIQUIDITY_FLAG);
        bytes memory constructorArgs = abi.encode(
            IPoolManager(address(poolManager)),
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
            IPoolManager(address(poolManager)),
            address(entropy),
            address(pyth),
            ETH_USD_FEED_ID
        );

        require(address(chaos) == chaosAddr, "Chaos hook address mismatch");

        // Sort currencies by address (v4 requirement)
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

        // 5. Initialize a pool using this hook
        PoolKey memory key = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: 3000,
            tickSpacing: 10,
            hooks: IHooks(address(chaos))
        });

        // mid-price at tick 0
        poolManager.initialize(key, TickMath.getSqrtPriceAtTick(0));

        // 6. Serialize addresses to JSON
        string memory root = "chaos";

        vm.serializeAddress(root, "poolManager", address(poolManager));
        vm.serializeAddress(root, "token0", Currency.unwrap(currency0));
        vm.serializeAddress(root, "token1", Currency.unwrap(currency1));
        vm.serializeAddress(root, "chaosHook", address(chaos));
        vm.serializeAddress(root, "entropy", address(entropy));
        string memory json = vm.serializeAddress(root, "pyth", address(pyth));

        vm.writeJson(json, "./deployments/local.json");

        vm.stopBroadcast();
    }
}

// export DEPLOYER_PK=0x...
// forge script script/DeployChaosSystem.s.sol \
//   --rpc-url http://localhost:8545 \
//   --broadcast -vv
