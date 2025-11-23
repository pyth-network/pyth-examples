// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IEntropyConsumer.sol";

/**
 * @title IPythEntropy
 * @notice Interface for Pyth Entropy V2
 * @dev Based on Pyth Entropy documentation - callback pattern
 */
interface IPythEntropy {
    /**
     * @notice Request a random number with callback
     * @param consumer The contract that will receive the random number via callback
     * @param provider The provider address (optional, can be address(0))
     * @param userRandomness Additional user-provided randomness (optional, can be 0)
     * @return sequenceNumber The sequence number for tracking this request
     */
    function request(
        IEntropyConsumer consumer,
        address provider,
        uint256 userRandomness
    ) external payable returns (uint64 sequenceNumber);

    /**
     * @notice Request a random number with callback (alternative method)
     * @param consumer The contract that will receive the random number via callback
     * @param provider The provider address (optional, can be address(0))
     * @param userRandomness Additional user-provided randomness (optional, can be 0)
     * @return sequenceNumber The sequence number for tracking this request
     */
    function requestV2(
        IEntropyConsumer consumer,
        address provider,
        uint256 userRandomness
    ) external payable returns (uint64 sequenceNumber);

    /**
     * @notice Get the fee required for a request
     * @return fee The fee amount in wei
     */
    function fee() external view returns (uint256);

    /**
     * @notice Check if a sequence number has been revealed
     * @param sequenceNumber The sequence number to check
     * @return true if revealed
     */
    function isRevealed(uint64 sequenceNumber) external view returns (bool);
}

