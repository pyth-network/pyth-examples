// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IEntropyConsumer
 * @notice Interface for contracts that consume Pyth Entropy random numbers
 * @dev Based on Pyth Entropy documentation
 */
interface IEntropyConsumer {
    /**
     * @notice Callback function called by Pyth Entropy when random number is ready
     * @param sequenceNumber The sequence number of the request
     * @param randomBytes Random bytes provided by Pyth Entropy
     */
    function entropyCallback(uint64 sequenceNumber, bytes32 randomBytes) external;
}

