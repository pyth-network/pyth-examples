// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";

/**
 * @title PythIntegration
 * @notice Simple wrapper for Pyth Entropy random number generation
 * @dev Based on Pyth Entropy best practices: https://docs.pyth.network/entropy/entropy-sol/best-practices
 * This contract acts as a thin wrapper - the callback goes directly to the consumer
 */
contract PythIntegration is Ownable {
    // Pyth Entropy contract (using official SDK interface)
    IEntropyV2 public immutable pyth;

    event RandomNumberRequested(uint64 indexed sequenceNumber, address indexed consumer);

    /**
     * @notice Constructor
     * @param _pyth Address of Pyth Entropy contract
     */
    constructor(address _pyth) Ownable(msg.sender) {
        require(_pyth != address(0), "PythIntegration: invalid Pyth address");
        pyth = IEntropyV2(_pyth);
    }

    /**
     * @notice Request a random number from Pyth Entropy
     * @param callbackHandler The contract that will receive the callback (must implement IEntropyConsumer)
     * @param userRandomness Additional user-provided randomness (optional, can be 0)
     * @return sequenceNumber The sequence number for tracking this request
     * @dev The callback will go directly to callbackHandler.entropyCallback()
     */
    /**
     * @notice Request a random number from Pyth Entropy
     * @param callbackHandler The contract that will receive the callback (must inherit IEntropyConsumer)
     * @return sequenceNumber The sequence number for tracking this request
     * @dev The callback will go directly to callbackHandler.entropyCallback()
     * Note: According to official SDK, requestV2() uses default provider and generates userRandomness internally
     */
    function requestRandomNumber(
        IEntropyConsumer callbackHandler
    ) external payable returns (uint64 sequenceNumber) {
        // Get fee dynamically from Pyth contract
        uint128 requiredFee;
        try pyth.getFeeV2() returns (uint128 fee) {
            requiredFee = fee;
        } catch {
            // Fallback to documented fee for Base Sepolia if getFeeV2() fails
            requiredFee = 15000000000000; // 15,000 gwei = 0.000015 ETH
        }
        
        require(msg.value >= requiredFee, "PythIntegration: insufficient fee");

        // Request random number using official SDK
        // requestV2() without parameters uses default provider and generates userRandomness internally
        // The callbackHandler must inherit IEntropyConsumer and implement getEntropy()
        sequenceNumber = pyth.requestV2{value: requiredFee}();

        // Refund excess ETH if any
        if (msg.value > requiredFee) {
            payable(msg.sender).transfer(msg.value - requiredFee);
        }

        emit RandomNumberRequested(sequenceNumber, address(callbackHandler));
    }

    /**
     * @notice Get the fee required for a request
     * @return fee The fee amount in wei
     */
    function getRequiredFee() external view returns (uint128) {
        try pyth.getFeeV2() returns (uint128 fee) {
            return fee;
        } catch {
            // Fallback to documented fee for Base Sepolia
            return 15000000000000; // 15,000 gwei = 0.000015 ETH
        }
    }

    /**
     * @notice Withdraw contract balance (only owner)
     * @param to Address to receive funds
     */
    function withdrawBalance(address payable to) external onlyOwner {
        require(to != address(0), "PythIntegration: invalid recipient");
        to.transfer(address(this).balance);
    }
}
