// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IEntropyV2
 * @notice Minimal subset of the Pyth Entropy V2 interface used by ProjectRaffle.
 */
interface IEntropyV2 {
    /**
     * @notice Returns the default randomness provider configured in the Entropy contract.
     */
    function getDefaultProvider() external view returns (address);

    /**
     * @notice Returns the fee required to request randomness from a provider.
     */
    function getFee(address provider) external view returns (uint256);

    /**
     * @notice Requests randomness from the Entropy contract.
     * @param provider Randomness provider address.
     * @param userRandomNumber User provided commitment (bytes32).
     * @param useBlockhash Flag to mix in the blockhash.
     * @return sequenceNumber Unique sequence identifier for the request.
     */
    function request(
        address provider,
        bytes32 userRandomNumber,
        bool useBlockhash
    ) external payable returns (uint64 sequenceNumber);
}

