// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@pythnetwork/entropy-sdk-solidity/IEntropy.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";

contract EntropyMock is IEntropy {
    mapping(address => uint128) public providerFees;
    mapping(uint64 => address) public requests;
    mapping(uint64 => address) public requestProviders;
    uint64 public nextSequenceNumber = 1;

    // Implement all interface methods to satisfy the compiler
    // Most are just stubs that revert or return default values

    function register(
        uint128 feeInWei,
        bytes32 commitment,
        bytes calldata commitmentMetadata,
        uint64 chainLength,
        bytes calldata uri
    ) external override {}

    function withdraw(uint128 amount) external override {}

    function withdrawAsFeeManager(address provider, uint128 amount) external override {}

    function request(
        address provider,
        bytes32 userCommitment,
        bool useBlockHash
    ) external payable override returns (uint64 assignedSequenceNumber) {
        return 0;
    }

    function requestWithCallback(
        address provider,
        bytes32 userRandomNumber
    ) external payable override returns (uint64 assignedSequenceNumber) {
        uint64 seq = nextSequenceNumber++;
        requests[seq] = msg.sender;
        requestProviders[seq] = provider;
        return seq;
    }

    function reveal(
        address provider,
        uint64 sequenceNumber,
        bytes32 userRevelation,
        bytes32 providerRevelation
    ) external override returns (bytes32 randomNumber) {
        return bytes32(0);
    }

    function revealWithCallback(
        address provider,
        uint64 sequenceNumber,
        bytes32 userRandomNumber,
        bytes32 providerRevelation
    ) external override {
        address consumer = requests[sequenceNumber];
        require(consumer != address(0), "Request not found");
        
        bytes32 randomNumber = keccak256(abi.encodePacked(userRandomNumber, providerRevelation));
        
        // Call the wrapper function in IEntropyConsumer
        IEntropyConsumer(consumer)._entropyCallback(sequenceNumber, provider, randomNumber);
    }

    function getProviderInfo(
        address provider
    ) external view override returns (EntropyStructs.ProviderInfo memory info) {}

    function getDefaultProvider() external view override returns (address provider) {
        return address(0);
    }

    function getRequest(
        address provider,
        uint64 sequenceNumber
    ) external view override returns (EntropyStructs.Request memory req) {}

    function getFee(address provider) external view override returns (uint128 feeAmount) {
        return providerFees[provider];
    }

    function getAccruedPythFees()
        external
        view
        override
        returns (uint128 accruedPythFeesInWei) {}

    function setProviderFee(uint128 newFeeInWei) external override {
        providerFees[msg.sender] = newFeeInWei;
    }

    function setProviderFeeAsFeeManager(
        address provider,
        uint128 newFeeInWei
    ) external override {
        providerFees[provider] = newFeeInWei;
    }

    function setProviderUri(bytes calldata newUri) external override {}

    function setFeeManager(address manager) external override {}

    function constructUserCommitment(
        bytes32 userRandomness
    ) external pure override returns (bytes32 userCommitment) {
        return keccak256(abi.encodePacked(userRandomness));
    }

    function combineRandomValues(
        bytes32 userRandomness,
        bytes32 providerRandomness,
        bytes32 blockHash
    ) external pure override returns (bytes32 combinedRandomness) {
        return keccak256(abi.encodePacked(userRandomness, providerRandomness, blockHash));
    }
}
