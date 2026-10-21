// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseHook} from "v4-periphery/src/utils/BaseHook.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {ModifyLiquidityParams} from "v4-core/src/types/PoolOperation.sol";

import {
    IEntropyConsumer
} from "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
import {IEntropyV2} from "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import {IPyth} from "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import {PythStructs} from "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

contract ChaosHook is BaseHook, IEntropyConsumer {
    using PoolIdLibrary for PoolKey;

    /// @dev Entropy contract used for randomness.
    IEntropyV2 public immutable entropy;

    /// @dev Pyth price oracle.
    IPyth public immutable pyth;

    /// @dev Pyth price feed id for the reference pair (e.g. ETH/USD).
    bytes32 public immutable priceFeedId;

    /// @dev Sequence number => poolKey mapping.
    mapping(uint64 => PoolKey) public pendingRequests;

    /// @dev Fixed liquidity delta per Chaos position for the demo.
    int128 public constant LIQUIDITY_DELTA = 1e18;

    /// @dev Bounds for random offset in ticks around the oracle tick.
    int256 public constant MIN_OFFSET = 500; // ~0.5% if tickSpacing ~10
    int256 public constant MAX_OFFSET = 2500; // wider tail for "chaos" feel

    event ChaosRequestQueued(uint64 indexed sequence, PoolId indexed poolId);
    event ChaosPositionPlanned(
        uint64 indexed sequence,
        PoolId indexed poolId,
        int24 centerTick,
        int24 tickLower,
        int24 tickUpper,
        bytes32 randomNumber
    );
    event ChaosPriceAndEntropyRequested(
        uint64 indexed sequence,
        PoolId indexed poolId,
        uint64 maxAgeSec
    );

    constructor(
        IPoolManager _poolManager,
        address _entropyAddress,
        address _pythAddress,
        bytes32 _pythPriceFeedId
    ) BaseHook(_poolManager) {
        entropy = IEntropyV2(_entropyAddress);
        pyth = IPyth(_pythAddress);
        priceFeedId = _pythPriceFeedId;
    }

    /// ----------------------
    /// Mocked Test Utilities
    /// ----------------------

    function _setPendingRequestForTest(
        uint64 sequence,
        PoolKey calldata key
    ) external {
        pendingRequests[sequence] = key;
    }

    /// @dev TEST ONLY — exposes the internal entropyCallback so mocks can call it.
    function testEntropyCallback(
        uint64 seq,
        address provider,
        bytes32 rand
    ) external {
        // Simulate real caller
        require(msg.sender == address(entropy), "not entropy");
        entropyCallback(seq, provider, rand);
    }

    function getPendingTickSpacing(uint64 seq) external view returns (int24) {
        return pendingRequests[seq].tickSpacing;
    }

    /// -----------------
    /// Hook permissions
    /// -----------------

    function getHookPermissions()
        public
        pure
        override
        returns (Hooks.Permissions memory)
    {
        // For now we only declare beforeAddLiquidity as implemented,
        // but keep it as a no-op. All Chaos logic is driven off Entropy callbacks.
        return
            Hooks.Permissions({
                beforeInitialize: false,
                afterInitialize: false,
                beforeAddLiquidity: true,
                afterAddLiquidity: false,
                beforeRemoveLiquidity: false,
                afterRemoveLiquidity: false,
                beforeSwap: false,
                afterSwap: false,
                beforeDonate: false,
                afterDonate: false,
                beforeSwapReturnDelta: false,
                afterSwapReturnDelta: false,
                afterAddLiquidityReturnDelta: false,
                afterRemoveLiquidityReturnDelta: false
            });
    }

    /// @notice No-op hook so normal LP adds still work.
    function _beforeAddLiquidity(
        address,
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        bytes calldata
    ) internal pure override returns (bytes4) {
        return BaseHook.beforeAddLiquidity.selector;
    }

    /// -----------------------------------------
    /// External interface for the cli / scripts
    /// -----------------------------------------

    /// @notice Single entry point: request randomness for a Chaos LP position.
    /// @dev Caller must send at least `entropy.getFeeV2()` native token.
    function requestRandom(
        PoolKey calldata key
    ) external payable returns (uint64 sequence) {
        uint128 fee = entropy.getFeeV2();
        require(msg.value >= fee, "ChaosHook: insufficient entropy fee");

        // Basic V2 request – no extra params. Callback will hit `_entropyCallback`.
        sequence = entropy.requestV2{value: fee}();
        pendingRequests[sequence] = key;

        PoolId poolId = key.toId();
        emit ChaosRequestQueued(sequence, poolId);

        // Refund any surplus
        if (msg.value > fee) {
            unchecked {
                payable(msg.sender).transfer(msg.value - fee);
            }
        }
    }

    /// -----------
    /// Pyth price
    /// -----------

    /// @notice Pull Pyth price via Hermes updateData, then request Entropy randomness
    ///         and queue a Chaos LP request for `key`.
    /// @dev This is the function we'll hit from our scripts / MEV sim.
    function requestChaosWithPyth(
        PoolKey calldata key,
        bytes[] calldata updateData,
        uint64 maxAgeSec
    ) external payable returns (uint64 sequence) {
        // 1. Pay Pyth to update the price
        uint256 pythFee = pyth.getUpdateFee(updateData);

        // 2. Pay Entropy for randomness
        uint128 entropyFee = entropy.getFeeV2();

        uint256 totalFee = pythFee + uint256(entropyFee);
        require(
            msg.value >= totalFee,
            "ChaosHook: insufficient Pyth+Entropy fee"
        );

        // Update price feeds on-chain (Pyth pull pattern)
        pyth.updatePriceFeeds{value: pythFee}(updateData);

        // Sanity-check freshness by consuming via getPriceNoOlderThan
        //   makes it crystal clear that we use the "pull" API.
        //   We don't store it because entropyCallback will read again later.
        pyth.getPriceNoOlderThan(priceFeedId, maxAgeSec);

        // 3. Request randomness (Entropy V2)
        sequence = entropy.requestV2{value: entropyFee}();
        pendingRequests[sequence] = key;

        PoolId poolId = key.toId();
        emit ChaosRequestQueued(sequence, poolId);

        // 4. Refund dust back to the caller
        if (msg.value > totalFee) {
            unchecked {
                payable(msg.sender).transfer(msg.value - totalFee);
            }
        }

        emit ChaosPriceAndEntropyRequested(sequence, poolId, maxAgeSec);
    }

    /// @notice Exposed for testing; wraps internal oracle/helper.
    function getLatestTick() external view returns (int24) {
        return _getLatestTick();
    }

    function _getLatestTick() internal view returns (int24) {
        PythStructs.Price memory p = pyth.getPriceUnsafe(priceFeedId);

        int64 price = p.price;
        int32 expo = p.expo;

        // Basic sanity: negative or zero price is invalid for ticks.
        require(price > 0, "ChaosHook: invalid oracle price");

        uint256 normalizedPrice = uint256(int256(price));

        // Adjust exponent into an integer-like price; this is crude but adequate
        // for relative tick placement in the demo.
        if (expo < 0) {
            normalizedPrice = normalizedPrice / (10 ** uint32(-expo));
        } else if (expo > 0) {
            normalizedPrice = normalizedPrice * (10 ** uint32(expo));
        }

        // Convert price into sqrtPriceX96 in a rough way:
        // sqrtPriceX96 ≈ sqrt(price) * 2^48
        uint256 sqrtPrice = _sqrt(normalizedPrice);
        uint160 sqrtPriceX96 = uint160(sqrtPrice << 96);

        int24 tick = TickMath.getTickAtSqrtPrice(sqrtPriceX96);
        return tick;
    }

    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        // Babylonian method
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    /// --------------------------------
    /// Entropy consumer implementation
    /// --------------------------------

    /// @dev Required by IEntropyConsumer – returns the Entropy contract address.
    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }

    /// @dev Callback invoked by IEntropyConsumer.entropyCallback().
    function entropyCallback(
        uint64 sequenceNumber,
        address /*provider*/,
        bytes32 randomNumber
    ) internal override {
        PoolKey memory key = pendingRequests[sequenceNumber];
        require(key.tickSpacing != 0, "ChaosHook: no request");

        delete pendingRequests[sequenceNumber];

        PoolId poolId = key.toId();

        // Derive center tick from Pyth.
        int24 centerTick = _getLatestTick();

        // Map random bytes32 to a signed offset in [MIN_OFFSET, MAX_OFFSET].
        int256 baseOffset = _mapRandomNumber(
            randomNumber,
            MIN_OFFSET,
            MAX_OFFSET
        );
        // Random sign bit
        if ((uint256(randomNumber) & 1) == 0) {
            baseOffset = -baseOffset;
        }

        int24 tickSpacing = key.tickSpacing;
        require(tickSpacing > 0, "ChaosHook: invalid tickSpacing");

        int24 rawLower = centerTick - int24(baseOffset);
        int24 rawUpper = centerTick + int24(baseOffset);

        int24 tickLower = _snapAndClamp(rawLower, tickSpacing);
        int24 tickUpper = _snapAndClamp(rawUpper, tickSpacing);

        // Ensure lower < upper; if not, flip.
        if (tickLower >= tickUpper) {
            (tickLower, tickUpper) = (tickUpper - tickSpacing, tickUpper);
        }

        // Finally, modify liquidity around this randomized band.
        poolManager.modifyLiquidity(
            key,
            ModifyLiquidityParams({
                tickLower: tickLower,
                tickUpper: tickUpper,
                liquidityDelta: LIQUIDITY_DELTA,
                salt: bytes32(0)
            }),
            ""
        );

        emit ChaosPositionPlanned(
            sequenceNumber,
            poolId,
            centerTick,
            tickLower,
            tickUpper,
            randomNumber
        );
    }

    /// --------
    /// Helpers
    /// --------

    function _mapRandomNumber(
        bytes32 randomNumber,
        int256 minRange,
        int256 maxRange
    ) internal pure returns (int256) {
        require(maxRange >= minRange, "ChaosHook: bad range");
        uint256 span = uint256(maxRange - minRange + 1);
        return minRange + int256(uint256(randomNumber) % span);
    }

    function _snapAndClamp(
        int24 tick,
        int24 tickSpacing
    ) internal pure returns (int24) {
        // Clamp to TickMath bounds first.
        int24 minTick = (TickMath.MIN_TICK / tickSpacing) * tickSpacing;
        int24 maxTick = (TickMath.MAX_TICK / tickSpacing) * tickSpacing;

        if (tick < minTick) tick = minTick;
        if (tick > maxTick) tick = maxTick;

        // Snap to spacing (round down to nearest multiple).
        int24 remainder = tick % tickSpacing;
        if (remainder != 0) {
            tick -= remainder;
        }

        // Re-clamp to be safe.
        if (tick < minTick) tick = minTick;
        if (tick > maxTick) tick = maxTick;

        return tick;
    }
}
