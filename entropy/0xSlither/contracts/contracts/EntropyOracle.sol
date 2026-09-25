// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";

/**
 * @title EntropyOracle
 * @dev Fetches randomness from Pyth Entropy for 0xSlither matches
 * Deployed on Base Sepolia, server reads seeds cross-chain
 */
contract EntropyOracle is IEntropyConsumer, Ownable {
    IEntropyV2 public entropy;
    address public entropyProvider;
    address public authorizedServer;

    // Match ID => Pyth sequence number (request ID)
    mapping(bytes32 => uint64) public entropyRequestIdByMatch;
    
    // Match ID => Revealed random seed
    mapping(bytes32 => bytes32) public entropySeedByMatch;
    
    // Sequence number => Match ID (for callback routing)
    mapping(uint64 => bytes32) private sequenceToMatchId;

    // Events
    event EntropyRequested(bytes32 indexed matchId, uint64 requestId);
    event EntropyStored(bytes32 indexed matchId, bytes32 seed);
    event AuthorizedServerUpdated(address indexed newServer);

    error InsufficientFee();
    error OnlyAuthorizedServer();
    error EntropyAlreadyRequested();
    error EntropyNotAvailable();

    modifier onlyAuthorizedServer() {
        if (msg.sender != authorizedServer) revert OnlyAuthorizedServer();
        _;
    }

    /**
     * @dev Constructor
     * @param _entropy Address of Pyth Entropy contract on Base Sepolia
     * @param _authorizedServer Address of the game server wallet
     */
    constructor(
        address _entropy,
        address _authorizedServer
    ) Ownable(msg.sender) {
        require(_entropy != address(0), "Invalid entropy address");
        require(_authorizedServer != address(0), "Invalid server address");
        
        entropy = IEntropyV2(_entropy);
        authorizedServer = _authorizedServer;
        
        // Use Pyth's default provider
        entropyProvider = entropy.getDefaultProvider();
    }

    /**
     * @dev Request entropy for a new match
     * @param matchId Unique match identifier (keccak256 hash)
     */
    function requestMatchEntropy(bytes32 matchId) external payable onlyAuthorizedServer {
        require(matchId != bytes32(0), "Invalid match ID");
        
        // Ensure we haven't already requested entropy for this match
        if (entropyRequestIdByMatch[matchId] != 0) {
            revert EntropyAlreadyRequested();
        }

        // Get the fee required by Pyth Entropy for default provider
        uint256 fee = entropy.getFeeV2();
        if (msg.value < fee) {
            revert InsufficientFee();
        }

        // Request random number from Pyth Entropy using default provider
        // The protocol will call entropyCallback when the random number is revealed
        uint64 sequenceNumber = entropy.requestV2{value: fee}();

        // Store mappings for callback routing
        entropyRequestIdByMatch[matchId] = sequenceNumber;
        sequenceToMatchId[sequenceNumber] = matchId;

        emit EntropyRequested(matchId, sequenceNumber);

        // Refund excess payment
        if (msg.value > fee) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - fee}("");
            require(success, "Refund failed");
        }
    }

    /**
     * @dev Callback function called by Pyth Entropy contract
     * This is called automatically when the random number is revealed
     * @param sequenceNumber The sequence number of the request
     * @param randomNumber The revealed random number
     */
    function entropyCallback(
        uint64 sequenceNumber,
        address, // provider (unused in our case)
        bytes32 randomNumber
    ) internal override {
        // Look up which match this sequence number belongs to
        bytes32 matchId = sequenceToMatchId[sequenceNumber];
        require(matchId != bytes32(0), "Unknown sequence number");

        // Store the revealed seed
        entropySeedByMatch[matchId] = randomNumber;

        emit EntropyStored(matchId, randomNumber);
    }

    /**
     * @dev Get the entropy contract address (required by IEntropyConsumer)
     */
    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }

    /**
     * @dev Get the revealed seed for a match
     * @param matchId Match identifier
     * @return seed The revealed random seed (bytes32(0) if not yet available)
     */
    function getMatchSeed(bytes32 matchId) external view returns (bytes32) {
        return entropySeedByMatch[matchId];
    }

    /**
     * @dev Check if entropy has been requested for a match
     * @param matchId Match identifier
     * @return True if entropy has been requested
     */
    function hasRequestedEntropy(bytes32 matchId) external view returns (bool) {
        return entropyRequestIdByMatch[matchId] != 0;
    }

    /**
     * @dev Check if entropy seed is available for a match
     * @param matchId Match identifier
     * @return True if seed is available
     */
    function isSeedAvailable(bytes32 matchId) external view returns (bool) {
        return entropySeedByMatch[matchId] != bytes32(0);
    }

    /**
     * @dev Get the current Entropy fee
     * @return Fee in wei
     */
    function getEntropyFee() external view returns (uint256) {
        return entropy.getFeeV2();
    }

    /**
     * @dev Update authorized server address
     * @param newServer New server address
     */
    function updateAuthorizedServer(address newServer) external onlyOwner {
        require(newServer != address(0), "Invalid address");
        authorizedServer = newServer;
        emit AuthorizedServerUpdated(newServer);
    }

    /**
     * @dev Allow contract to receive ETH
     */
    receive() external payable {}

    /**
     * @dev Withdraw ETH from contract (for refunds/cleanup)
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
}

