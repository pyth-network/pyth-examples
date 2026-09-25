// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IEntropyConsumer } from "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
import { IEntropyV2 } from "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";

contract RandomSeed is IEntropyConsumer {
    IEntropyV2 public entropy;
    bytes32 public currentSeed;
    
    event RandomSeedGenerated(bytes32 seed);
    
    constructor(address entropyAddress) {
        entropy = IEntropyV2(entropyAddress);
    }
    
    function requestRandomSeed() external payable {
        uint256 fee = entropy.getFeeV2();
        require(msg.value >= fee, "Insufficient fee");
        uint64 sequenceNumber = entropy.requestV2{ value: fee }();
    }
    
    function entropyCallback(uint64, address, bytes32 randomNumber) internal override {
        currentSeed = randomNumber;
        emit RandomSeedGenerated(randomNumber);
    }
    
    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }
}