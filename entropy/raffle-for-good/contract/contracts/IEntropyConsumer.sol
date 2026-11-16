// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IEntropyConsumer
 * @notice Minimal interface for contracts that consume Pyth Entropy randomness.
 * @dev Only the functions required by the project have been declared.
 */
interface IEntropyConsumer {
    /**
     * @notice Callback invoked by the Entropy contract when randomness is ready.
     */
    function entropyCallback(
        uint64 sequenceNumber,
        address provider,
        bytes32 randomNumber
    ) external;

    /**
     * @notice Returns the address of the Entropy contract being used.
     */
    function getEntropy() external view returns (address);
}

