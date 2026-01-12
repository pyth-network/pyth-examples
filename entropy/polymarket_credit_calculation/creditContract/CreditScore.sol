// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
import "@pythnetwork/entropy-sdk-solidity/EntropyStructsV2.sol";

contract CreditScore is IEntropyConsumer {
    // Structs to hold Polymarket data
    struct ClosedPosition {
        int256 realizedPnl;
        uint256 totalBought;
        bytes32 asset;
    }

    struct CurrentPosition {
        uint256 size;
        uint256 avgPrice;
        int256 initialValue;
        int256 currentValue;
        int256 cashPnl;
        int256 percentPnl;
        uint256 totalBought;
        int256 realizedPnl;
        int256 percentRealizedPnl;
        uint256 curPrice;
    }

    struct UserData {
        string name;
        uint256 value;
        ClosedPosition[] closedPositions;
        CurrentPosition[] currentPositions;
    }

    struct CreditScoreData {
        uint256 score;
        uint256 timestamp;
        bytes32 entropyUsed;
        bool isCalculated;
    }

    // Events
    event CreditScoreRequested(address indexed user, uint64 sequenceNumber);
    event CreditScoreCalculated(address indexed user, uint256 score, bytes32 entropyUsed);

    // State variables
    IEntropyV2 private entropy;
    address private entropyProvider;

    mapping(address => UserData) public userData;
    mapping(address => CreditScoreData) public creditScores;
    mapping(uint64 => address) private sequenceToUser;
    mapping(address => uint64) private userToSequence;

    // Constants for score calculation
    uint256 private constant MAX_SCORE = 999;
    uint256 private constant MIN_SCORE = 0;
    uint256 private constant ENTROPY_VARIANCE_WEIGHT = 50; // Max 50 points of variance from entropy

    constructor(address _entropy, address _entropyProvider) {
        entropy = IEntropyV2(_entropy);
        entropyProvider = _entropyProvider;
    }

    // Submit user data and request credit score calculation
    function submitUserDataAndRequestScore(
        string memory name,
        uint256 value,
        ClosedPosition[] memory closedPositions,
        CurrentPosition[] memory currentPositions
    ) external payable {
        // Clear previous data
        delete userData[msg.sender].closedPositions;
        delete userData[msg.sender].currentPositions;

        // Store user data
        userData[msg.sender].name = name;
        userData[msg.sender].value = value;

        // Store closed positions
        for (uint i = 0; i < closedPositions.length; i++) {
            userData[msg.sender].closedPositions.push(closedPositions[i]);
        }

        // Store current positions
        for (uint i = 0; i < currentPositions.length; i++) {
            userData[msg.sender].currentPositions.push(currentPositions[i]);
        }

        // Request entropy for variance
        uint256 fee = entropy.getFeeV2();
        require(msg.value >= fee, "Insufficient fee for entropy");

        uint64 sequenceNumber = entropy.requestV2{ value: fee }();
        sequenceToUser[sequenceNumber] = msg.sender;
        userToSequence[msg.sender] = sequenceNumber;

        emit CreditScoreRequested(msg.sender, sequenceNumber);
    }

    // Calculate base credit score without entropy (for preview purposes)
    function calculateBaseScore(address user) public view returns (uint256) {
        UserData storage data = userData[user];

        if (data.closedPositions.length == 0 && data.currentPositions.length == 0) {
            return 500; // Default middle score for new users
        }

        uint256 score = 0;
        uint256 weightSum = 0;

        // 1. Calculate profit/loss metrics from closed positions (40% weight)
        if (data.closedPositions.length > 0) {
            int256 totalPnl = 0;
            uint256 totalInvested = 0;
            uint256 winCount = 0;

            for (uint i = 0; i < data.closedPositions.length; i++) {
                totalPnl += data.closedPositions[i].realizedPnl;
                totalInvested += data.closedPositions[i].totalBought;
                if (data.closedPositions[i].realizedPnl > 0) {
                    winCount++;
                }
            }

            // Win rate (0-200 points)
            uint256 winRate = (winCount * 200) / data.closedPositions.length;
            score += winRate;

            // Profit ratio (0-200 points)
            if (totalInvested > 0) {
                if (totalPnl > 0) {
                    uint256 profitRatio = (uint256(totalPnl) * 200) / totalInvested;
                    if (profitRatio > 200) profitRatio = 200; // Cap at 200
                    score += profitRatio;
                } else {
                    // Negative PnL reduces score
                    uint256 lossRatio = (uint256(-totalPnl) * 100) / totalInvested;
                    if (lossRatio > 200) lossRatio = 200;
                    score += 0; // No additional score for losses
                }
            }
            weightSum += 400;
        }

        // 2. Current positions performance (30% weight)
        if (data.currentPositions.length > 0) {
            int256 currentTotalPnl = 0;
            uint256 currentTotalInvested = 0;

            for (uint i = 0; i < data.currentPositions.length; i++) {
                currentTotalPnl += data.currentPositions[i].cashPnl;
                currentTotalInvested += data.currentPositions[i].totalBought;
            }

            // Current position health (0-300 points)
            if (currentTotalInvested > 0) {
                if (currentTotalPnl >= 0) {
                    uint256 currentRatio = (uint256(currentTotalPnl) * 150) / currentTotalInvested;
                    if (currentRatio > 150) currentRatio = 150;
                    score += 150 + currentRatio; // Base 150 + up to 150 bonus
                } else {
                    // Losses reduce from base
                    uint256 lossRatio = (uint256(-currentTotalPnl) * 150) / currentTotalInvested;
                    if (lossRatio > 150) lossRatio = 150;
                    score += (150 - lossRatio);
                }
            } else {
                score += 150; // Neutral if no current positions
            }
            weightSum += 300;
        }

        // 3. Portfolio value consideration (20% weight)
        if (data.value > 0) {
            // Scale based on value (logarithmic scale)
            uint256 valueScore = 0;
            if (data.value >= 1000000) {
                // 1M+
                valueScore = 200;
            } else if (data.value >= 500000) {
                // 500k+
                valueScore = 180;
            } else if (data.value >= 100000) {
                // 100k+
                valueScore = 150;
            } else if (data.value >= 50000) {
                // 50k+
                valueScore = 120;
            } else if (data.value >= 10000) {
                // 10k+
                valueScore = 100;
            } else {
                valueScore = (data.value * 100) / 10000; // Linear scale below 10k
            }
            score += valueScore;
            weightSum += 200;
        }

        // 4. Activity bonus (10% weight)
        uint256 totalTrades = data.closedPositions.length + data.currentPositions.length;
        uint256 activityScore = 0;
        if (totalTrades >= 20) {
            activityScore = 100;
        } else if (totalTrades >= 10) {
            activityScore = 80;
        } else if (totalTrades >= 5) {
            activityScore = 60;
        } else if (totalTrades > 0) {
            activityScore = (totalTrades * 60) / 5;
        }
        score += activityScore;
        weightSum += 100;

        // Normalize to 0-949 range (leaving room for entropy variance)
        if (weightSum > 0) {
            score = (score * 949) / weightSum;
        }

        return score;
    }

    // Entropy callback implementation
    function entropyCallback(uint64 sequenceNumber, address, bytes32 randomNumber) internal override {
        address user = sequenceToUser[sequenceNumber];
        require(user != address(0), "Invalid sequence number");

        // Calculate base score
        uint256 baseScore = calculateBaseScore(user);

        // Add entropy-based variance (±ENTROPY_VARIANCE_WEIGHT points)
        uint256 entropyFactor = uint256(randomNumber) % (ENTROPY_VARIANCE_WEIGHT * 2 + 1);
        int256 variance = int256(entropyFactor) - int256(ENTROPY_VARIANCE_WEIGHT);

        // Calculate final score with bounds checking
        int256 finalScoreInt = int256(baseScore) + variance;
        uint256 finalScore;

        if (finalScoreInt < 0) {
            finalScore = 0;
        } else if (finalScoreInt > int256(MAX_SCORE)) {
            finalScore = MAX_SCORE;
        } else {
            finalScore = uint256(finalScoreInt);
        }

        // Store the calculated score
        creditScores[user] = CreditScoreData({
            score: finalScore,
            timestamp: block.timestamp,
            entropyUsed: randomNumber,
            isCalculated: true
        });

        emit CreditScoreCalculated(user, finalScore, randomNumber);

        // Clean up mappings
        delete sequenceToUser[sequenceNumber];
        delete userToSequence[user];
    }

    // Required by IEntropyConsumer
    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }

    // Get the fee required for entropy
    function getEntropyFee() public view returns (uint256) {
        return entropy.getFeeV2();
    }

    // Get user's credit score
    function getCreditScore(address user) external view returns (uint256 score, uint256 timestamp, bool isCalculated) {
        CreditScoreData memory data = creditScores[user];
        return (data.score, data.timestamp, data.isCalculated);
    }

    // Get user's pending sequence number
    function getPendingSequence(address user) external view returns (uint64) {
        return userToSequence[user];
    }

    // Check if user has pending score calculation
    function hasPendingCalculation(address user) external view returns (bool) {
        return userToSequence[user] != 0;
    }

    receive() external payable {}
}
