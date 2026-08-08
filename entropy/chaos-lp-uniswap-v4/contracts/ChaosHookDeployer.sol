// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ChaosHook} from "../contracts/ChaosHook.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";

contract ChaosHookDeployer {
    function deploy(
        bytes32 salt,
        IPoolManager poolManager,
        address entropy,
        address pyth,
        bytes32 priceFeedId
    ) external returns (ChaosHook) {
        return
            new ChaosHook{salt: salt}(poolManager, entropy, pyth, priceFeedId);
    }
}
