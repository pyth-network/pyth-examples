// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import {IEntropyConsumer} from "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
import {IEntropyV2} from "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";

/**
 * @title Battlefield
 * @dev A prediction battle contract where users can make price predictions on cryptocurrency assets
 *
 * This contract allows users to:
 * - Create predictions for price movements during specified battle periods
 * - Compete for rewards based on highest price change predictions
 * - Win random rewards through Pyth Entropy's verifiable randomness
 *
 * The contract integrates with:
 * - Pyth Network for real-time price feeds
 * - Pyth Entropy for verifiable randomness in reward distribution
 *
 * Rewards are distributed in two ways:
 * 1. Top Price Change Reward: Goes to the prediction with the highest price increase
 * 2. Random Reward: Randomly distributed to any participant using Entropy
 */
contract Battlefield is IEntropyConsumer {
    /// @dev Reward amount for the prediction with the highest price change (0.01 ETH)
    uint256 public constant TOP_PRICE_CHANGE_REWARD = 0.01 ether;

    /// @dev Reward amount for randomly selected prediction (0.005 ETH)
    uint256 public constant RANDOM_REWARD = 0.005 ether;

    /**
     * @dev Represents a user's prediction for a specific price feed during a battle
     * @param creatorAddress The address of the user who created this prediction
     * @param creatorFid The Farcaster ID of the prediction creator
     * @param priceFeedId The Pyth price feed ID for the asset being predicted
     * @param priceStart The starting price when the battle begins (set during processStartedBattle)
     * @param priceEnd The ending price when the battle ends (set during processEndedBattle)
     * @param priceChange The percentage change in basis points (1/100 of a percent)
     * @param topPriceChangeReward Amount awarded if this prediction had the highest price change
     * @param randomReward Amount awarded if this prediction was randomly selected
     */
    struct Prediction {
        address creatorAddress;
        uint64 creatorFid;
        bytes32 priceFeedId;
        int64 priceStart;
        int64 priceEnd;
        int64 priceChange; // In basis points (1/100 of a percent)
        uint256 topPriceChangeReward;
        uint256 randomReward;
    }

    /**
     * @dev Emitted when a new prediction is created
     * @param battleStart The timestamp when the battle starts
     * @param creatorAddress The address of the prediction creator
     * @param creatorFid The Farcaster ID of the creator
     * @param priceFeedId The Pyth price feed ID for the predicted asset
     */
    event PredictionCreated(
        uint256 battleStart,
        address creatorAddress,
        uint64 creatorFid,
        bytes32 priceFeedId
    );

    /**
     * @dev Emitted when a battle's starting phase is processed and initial prices are recorded
     * @param battleStart The timestamp when the battle starts
     * @param battleEnd The timestamp when the battle ends
     * @param battleKey The unique identifier for this battle (hash of start and end times)
     * @param predictionCount The number of predictions made for this battle
     */
    event BattleStartProcessed(
        uint256 battleStart,
        uint256 battleEnd,
        bytes32 battleKey,
        uint256 predictionCount
    );

    /**
     * @dev Emitted when a battle's ending phase is processed and rewards are distributed
     * @param battleStart The timestamp when the battle started
     * @param battleEnd The timestamp when the battle ended
     * @param battleKey The unique identifier for this battle
     * @param predictionCount The total number of predictions for this battle
     * @param topPriceChangeWinner The address that won the top price change reward
     * @param topPriceChange The highest price change percentage achieved (in basis points)
     */
    event BattleEndProcessed(
        uint256 battleStart,
        uint256 battleEnd,
        bytes32 battleKey,
        uint256 predictionCount,
        address topPriceChangeWinner,
        int64 topPriceChange
    );

    /// @dev Pyth Network oracle contract for price feeds
    IPyth public pyth;

    /// @dev Pyth Entropy contract for verifiable randomness
    IEntropyV2 public entropy;

    /// @dev Maps battle keys to arrays of predictions made for that battle
    mapping(bytes32 battleKey => Prediction[]) public battleToPredictions;

    /// @dev Maps Entropy sequence numbers to battle keys for async random reward processing
    mapping(uint64 sequenceNumber => bytes32 battleKey) public sequenceToBattle;

    /**
     * @dev Contract constructor
     * @param pythAddress The address of the Pyth Network oracle contract
     * @param entropyAddress The address of the Pyth Entropy contract
     */
    constructor(address pythAddress, address entropyAddress) {
        pyth = IPyth(pythAddress);
        entropy = IEntropyV2(entropyAddress);
    }

    // =============================================================
    // Public functions
    // =============================================================

    /**
     * @dev Generates a unique battle key from battle start and end timestamps
     * @param battleStart The timestamp when the battle begins
     * @param battleEnd The timestamp when the battle ends
     * @return The unique battle key as a bytes32 hash
     */
    function getBattleKey(
        uint256 battleStart,
        uint256 battleEnd
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(battleStart, battleEnd));
    }

    /**
     * @dev Retrieves all predictions made for a specific battle
     * @param battleStart The timestamp when the battle begins
     * @param battleEnd The timestamp when the battle ends
     * @return An array of all predictions for the specified battle
     */
    function getBattlePredictions(
        uint256 battleStart,
        uint256 battleEnd
    ) public view returns (Prediction[] memory) {
        bytes32 battleKey = getBattleKey(battleStart, battleEnd);
        return battleToPredictions[battleKey];
    }

    /**
     * @dev Creates a new prediction for a specific battle and price feed
     * @param battleStart The timestamp when the battle begins
     * @param battleEnd The timestamp when the battle ends
     * @param creatorFid The Farcaster ID of the prediction creator
     * @param priceFeedId The Pyth Network price feed ID for the asset to predict
     *
     * Note: The actual price data (priceStart, priceEnd, priceChange) and rewards
     * are set later during battle processing phases
     */
    function createPrediction(
        uint256 battleStart,
        uint256 battleEnd,
        uint64 creatorFid,
        bytes32 priceFeedId
    ) public {
        bytes32 battleKey = getBattleKey(battleStart, battleEnd);

        // Create a new prediction with initial values
        // Price data and rewards will be filled during battle processing
        Prediction memory newPrediction = Prediction({
            creatorAddress: msg.sender,
            creatorFid: creatorFid,
            priceFeedId: priceFeedId,
            priceStart: 0, // Will be set when battle starts
            priceEnd: 0, // Will be set when battle ends
            priceChange: 0, // Will be calculated when battle ends
            topPriceChangeReward: 0, // Will be set if this prediction wins
            randomReward: 0 // Will be set if this prediction is randomly selected
        });

        battleToPredictions[battleKey].push(newPrediction);

        emit PredictionCreated(
            battleStart,
            msg.sender,
            creatorFid,
            priceFeedId
        );
    }

    /**
     * @dev Processes the start of a battle by recording initial prices for all predictions
     * @param battleStart The timestamp when the battle begins
     * @param battleEnd The timestamp when the battle ends
     * @param priceUpdate Pyth price update data to refresh price feeds
     *
     * This function:
     * 1. Updates Pyth price feeds with the latest data
     * 2. Records the starting price for each prediction's asset
     * 3. Emits an event indicating the battle has started processing
     *
     * Note: Caller must send enough ETH to cover Pyth update fees
     */
    function processStartedBattle(
        uint256 battleStart,
        uint256 battleEnd,
        bytes[] calldata priceUpdate
    ) public payable {
        // Generate unique battle identifier
        bytes32 battleKey = getBattleKey(battleStart, battleEnd);

        // Update Pyth price feeds with latest data (requires fee payment)
        uint fee = pyth.getUpdateFee(priceUpdate);
        pyth.updatePriceFeeds{value: fee}(priceUpdate);

        // Record starting prices for all predictions in this battle
        for (uint i = 0; i < battleToPredictions[battleKey].length; i++) {
            Prediction storage prediction = battleToPredictions[battleKey][i];

            // Get the current price for this prediction's asset (max 60 seconds old)
            PythStructs.Price memory price = pyth.getPriceNoOlderThan(
                prediction.priceFeedId,
                60
            );

            // Store the starting price for percentage calculation later
            prediction.priceStart = price.price;
        }

        // Emit event confirming battle start processing is complete
        emit BattleStartProcessed(
            battleStart,
            battleEnd,
            battleKey,
            battleToPredictions[battleKey].length
        );
    }

    /**
     * @dev Processes the end of a battle, calculates results, and distributes rewards
     * @param battleStart The timestamp when the battle began
     * @param battleEnd The timestamp when the battle ended
     * @param priceUpdate Pyth price update data to refresh price feeds
     *
     * This function:
     * 1. Updates Pyth price feeds with final data
     * 2. Records ending prices and calculates percentage changes
     * 3. Awards the top price change reward immediately
     * 4. Requests randomness from Entropy for random reward distribution
     * 5. Emits an event with battle results
     *
     * Note: Caller must send enough ETH to cover both Pyth and Entropy fees
     */
    function processEndedBattle(
        uint256 battleStart,
        uint256 battleEnd,
        bytes[] calldata priceUpdate
    ) public payable {
        bytes32 battleKey = getBattleKey(battleStart, battleEnd);

        // Update Pyth price feeds with latest data (requires fee payment)
        uint updatePriceFee = pyth.getUpdateFee(priceUpdate);
        pyth.updatePriceFeeds{value: updatePriceFee}(priceUpdate);

        // Calculate final results for all predictions in this battle
        for (uint i = 0; i < battleToPredictions[battleKey].length; i++) {
            // Get the prediction to update
            Prediction storage prediction = battleToPredictions[battleKey][i];

            // Get the final price for this prediction's asset (max 60 seconds old)
            PythStructs.Price memory price = pyth.getPriceNoOlderThan(
                prediction.priceFeedId,
                60
            );
            prediction.priceEnd = price.price;

            // Calculate percentage change in basis points (1 basis point = 0.01%)
            // Formula: ((priceEnd - priceStart) / priceStart) * 10000
            // Example: 5% increase = 500 basis points
            if (prediction.priceStart != 0) {
                prediction.priceChange =
                    ((prediction.priceEnd - prediction.priceStart) * 10000) /
                    prediction.priceStart;
            } else {
                // Handle edge case where starting price is zero
                prediction.priceChange = 0;
            }
        }

        // Immediately award the prediction with the highest price change
        (address topWinner, int64 topChange) = rewardTopPriceChangePrediction(
            battleKey
        );

        // Request verifiable randomness from Entropy for random reward distribution
        // This is an async operation - the callback will handle the random reward
        uint256 entropyFee = entropy.getFeeV2();
        uint64 sequenceNumber = entropy.requestV2{value: entropyFee}();

        // Store mapping to identify which battle this random number is for
        sequenceToBattle[sequenceNumber] = battleKey;

        // Emit event confirming battle end processing with results
        emit BattleEndProcessed(
            battleStart,
            battleEnd,
            battleKey,
            battleToPredictions[battleKey].length,
            topWinner,
            topChange
        );
    }

    // =============================================================
    // Internal functions
    // =============================================================

    /**
     * @dev Callback function called by Entropy contract when random number is generated
     * @param sequenceNumber The sequence number identifying the randomness request
     * @param randomNumber The generated random bytes32 value
     *
     * This function automatically processes the random reward distribution
     * when Entropy delivers the requested randomness.
     */
    function entropyCallback(
        uint64 sequenceNumber,
        address /* provider */,
        bytes32 randomNumber
    ) internal override {
        // Process the random reward using the generated random number
        rewardRandomPrediction(sequenceNumber, randomNumber);
    }

    /**
     * @dev Required by IEntropyConsumer interface
     * @return The address of the Entropy contract authorized to call the callback
     */
    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }

    /**
     * @dev Finds and rewards the prediction with the highest price change
     * @param battleKey The unique identifier for the battle
     * @return The address of the winner and their price change percentage
     *
     * This function:
     * 1. Searches all predictions for the highest price change
     * 2. Sets the reward amount on the winning prediction
     * 3. Transfers the reward ETH to the winner's address
     * 4. Returns winner details for event emission
     */
    function rewardTopPriceChangePrediction(
        bytes32 battleKey
    ) internal returns (address, int64) {
        Prediction[] storage predictions = battleToPredictions[battleKey];

        if (predictions.length == 0) {
            return (address(0), 0); // No predictions exist for this battle
        }

        // Initialize with first prediction as the current best
        uint256 topIndex = 0;
        int64 highestChange = predictions[0].priceChange;

        // Search for the prediction with the highest price change
        for (uint256 i = 1; i < predictions.length; i++) {
            if (predictions[i].priceChange > highestChange) {
                highestChange = predictions[i].priceChange;
                topIndex = i;
            }
        }

        // Record the reward amount in the winning prediction
        predictions[topIndex].topPriceChangeReward = TOP_PRICE_CHANGE_REWARD;

        // Transfer the reward ETH to the winner
        (bool success, ) = payable(predictions[topIndex].creatorAddress).call{
            value: TOP_PRICE_CHANGE_REWARD
        }("");
        require(success, "Reward transfer failed");

        return (predictions[topIndex].creatorAddress, highestChange);
    }

    /**
     * @dev Randomly selects and rewards a prediction using Entropy-provided randomness
     * @param sequenceNumber The sequence number from the original randomness request
     * @param randomNumber The random bytes32 value from Entropy
     *
     * This function:
     * 1. Identifies the battle associated with the sequence number
     * 2. Uses the random number to select a prediction uniformly at random
     * 3. Sets the reward amount on the selected prediction
     * 4. Transfers the reward ETH to the selected participant
     * 5. Cleans up the sequence number mapping
     */
    function rewardRandomPrediction(
        uint64 sequenceNumber,
        bytes32 randomNumber
    ) internal {
        // Retrieve the battle associated with this randomness request
        bytes32 battleKey = sequenceToBattle[sequenceNumber];

        // Get all predictions for this battle
        Prediction[] storage predictions = battleToPredictions[battleKey];

        if (predictions.length == 0) {
            return; // No predictions exist to reward
        }

        // Convert random number to a valid array index
        int256 randomIndex = mapRandomNumber(
            randomNumber,
            0,
            int256(predictions.length - 1)
        );

        // Record the reward amount in the randomly selected prediction
        predictions[uint256(randomIndex)].randomReward = RANDOM_REWARD;

        // Clean up the sequence number mapping to prevent reuse
        delete sequenceToBattle[sequenceNumber];

        // Transfer the reward ETH to the randomly selected participant
        (bool success, ) = payable(
            predictions[uint256(randomIndex)].creatorAddress
        ).call{value: RANDOM_REWARD}("");
        require(success, "Random reward transfer failed");
    }

    /**
     * @dev Maps a random bytes32 value to an integer within a specified range
     * @param randomNumber The random bytes32 value from Entropy
     * @param minRange The minimum value (inclusive)
     * @param maxRange The maximum value (inclusive)
     * @return A random integer between minRange and maxRange (inclusive)
     *
     * This function provides uniform distribution across the specified range
     * by using modular arithmetic on the random number.
     */
    function mapRandomNumber(
        bytes32 randomNumber,
        int256 minRange,
        int256 maxRange
    ) internal pure returns (int256) {
        require(minRange <= maxRange, "Invalid range");

        // Calculate the size of the range (inclusive)
        uint256 range = uint256(maxRange - minRange + 1);

        // Convert random bytes to uint256 for modular arithmetic
        uint256 randomUint = uint256(randomNumber);

        // Map to range and shift by minimum value
        return minRange + int256(randomUint % range);
    }
}
