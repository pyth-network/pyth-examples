// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IEntropyV2 } from "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import { IEntropyConsumer } from "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";

contract EntropyBeasts is IEntropyConsumer {
    IEntropyV2 private entropy;
    
    struct Beast {
        uint256 tokenId;
        uint256 strength;
        uint256 intelligence;
    }
    
    mapping(uint256 => Beast) public beasts;
    mapping(uint64 => uint256) public pendingMints;
    address public provider;
    uint256 public totalSupply;
    mapping(uint64 => bool) public pendingIsBig;
    event BeastMinted(uint256 indexed tokenId, uint256 strength, uint256 intelligence, uint32 gasUsed);
    
    constructor(address _entropy) {
        entropy = IEntropyV2(_entropy);
        provider = entropy.getDefaultProvider();
    }
    
    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }
    
    function mintBeast(uint32 gasLimit, bool isBig) external payable returns (uint256) {
        uint256 fee = entropy.getFeeV2(gasLimit);
        require(msg.value >= fee, "Insufficient fee");
        
        uint256 tokenId = ++totalSupply;
        uint64 sequenceNumber = entropy.requestV2{value: fee}(gasLimit);
        
        pendingMints[sequenceNumber] = tokenId;
        pendingIsBig[sequenceNumber] = isBig;
        
        return tokenId;
    }
    
    
    function entropyCallback(
        uint64 sequenceNumber,
        address,
        bytes32 randomNumber
    ) internal override {
        uint256 tokenId = pendingMints[sequenceNumber];
        require(tokenId != 0, "Invalid sequence number");
        
        uint256 seed = uint256(randomNumber);
        
        uint256 strength = (seed % 100) + 1;
        uint256 intelligence = (uint256(keccak256(abi.encode(seed, 1))) % 100) + 1;
        
        beasts[tokenId] = Beast({
            tokenId: tokenId,
            strength: strength,
            intelligence: intelligence
        });
        
        if (pendingIsBig[sequenceNumber]) {
            uint256[] memory wasteGas = new uint256[](1000);
            for (uint256 i = 0; i < 1000; i++) {
                wasteGas[i] = uint256(keccak256(abi.encodePacked(i, seed))) % 1000000;
            }
        }
        
        delete pendingMints[sequenceNumber];
        delete pendingIsBig[sequenceNumber];
        
        uint32 gasUsed = uint32(gasleft());
        emit BeastMinted(tokenId, strength, intelligence, gasUsed);
    }
    
    function getBeast(uint256 tokenId) external view returns (Beast memory) {
        require(beasts[tokenId].tokenId != 0, "Beast not found");
        return beasts[tokenId];
    }
    
}