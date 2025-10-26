// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IEntropyV2 } from "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import { IEntropyConsumer } from "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IAleaArtNFT {
    struct NFTData {
        uint256 tokenId;
        address owner;
        string ipfsHash;
        string prompt;
        uint256 price;
        bool isForSale;
        address creator;
        uint256 createdAt;
    }
    
    function getAllNFTs() external view returns (NFTData[] memory);
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract SpotlightSelector is IEntropyConsumer, Ownable, ReentrancyGuard {
    IAleaArtNFT public aleaArtNFT;
    
    // 🔹 Entropy contract on Arbitrum Sepolia
    IEntropyV2 public constant ENTROPY =
        IEntropyV2(0x549Ebba8036Ab746611B4fFA1423eb0A4Df61440);

    // 🔹 Default provider (Arbitrum Sepolia)
    address public constant DEFAULT_PROVIDER =
        0x6CC14824Ea2918f5De5C2f75A9Da968ad4BD6344;

    // 🔹 Gas limit for the callback
    uint32 public constant CALLBACK_GAS_LIMIT = 200_000;
    
    struct SpotlightInfo {
        uint256 tokenId;
        address owner;
        string ipfsHash;
        string prompt;
        uint256 price;
        bool isForSale;
        address creator;
        uint256 createdAt;
        uint256 spotlightStartTime;
        uint256 spotlightDuration;
        bool isActive;
    }
    
    mapping(uint256 => SpotlightInfo) public spotlights;
    mapping(uint64 => uint256) public requestToSpotlightId;
    uint256 public currentSpotlightId;
    uint256 public spotlightDuration = 24 hours; // Default 24 hours
    uint256 public spotlightFee = 0.001 ether; // Fee to request new spotlight
    
    event SpotlightRequested(uint256 indexed spotlightId, uint64 indexed requestId, uint256 feePaid);
    event SpotlightSelected(uint256 indexed spotlightId, uint256 indexed tokenId, address indexed owner);
    event SpotlightDurationUpdated(uint256 newDuration);
    event SpotlightFeeUpdated(uint256 newFee);
    
    constructor(address _aleaArtNFT) Ownable(msg.sender) {
        aleaArtNFT = IAleaArtNFT(_aleaArtNFT);
    }
    
    // 🔹 Required by IEntropyConsumer
    function getEntropy() internal pure override returns (address) {
        return address(ENTROPY);
    }
    
    // 🔹 View fee (dynamically determined by provider gas limit)
    function quoteEntropyFee() public view returns (uint256) {
        return ENTROPY.getFeeV2(DEFAULT_PROVIDER, CALLBACK_GAS_LIMIT);
    }
    
    /**
     * @dev Request a new spotlight selection using Pyth Entropy
     */
    function requestSpotlight() external payable nonReentrant {
        require(msg.value >= spotlightFee, "Insufficient fee");
        
        uint256 spotlightId = currentSpotlightId + 1;
        currentSpotlightId = spotlightId;
        
        // Get the entropy fee
        uint256 entropyFee = ENTROPY.getFeeV2(DEFAULT_PROVIDER, CALLBACK_GAS_LIMIT);
        
        // Request randomness from Pyth Entropy
        uint64 requestId = ENTROPY.requestV2{ value: entropyFee }(
            DEFAULT_PROVIDER,
            CALLBACK_GAS_LIMIT
        );
        
        requestToSpotlightId[requestId] = spotlightId;
        
        emit SpotlightRequested(spotlightId, requestId, msg.value);
        
        // Refund excess payment
        if (msg.value > spotlightFee) {
            payable(msg.sender).transfer(msg.value - spotlightFee);
        }
    }
    
    /**
     * @dev Callback function called by Pyth Entropy when randomness is available
     */
    function entropyCallback(
        uint64 sequence,
        address provider,
        bytes32 randomNumber
    ) internal override {
        uint256 spotlightId = requestToSpotlightId[sequence];
        require(spotlightId > 0, "Invalid request ID");
        
        // Get all NFTs from the marketplace
        IAleaArtNFT.NFTData[] memory allNFTs = aleaArtNFT.getAllNFTs();
        
        require(allNFTs.length > 0, "No NFTs available for spotlight");
        
        // Use randomness to select a random NFT
        uint256 randomValue = uint256(randomNumber);
        uint256 selectedIndex = randomValue % allNFTs.length;
        
        IAleaArtNFT.NFTData memory selectedNFT = allNFTs[selectedIndex];
        
        // Create spotlight info
        SpotlightInfo memory spotlight = SpotlightInfo({
            tokenId: selectedNFT.tokenId,
            owner: selectedNFT.owner,
            ipfsHash: selectedNFT.ipfsHash,
            prompt: selectedNFT.prompt,
            price: selectedNFT.price,
            isForSale: selectedNFT.isForSale,
            creator: selectedNFT.creator,
            createdAt: selectedNFT.createdAt,
            spotlightStartTime: block.timestamp,
            spotlightDuration: spotlightDuration,
            isActive: true
        });
        
        spotlights[spotlightId] = spotlight;
        
        emit SpotlightSelected(spotlightId, selectedNFT.tokenId, selectedNFT.owner);
    }
    
    /**
     * @dev Get current active spotlight
     */
    function getCurrentSpotlight() external view returns (SpotlightInfo memory) {
        require(currentSpotlightId > 0, "No spotlight available");
        
        SpotlightInfo memory spotlight = spotlights[currentSpotlightId];
        require(spotlight.isActive, "No active spotlight");
        require(
            block.timestamp <= spotlight.spotlightStartTime + spotlight.spotlightDuration,
            "Spotlight expired"
        );
        
        return spotlight;
    }
    
    /**
     * @dev Check if spotlight is active and not expired
     */
    function isSpotlightActive(uint256 spotlightId) external view returns (bool) {
        SpotlightInfo memory spotlight = spotlights[spotlightId];
        return spotlight.isActive && 
               block.timestamp <= spotlight.spotlightStartTime + spotlight.spotlightDuration;
    }
    
    /**
     * @dev Get spotlight by ID
     */
    function getSpotlight(uint256 spotlightId) external view returns (SpotlightInfo memory) {
        return spotlights[spotlightId];
    }
    
    /**
     * @dev Update spotlight duration (only owner)
     */
    function setSpotlightDuration(uint256 _duration) external onlyOwner {
        require(_duration > 0, "Duration must be greater than 0");
        spotlightDuration = _duration;
        emit SpotlightDurationUpdated(_duration);
    }
    
    /**
     * @dev Update spotlight fee (only owner)
     */
    function setSpotlightFee(uint256 _fee) external onlyOwner {
        spotlightFee = _fee;
        emit SpotlightFeeUpdated(_fee);
    }
    
    /**
     * @dev Withdraw contract balance (only owner)
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        payable(owner()).transfer(balance);
    }
    
    /**
     * @dev Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
