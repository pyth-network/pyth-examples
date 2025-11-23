// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title StakeArena
 * @dev Main game contract using native SSS token for staking
 */
contract StakeArena is Ownable, ReentrancyGuard {
    address public authorizedServer;

    // Match state
    struct MatchSummary {
        uint256 startTime;
        uint256 endTime;
        address winner;
        uint256 totalStaked;
        bool finalized;
    }

    // Player state per match
    mapping(bytes32 => mapping(address => uint256)) public stakeBalance;
    mapping(bytes32 => mapping(address => bool)) public activeInMatch;
    
    // Match data
    mapping(bytes32 => MatchSummary) public matches;
    mapping(bytes32 => bytes32) public matchEntropyCommit;
    mapping(bytes32 => bytes32) public entropySeedByMatch; // matchId => keccak256(actualSeed)
    
    // Leaderboard
    mapping(address => uint256) public bestScore;
    
    struct LeaderboardEntry {
        address player;
        uint256 score;
    }
    
    LeaderboardEntry[] public leaderboard;
    uint256 public constant MAX_LEADERBOARD_SIZE = 10;

    // Events
    event DepositedToVault(address indexed player, uint256 amount, uint256 timestamp);
    event Entered(bytes32 indexed matchId, address indexed player, uint256 amount);
    event EatReported(
        bytes32 indexed matchId,
        address indexed eater,
        address indexed eaten,
        uint256 timestamp
    );
    event EatLoot(
        bytes32 indexed matchId,
        address indexed eater,
        address indexed eaten,
        uint256 amountTransferred,
        uint256 timestamp
    );
    event TappedOut(bytes32 indexed matchId, address indexed player, uint256 amountWithdrawn);
    event SelfDeathReported(bytes32 indexed matchId, address indexed player, uint256 score, uint256 timestamp);
    event SelfDeath(bytes32 indexed matchId, address indexed player, uint256 amountToServer, uint256 timestamp);
    event EntropyCommitted(bytes32 indexed matchId, bytes32 entropyRequestId);
    event MatchFinalized(bytes32 indexed matchId, address indexed winner, uint256 timestamp);
    event BestScoreUpdated(address indexed player, uint256 newScore);
    event AuthorizedServerUpdated(address indexed newServer);

    modifier onlyAuthorizedServer() {
        require(msg.sender == authorizedServer, "Only authorized server");
        _;
    }

    constructor(address _authorizedServer) Ownable(msg.sender) {
        require(_authorizedServer != address(0), "Invalid server address");
        authorizedServer = _authorizedServer;
    }

    /**
     * @dev Player deposits native SSS to server vault for continuous gameplay
     * This replaces the per-match enterMatch flow for continuous matches
     */
    function depositToVault() external payable nonReentrant {
        require(msg.value > 0, "Amount must be > 0");
        
        // Transfer directly to server wallet (vault)
        (bool success, ) = payable(authorizedServer).call{value: msg.value}("");
        require(success, "Transfer to vault failed");
        
        emit DepositedToVault(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @dev Player stakes native SSS to enter a match
     * @param matchId Unique match identifier
     * @notice DEPRECATED: Use depositToVault() for continuous matches
     */
    function enterMatch(bytes32 matchId) external payable nonReentrant {
        require(msg.value > 0, "Amount must be > 0");
        require(!activeInMatch[matchId][msg.sender], "Already in match");
        require(!matches[matchId].finalized, "Match already finalized");

        stakeBalance[matchId][msg.sender] = msg.value;
        activeInMatch[matchId][msg.sender] = true;
        
        // Initialize match if first entry
        if (matches[matchId].startTime == 0) {
            matches[matchId].startTime = block.timestamp;
        }
        matches[matchId].totalStaked += msg.value;

        emit Entered(matchId, msg.sender, msg.value);
    }

    /**
     * @dev Server reports that one player ate another (stats/leaderboard only)
     * In continuous vault mode, stake transfers happen off-chain via server wallet
     * @param matchId Match identifier
     * @param eater Address of the player who ate
     * @param eaten Address of the player who was eaten
     */
    function reportEat(
        bytes32 matchId,
        address eater,
        address eaten
    ) external onlyAuthorizedServer {
        require(eater != eaten, "Cannot eat self");
        
        // Just emit event for tracking - no on-chain transfers in vault mode
        emit EatReported(matchId, eater, eaten, block.timestamp);
    }

    /**
     * @dev Legacy function for match-based gameplay with on-chain stake transfers
     * @notice DEPRECATED: Use reportEat() for continuous matches (vault mode)
     */
    function reportEatWithTransfer(
        bytes32 matchId,
        address eater,
        address eaten
    ) external onlyAuthorizedServer nonReentrant {
        require(activeInMatch[matchId][eater], "Eater not active");
        require(activeInMatch[matchId][eaten], "Eaten not active");
        require(eater != eaten, "Cannot eat self");

        uint256 lootAmount = stakeBalance[matchId][eaten];
        require(lootAmount > 0, "No stake to loot");

        // Transfer 100% of eaten player's stake to eater
        stakeBalance[matchId][eaten] = 0;
        stakeBalance[matchId][eater] += lootAmount;
        activeInMatch[matchId][eaten] = false;

        emit EatLoot(matchId, eater, eaten, lootAmount, block.timestamp);
    }

    /**
     * @dev Server reports that a player died from self-inflicted causes
     * (eating self, wall collision, disconnect, etc.) - updates leaderboard only
     * In continuous vault mode, stakes are already in server wallet
     * @param matchId Match identifier
     * @param player Address of the player who died
     * @param score Player's final score in the match
     */
    function reportSelfDeath(
        bytes32 matchId,
        address player,
        uint256 score
    ) external onlyAuthorizedServer {
        // Update best score if this score is higher
        if (score > bestScore[player]) {
            bestScore[player] = score;
            _updateLeaderboard(player, score);
            emit BestScoreUpdated(player, score);
        }

        emit SelfDeathReported(matchId, player, score, block.timestamp);
    }

    /**
     * @dev Legacy function for match-based gameplay with on-chain stake transfers
     * @notice DEPRECATED: Use reportSelfDeath() for continuous matches (vault mode)
     */
    function reportSelfDeathWithTransfer(
        bytes32 matchId,
        address player,
        uint256 score
    ) external onlyAuthorizedServer nonReentrant {
        require(activeInMatch[matchId][player], "Player not active");

        uint256 stakeAmount = stakeBalance[matchId][player];
        require(stakeAmount > 0, "No stake to collect");

        // Transfer player's stake to server wallet
        stakeBalance[matchId][player] = 0;
        activeInMatch[matchId][player] = false;

        // Update best score if this score is higher
        if (score > bestScore[player]) {
            bestScore[player] = score;
            _updateLeaderboard(player, score);
            emit BestScoreUpdated(player, score);
        }

        // Send SSS to server wallet
        (bool success, ) = payable(authorizedServer).call{value: stakeAmount}("");
        require(success, "Transfer to server failed");

        emit SelfDeath(matchId, player, stakeAmount, block.timestamp);
    }

    /**
     * @dev Player voluntarily exits match and withdraws stake
     * @param matchId Match identifier
     * @param score Player's final score in the match
     * @notice DEPRECATED: In vault mode, server handles payouts via direct transfers
     */
    function tapOut(bytes32 matchId, uint256 score) external nonReentrant {
        require(activeInMatch[matchId][msg.sender], "Not active in match");
        require(!matches[matchId].finalized, "Match finalized");

        uint256 withdrawAmount = stakeBalance[matchId][msg.sender];
        require(withdrawAmount > 0, "No stake to withdraw");

        stakeBalance[matchId][msg.sender] = 0;
        activeInMatch[matchId][msg.sender] = false;

        // Update best score if this score is higher
        if (score > bestScore[msg.sender]) {
            bestScore[msg.sender] = score;
            _updateLeaderboard(msg.sender, score);
            emit BestScoreUpdated(msg.sender, score);
        }

        // Send SSS back to player
        (bool success, ) = payable(msg.sender).call{value: withdrawAmount}("");
        require(success, "Transfer failed");

        emit TappedOut(matchId, msg.sender, withdrawAmount);
    }

    /**
     * @dev Server commits entropy seed for match (Pyth integration)
     * @param matchId Match identifier
     * @param entropyRequestId Entropy request identifier from Base Sepolia
     * @param seedHash keccak256 hash of the actual seed for verification
     */
    function commitEntropy(bytes32 matchId, bytes32 entropyRequestId, bytes32 seedHash) 
        external 
        onlyAuthorizedServer 
    {
        require(matches[matchId].startTime > 0, "Match not started");
        require(!matches[matchId].finalized, "Match finalized");
        require(entropySeedByMatch[matchId] == bytes32(0), "Entropy already committed");
        require(seedHash != bytes32(0), "Invalid seed hash");
        
        matchEntropyCommit[matchId] = entropyRequestId;
        entropySeedByMatch[matchId] = seedHash;
        emit EntropyCommitted(matchId, entropyRequestId);
    }

    /**
     * @dev Finalize match and update leaderboard
     * @param matchId Match identifier
     * @param players Array of player addresses
     * @param scores Array of final scores (must match players length)
     * @param winner Address of the winner
     */
    function finalizeMatch(
        bytes32 matchId,
        address[] calldata players,
        uint256[] calldata scores,
        address winner
    ) external onlyAuthorizedServer nonReentrant {
        require(!matches[matchId].finalized, "Already finalized");
        require(players.length == scores.length, "Array length mismatch");
        require(players.length > 0, "No players");

        matches[matchId].finalized = true;
        matches[matchId].endTime = block.timestamp;
        matches[matchId].winner = winner;

        // Update best scores and distribute remaining stakes
        for (uint256 i = 0; i < players.length; i++) {
            address player = players[i];
            uint256 score = scores[i];

            // Update best score
            if (score > bestScore[player]) {
                bestScore[player] = score;
                _updateLeaderboard(player, score);
                emit BestScoreUpdated(player, score);
            }

            // Return remaining stake to player
            uint256 remainingStake = stakeBalance[matchId][player];
            if (remainingStake > 0) {
                stakeBalance[matchId][player] = 0;
                (bool success, ) = payable(player).call{value: remainingStake}("");
                require(success, "Transfer failed");
            }

            activeInMatch[matchId][player] = false;
        }

        emit MatchFinalized(matchId, winner, block.timestamp);
    }

    /**
     * @dev Allow contract to receive SSS
     */
    receive() external payable {}

    /**
     * @dev Withdraw contract balance to owner
     * Allows owner to withdraw accumulated SSS from self-deaths and other sources
     */
    function withdrawBalance() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Transfer failed");
    }

    /**
     * @dev Internal function to update leaderboard
     * @param player Player address
     * @param score New score
     */
    function _updateLeaderboard(address player, uint256 score) internal {
        // Check if player already on leaderboard
        int256 existingIndex = -1;
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i].player == player) {
                existingIndex = int256(i);
                break;
            }
        }

        // Remove old entry if exists
        if (existingIndex >= 0) {
            for (uint256 i = uint256(existingIndex); i < leaderboard.length - 1; i++) {
                leaderboard[i] = leaderboard[i + 1];
            }
            leaderboard.pop();
        }

        // Find insertion position
        uint256 insertPos = leaderboard.length;
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (score > leaderboard[i].score) {
                insertPos = i;
                break;
            }
        }

        // Only insert if in top MAX_LEADERBOARD_SIZE or leaderboard not full
        if (insertPos < MAX_LEADERBOARD_SIZE || leaderboard.length < MAX_LEADERBOARD_SIZE) {
            // Insert new entry
            leaderboard.push(LeaderboardEntry(address(0), 0));
            for (uint256 i = leaderboard.length - 1; i > insertPos; i--) {
                leaderboard[i] = leaderboard[i - 1];
            }
            leaderboard[insertPos] = LeaderboardEntry(player, score);

            // Trim to MAX_LEADERBOARD_SIZE
            while (leaderboard.length > MAX_LEADERBOARD_SIZE) {
                leaderboard.pop();
            }
        }
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
     * @dev Get full leaderboard
     * @return Array of leaderboard entries
     */
    function getLeaderboard() external view returns (LeaderboardEntry[] memory) {
        return leaderboard;
    }

    /**
     * @dev Get leaderboard size
     * @return Current number of entries
     */
    function getLeaderboardSize() external view returns (uint256) {
        return leaderboard.length;
    }

    /**
     * @dev Get player's stake in a match
     * @param matchId Match identifier
     * @param player Player address
     * @return Current stake amount
     */
    function getStake(bytes32 matchId, address player) external view returns (uint256) {
        return stakeBalance[matchId][player];
    }

    /**
     * @dev Check if player is active in match
     * @param matchId Match identifier
     * @param player Player address
     * @return True if active
     */
    function isActive(bytes32 matchId, address player) external view returns (bool) {
        return activeInMatch[matchId][player];
    }

    /**
     * @dev Get match summary
     * @param matchId Match identifier
     * @return Match summary struct
     */
    function getMatchSummary(bytes32 matchId) external view returns (MatchSummary memory) {
        return matches[matchId];
    }
}

