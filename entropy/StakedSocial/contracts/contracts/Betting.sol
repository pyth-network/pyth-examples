// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; 

// Import Pyth Entropy interfaces
import { IEntropyConsumer } from "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
import { IEntropyV2 } from "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";

/// @title FriendsGroupBets (Gas‑optimized consensus + system resolution + Pyth Entropy RNG)
/// @notice Advanced betting contract with degen_mode RNG using Pyth Entropy
contract FriendsGroupBets is IEntropyConsumer {
    // Entropy contract interface
    IEntropyV2 public entropy;
    address public entropyAddress;

    // --------------------------------------------------------------
    // CONSTANTS & ENUMS
    // --------------------------------------------------------------

    enum DegenMode {
        STANDARD,           // Normal betting
        RANDOM_RANGE,       // RNG-based above/below threshold
        CASCADING_ODDS,     // Multi-tier RNG outcomes
        VOLATILITY_BOOST    // Time-decaying RNG modifier
    }

    // Maximum decimal precision for RNG thresholds (0-100.00)
    uint256 private constant RNG_PRECISION = 1e4;  // 4 decimals (0.01)
    uint256 private constant RNG_MAX_THRESHOLD = 10000;  // 100.00

    // Entropy request tracking
    uint256 private constant ENTROPY_REQUEST_TIMEOUT = 1 hours;
    uint256 private constant ENTROPY_CALLBACK_GAS_LIMIT = 500_000;

    // --------------------------------------------------------------
    // STRUCT
    // --------------------------------------------------------------

    struct Market {
        uint256 id;
        address creator;
        address resolver;      // system backend
        bytes32 metadataHash;  // only on-chain reference
        uint64  deadline;
        uint256 shareSize;

        bool    resolved;
        bool    cancelled;
        uint8   winningOutcome;    // index

        address[] participants;     // voters + bettors
        address[] targetParticipants;

        uint256[] totalStaked;      // per outcome
        // voteOutcome[user] = outcomeIndex or 255 for "no vote"

        // DEGEN MODE FIELDS
        bool isDegen;                          // Is this a degen_mode market?
        DegenMode degenModeType;               // Type of degen mode
        uint256 rngThreshold;                  // Threshold (0-10000 for 0-100.00)
        bytes32 entropySequenceNumber;         // Tracks entropy request
        bool entropyCallbackReceived;          // Has RNG completed?
        bytes32 randomNumberHash;              // Final RNG hash
        uint256 rngRequestTimestamp;           // When entropy was requested
        address entropyProvider;               // Provider who fulfilled request
    }

    struct DegenBet {
        uint256 marketId;
        address bettor;
        uint256 amount;
        uint8 side;                            // 0 = Below threshold, 1 = Above threshold
        uint256 timestamp;
        bool claimed;
    }

    struct RNGRequest {
        uint256 marketId;
        uint64 sequenceNumber;
        uint256 requestTime;
        bool fulfilled;
        bytes32 randomNumber;
    }

    uint256 public nextMarketId;
    mapping(uint256 => Market) public markets;

    // stakes[marketId][user][outcomeIndex]
    mapping(uint256 => mapping(address => uint256[])) public stakes;
    mapping(uint256 => mapping(address => bool)) public hasWithdrawn;
    mapping(uint256 => mapping(address => bool)) public isParticipant;
    mapping(uint256 => mapping(address => bool)) public isTarget;

    // record consensus votes: voteOutcome[marketId][user]
    mapping(uint256 => mapping(address => uint8)) public voteOutcome;
    // voteCancel[marketId][user]
    mapping(uint256 => mapping(address => bool)) public voteCancel;

    // DEGEN MODE MAPPINGS
    mapping(uint256 => DegenBet[]) public degenBets;
    mapping(uint256 => RNGRequest) public rngRequests;
    mapping(bytes32 => uint256) public sequenceToMarketId;  // Track entropy callbacks

    // RNG history for audit trail
    mapping(uint256 => uint256) public rngHistoryIndex;
    mapping(uint256 => mapping(uint256 => bytes32)) public rngHistory;  // [marketId][index] = randomHash

    // Constructor
    constructor(address _entropyAddress) {
        require(_entropyAddress != address(0), "invalid entropy address");
        entropyAddress = _entropyAddress;
        entropy = IEntropyV2(_entropyAddress);
    }

    // IEntropyConsumer implementation
    function getEntropy() external view override returns (address) {
        return entropyAddress;
    }

    // Entropy callback - receives random numbers from Pyth Entropy
    // Called by the Entropy contract with random number result
    function entropyCallback(
        uint64 sequenceNumber,
        address provider,
        bytes32 randomNumber
    ) public override {
        require(msg.sender == entropyAddress, "only entropy");

        bytes32 seqHash = bytes32(uint256(sequenceNumber));
        uint256 marketId = sequenceToMarketId[seqHash];
        require(marketId > 0 && marketId < nextMarketId, "invalid market");

        Market storage m = markets[marketId];
        require(m.isDegen, "not degen");
        require(!m.entropyCallbackReceived, "already done");

        m.randomNumberHash = randomNumber;
        m.entropyCallbackReceived = true;
        m.entropyProvider = provider;
        m.rngRequestTimestamp = block.timestamp;

        _resolveDegenMarket(marketId, randomNumber);
        emit EntropyCallbackReceived(marketId, seqHash, randomNumber, block.timestamp);
    }

    // --------------------------------------------------------------
    // EVENTS
    // --------------------------------------------------------------

    event MarketCreated(uint256 indexed id, bytes32 metadataHash);
    event BetPlaced(uint256 indexed id, address indexed user, uint256 outcome, uint256 amt);
    event VoteOutcome(uint256 indexed id, address indexed user, uint8 outcome);
    event VoteCancel(uint256 indexed id, address indexed user, bool cancelVote);
    event MarketResolved(uint256 indexed id, uint8 outcome, bool forced);
    event MarketCancelled(uint256 indexed id, bool forced);
    event Withdrawal(uint256 indexed id, address indexed user, uint256 amount);

    // DEGEN MODE EVENTS
    event DegenMarketCreated(
        uint256 indexed id,
        DegenMode degenMode,
        uint256 threshold,
        bytes32 metadataHash
    );
    event EntropyRequested(
        uint256 indexed marketId,
        bytes32 sequenceNumber,
        uint256 timestamp
    );
    event EntropyCallbackReceived(
        uint256 indexed marketId,
        bytes32 sequenceNumber,
        bytes32 randomNumber,
        uint256 timestamp
    );
    event DegenBetPlaced(
        uint256 indexed marketId,
        address indexed bettor,
        uint256 amount,
        uint8 side,  // 0 = Below, 1 = Above
        uint256 timestamp
    );
    event DegenOutcomeResolved(
        uint256 indexed marketId,
        uint256 rngValue,
        uint8 winningOutcome,
        bytes32 randomHash
    );
    event RNGHistoryRecorded(
        uint256 indexed marketId,
        uint256 historyIndex,
        bytes32 randomHash
    );

    // --------------------------------------------------------------
    // CREATE
    // --------------------------------------------------------------

    function createMarket(
        bytes32 metadataHash,
        uint64 deadline,
        address resolverAddr,
        uint256 shareSize,
        address[] memory targetList,
        uint256 outcomesCount
    ) external returns (uint256 id) {
        require(deadline > block.timestamp, "bad deadline");
        require(metadataHash != 0, "no hash");
        require(shareSize > 0, "bad share");
        require(outcomesCount > 0, "no outcomes");

        id = nextMarketId++;
        Market storage m = markets[id];

        m.id = id;
        m.creator = msg.sender;
        m.resolver = resolverAddr;
        m.metadataHash = metadataHash;
        m.deadline = deadline;
        m.shareSize = shareSize;
        m.winningOutcome = type(uint8).max;
        m.isDegen = false;
        m.degenModeType = DegenMode.STANDARD;

        uint256[] memory arr = new uint256[](outcomesCount);
        m.totalStaked = arr;

        m.targetParticipants = targetList;
        for (uint256 i; i < targetList.length; i++) {
            isTarget[id][targetList[i]] = true;
        }

        emit MarketCreated(id, metadataHash);
    }

    // ============================================================
    // DEGEN MODE: Create market with RNG-based outcomes
    // ============================================================

    /// @notice Create a degen_mode market with RNG-based outcomes
    /// @param metadataHash Hash of market metadata
    /// @param deadline Market deadline timestamp
    /// @param resolverAddr System resolver address
    /// @param shareSize Bet share size in wei
    /// @param targetList Target participants
    /// @param degenMode Type of degen mode (RANDOM_RANGE, CASCADING_ODDS, VOLATILITY_BOOST)
    /// @param rngThreshold Threshold value (0-10000 representing 0-100.00)
    function createDegenMarket(
        bytes32 metadataHash,
        uint64 deadline,
        address resolverAddr,
        uint256 shareSize,
        address[] memory targetList,
        DegenMode degenMode,
        uint256 rngThreshold
    ) external returns (uint256 id) {
        require(deadline > block.timestamp, "bad deadline");
        require(metadataHash != 0, "no hash");
        require(shareSize > 0, "bad share");
        require(degenMode != DegenMode.STANDARD, "use standard market");
        require(rngThreshold > 0 && rngThreshold <= RNG_MAX_THRESHOLD, "bad threshold");

        id = nextMarketId++;
        Market storage m = markets[id];

        m.id = id;
        m.creator = msg.sender;
        m.resolver = resolverAddr;
        m.metadataHash = metadataHash;
        m.deadline = deadline;
        m.shareSize = shareSize;
        m.winningOutcome = type(uint8).max;

        // DEGEN MODE INITIALIZATION
        m.isDegen = true;
        m.degenModeType = degenMode;
        m.rngThreshold = rngThreshold;
        m.entropyCallbackReceived = false;

        // Initialize with 2 outcomes (Below/Above for RANDOM_RANGE)
        // Adjust for other modes as needed
        uint256 outcomesCount = 2;
        if (degenMode == DegenMode.CASCADING_ODDS) {
            outcomesCount = 3;  // Low, Medium, High
        } else if (degenMode == DegenMode.VOLATILITY_BOOST) {
            outcomesCount = 4;  // Extreme Low, Low, High, Extreme High
        }

        uint256[] memory arr = new uint256[](outcomesCount);
        m.totalStaked = arr;

        m.targetParticipants = targetList;
        for (uint256 i; i < targetList.length; i++) {
            isTarget[id][targetList[i]] = true;
        }

        emit DegenMarketCreated(id, degenMode, rngThreshold, metadataHash);
    }

    // --------------------------------------------------------------
    // BET
    // --------------------------------------------------------------

    function placeBet(uint256 id, uint256 outcome) external payable {
        Market storage m = markets[id];
        require(!m.resolved && !m.cancelled, "closed");
        require(block.timestamp < m.deadline, "deadline");
        require(!isTarget[id][msg.sender], "target");
        require(outcome < m.totalStaked.length, "bad idx");
        require(msg.value > 0 && msg.value % m.shareSize == 0, "bad amt");

        if (!isParticipant[id][msg.sender]) {
            isParticipant[id][msg.sender] = true;
            m.participants.push(msg.sender);
            voteOutcome[id][msg.sender] = 255;
        }

        if (stakes[id][msg.sender].length == 0) {
            stakes[id][msg.sender] = new uint256[](m.totalStaked.length);
        }

        m.totalStaked[outcome] += msg.value;
        stakes[id][msg.sender][outcome] += msg.value;

        emit BetPlaced(id, msg.sender, outcome, msg.value);
    }

    // ============================================================
    // DEGEN MODE: Betting on RNG outcomes
    // ============================================================

    /// @notice Place a degen bet (above/below RNG threshold)
    /// @param marketId Market ID
    /// @param side 0 = Below threshold, 1 = Above threshold
    function placeDegenBet(uint256 marketId, uint8 side) external payable {
        Market storage m = markets[marketId];

        require(m.isDegen, "not degen");
        require(!m.resolved && !m.cancelled, "closed");
        require(block.timestamp < m.deadline, "deadline");
        require(!isTarget[marketId][msg.sender], "target");
        require(side <= 1, "bad side");
        require(msg.value > 0 && msg.value % m.shareSize == 0, "bad amt");

        // Register participant
        if (!isParticipant[marketId][msg.sender]) {
            isParticipant[marketId][msg.sender] = true;
            m.participants.push(msg.sender);
        }

        // Create degen bet record
        DegenBet memory bet = DegenBet({
            marketId: marketId,
            bettor: msg.sender,
            amount: msg.value,
            side: side,
            timestamp: block.timestamp,
            claimed: false
        });

        degenBets[marketId].push(bet);
        m.totalStaked[side] += msg.value;

        emit DegenBetPlaced(marketId, msg.sender, msg.value, side, block.timestamp);
    }

    /// @notice Request random number from Pyth Entropy for a degen market
    /// @param marketId Market ID to generate RNG for
    /// @dev Must be called after deadline to trigger resolution
    function requestDegenResolution(uint256 marketId) external payable {
        Market storage m = markets[marketId];

        require(m.isDegen, "not degen");
        require(!m.resolved && !m.cancelled, "closed");
        require(block.timestamp >= m.deadline, "not yet");
        require(!m.entropyCallbackReceived, "already resolved");
        require(msg.sender == m.resolver || msg.sender == m.creator, "not auth");

        uint256 fee = entropy.getFeeV2();
        require(msg.value >= fee, "insufficient fee");

        uint64 sequenceNumber = entropy.requestV2{ value: fee }();
        bytes32 seqHash = bytes32(uint256(sequenceNumber));

        m.entropySequenceNumber = seqHash;
        m.rngRequestTimestamp = block.timestamp;
        sequenceToMarketId[seqHash] = marketId;

        RNGRequest storage req = rngRequests[marketId];
        req.marketId = marketId;
        req.sequenceNumber = sequenceNumber;
        req.requestTime = block.timestamp;
        req.fulfilled = false;

        emit EntropyRequested(marketId, seqHash, block.timestamp);
    }

    // --------------------------------------------------------------
    // CONSENSUS VOTING
    // --------------------------------------------------------------

    function voteResolve(uint256 id, uint8 outcome) external {
        Market storage m = markets[id];
        require(isParticipant[id][msg.sender], "not part");
        require(!m.resolved && !m.cancelled, "final");
        require(outcome < m.totalStaked.length, "bad");

        voteOutcome[id][msg.sender] = outcome;
        emit VoteOutcome(id, msg.sender, outcome);

        _tryConsensusResolve(id);
    }

    function voteToCancel(uint256 id, bool v) external {
        Market storage m = markets[id];
        require(isParticipant[id][msg.sender], "not part");
        require(!m.resolved && !m.cancelled, "final");

        voteCancel[id][msg.sender] = v;
        emit VoteCancel(id, msg.sender, v);

        _tryConsensusCancel(id);
    }

    function _tryConsensusResolve(uint256 id) internal {
        Market storage m = markets[id];
        uint8 first = 255;

        for (uint256 i; i < m.participants.length; i++) {
            address u = m.participants[i];
            if (isTarget[id][u]) continue;
            uint8 v = voteOutcome[id][u];
            if (v == 255) return;
            if (first == 255) first = v;
            else if (v != first) return;
        }

        _resolve(id, first, false);
    }

    function _tryConsensusCancel(uint256 id) internal {
        Market storage m = markets[id];

        for (uint256 i; i < m.participants.length; i++) {
            address u = m.participants[i];
            if (isTarget[id][u]) continue;
            if (!voteCancel[id][u]) return;
        }

        _cancel(id, false);
    }

    // --------------------------------------------------------------
    // SYSTEM (forced) RESOLUTION/CANCEL
    // --------------------------------------------------------------

    function systemResolve(uint256 id, uint8 outcome, bytes32 metadataHash)
        external
    {
        Market storage m = markets[id];
        require(msg.sender == m.resolver, "not sys");
        require(!m.resolved && !m.cancelled, "done");
        require(outcome < m.totalStaked.length, "bad idx");
        require(metadataHash == m.metadataHash, "bad hash");

        _resolve(id, outcome, true);
    }

    function systemCancel(uint256 id) external {
        Market storage m = markets[id];
        require(msg.sender == m.resolver, "not sys");
        require(!m.resolved && !m.cancelled, "done");
        _cancel(id, true);
    }

    // --------------------------------------------------------------
    // INTERNAL FINALIZATION
    // --------------------------------------------------------------

    function _resolve(uint256 id, uint8 outcome, bool forced) internal {
        Market storage m = markets[id];
        m.resolved = true;
        m.winningOutcome = outcome;
        emit MarketResolved(id, outcome, forced);
    }

    function _cancel(uint256 id, bool forced) internal {
        Market storage m = markets[id];
        m.cancelled = true;
        emit MarketCancelled(id, forced);
    }

    // --------------------------------------------------------------
    // WITHDRAW
    // --------------------------------------------------------------

    function withdraw(uint256 id) external {
        Market storage m = markets[id];
        require(m.resolved || m.cancelled || block.timestamp >= m.deadline, "not final");
        require(!hasWithdrawn[id][msg.sender], "done");

        if (!m.resolved && !m.cancelled && block.timestamp >= m.deadline) {
            _cancel(id, false);
        }

        hasWithdrawn[id][msg.sender] = true;

        uint256[] storage s = stakes[id][msg.sender];
        uint256 payout;

        if (m.cancelled) {
            for (uint256 i; i < s.length; i++) payout += s[i];
        } else {
            uint8 w = m.winningOutcome;

            uint256 userW = s[w];
            uint256 totalPool;
            for (uint256 i; i < m.totalStaked.length; i++) totalPool += m.totalStaked[i];

            uint256 winPool = m.totalStaked[w];
            if (winPool == 0) {
                for (uint256 i; i < s.length; i++) payout += s[i];
            } else if (userW > 0) {
                payout = (userW * totalPool) / winPool;
            }
        }

        for (uint256 i; i < s.length; i++) s[i] = 0;

        if (payout > 0) {
            (bool ok,) = msg.sender.call{value: payout}("");
            require(ok);
        }

        emit Withdrawal(id, msg.sender, payout);
    }

    // ============================================================
    // DEGEN MODE: Complex RNG Resolution Logic
    // ============================================================

    /// @notice Internal: Resolve degen market with RNG
    /// @param marketId Market ID
    /// @param randomHash Random hash from Entropy
    function _resolveDegenMarket(uint256 marketId, bytes32 randomHash) internal {
        Market storage m = markets[marketId];
        require(m.isDegen, "not degen");

        // Record RNG in history for audit trail
        uint256 historyIdx = rngHistoryIndex[marketId];
        rngHistory[marketId][historyIdx] = randomHash;
        rngHistoryIndex[marketId]++;

        // Extract RNG value based on mode and apply complex logic
        uint256 rngValue = _extractRNGValue(randomHash, m.degenModeType);

        // Determine winning outcome
        uint8 winningOutcome = _computeOutcome(marketId, rngValue, m.degenModeType);

        // Set winning outcome and mark resolved
        m.resolved = true;
        m.winningOutcome = winningOutcome;
        m.randomNumberHash = randomHash;

        emit DegenOutcomeResolved(marketId, rngValue, winningOutcome, randomHash);
        emit RNGHistoryRecorded(marketId, historyIdx, randomHash);
    }

    /// @notice Extract RNG value from entropy hash (0-10000 for 0-100.00)
    /// @param randomHash Hash from Pyth Entropy
    /// @param degenMode Type of degen mode
    /// @return RNG value in range 0-10000
    function _extractRNGValue(bytes32 randomHash, DegenMode degenMode) internal pure returns (uint256) {
        // Convert hash to uint256
        uint256 hashValue = uint256(randomHash);

        // Apply different extraction logic based on mode
        if (degenMode == DegenMode.RANDOM_RANGE) {
            // Simple modulo for random range
            return hashValue % RNG_MAX_THRESHOLD;
        } else if (degenMode == DegenMode.CASCADING_ODDS) {
            // Multi-tier extraction with entropy cascading
            uint256 part1 = (hashValue >> 128) % (RNG_MAX_THRESHOLD / 3);
            uint256 part2 = (hashValue >> 64) % (RNG_MAX_THRESHOLD / 3);
            uint256 part3 = hashValue % (RNG_MAX_THRESHOLD / 3);

            // Weighted cascade: Each tier influences the others
            return ((part1 * 40) + (part2 * 35) + (part3 * 25)) / 100;
        } else if (degenMode == DegenMode.VOLATILITY_BOOST) {
            // Complex volatility-based extraction with multiple entropy sources
            // Simulate time-based volatility modifier
            uint256 base = hashValue % RNG_MAX_THRESHOLD;
            uint256 volatility = (hashValue >> 64) % 500; // 0-4.99% volatility
            uint256 timeMultiplier = ((block.timestamp % 100) * 100) / 100; // Time decay factor

            // Combine factors with weighted average
            return (base * 70 + volatility * 20 + timeMultiplier * 10) / 100;
        } else {
            return hashValue % RNG_MAX_THRESHOLD;
        }
    }

    /// @notice Compute winning outcome based on RNG value and threshold
    /// @param marketId Market ID
    /// @param rngValue RNG value (0-10000)
    /// @param degenMode Type of degen mode
    /// @return winningOutcome Index of winning outcome
    function _computeOutcome(
        uint256 marketId,
        uint256 rngValue,
        DegenMode degenMode
    ) internal view returns (uint8) {
        Market storage m = markets[marketId];

        if (degenMode == DegenMode.RANDOM_RANGE) {
            // Simple binary: 0 = Below, 1 = Above
            return rngValue < m.rngThreshold ? 0 : 1;
        } else if (degenMode == DegenMode.CASCADING_ODDS) {
            // Three-tier: Low (0), Medium (1), High (2)
            // Threshold values divide range into 3 segments
            uint256 lowBound = m.rngThreshold / 3;
            uint256 highBound = (m.rngThreshold * 2) / 3;

            if (rngValue < lowBound) return 0;      // Low
            else if (rngValue < highBound) return 1; // Medium
            else return 2;                            // High
        } else if (degenMode == DegenMode.VOLATILITY_BOOST) {
            // Four-tier with volatility boost: Extreme Low (0), Low (1), High (2), Extreme High (3)
            uint256 quarterBound = m.rngThreshold / 4;
            uint256 halfBound = m.rngThreshold / 2;
            uint256 threeQuarterBound = (m.rngThreshold * 3) / 4;

            // Apply boost based on extreme ranges
            if (rngValue < quarterBound) {
                return 0; // Extreme Low
            } else if (rngValue < halfBound) {
                return 1; // Low
            } else if (rngValue < threeQuarterBound) {
                return 2; // High
            } else {
                return 3; // Extreme High
            }
        }

        return 0; // Default
    }

    /// @notice Mock RNG callback for testing (replace with real Entropy callback)
    /// @param marketId Market ID
    function _simulateRNGCallback(uint256 marketId) internal {
        Market storage m = markets[marketId];

        // Generate pseudo-random hash using block data
        bytes32 pseudoRandomHash = keccak256(
            abi.encodePacked(
                blockhash(block.number - 1),
                block.timestamp,
                block.difficulty,
                msg.sender,
                marketId
            )
        );

        m.randomNumberHash = pseudoRandomHash;
        m.entropyCallbackReceived = true;
        m.rngRequestTimestamp = block.timestamp;

        _resolveDegenMarket(marketId, pseudoRandomHash);
        emit EntropyCallbackReceived(marketId, bytes32(uint256(marketId)), pseudoRandomHash, block.timestamp);
    }

    // ============================================================
    // DEGEN MODE: Withdrawal for RNG-based markets
    // ============================================================

    /// @notice Withdraw winnings from degen market
    /// @param marketId Market ID
    function withdrawDegen(uint256 marketId) external {
        Market storage m = markets[marketId];
        require(m.isDegen, "not degen");
        require(m.resolved || block.timestamp >= m.deadline + ENTROPY_REQUEST_TIMEOUT, "not final");

        // Find and process all bets for this user
        DegenBet[] storage allBets = degenBets[marketId];
        uint256 totalPayout = 0;

        for (uint256 i = 0; i < allBets.length; i++) {
            DegenBet storage bet = allBets[i];

            if (bet.bettor == msg.sender && !bet.claimed) {
                bet.claimed = true;

                // Check if this bet won
                if (m.resolved && bet.side == m.winningOutcome) {
                    // Calculate proportional payout
                    uint256 totalWinPool = m.totalStaked[m.winningOutcome];
                    uint256 totalPool = 0;

                    for (uint256 j = 0; j < m.totalStaked.length; j++) {
                        totalPool += m.totalStaked[j];
                    }

                    if (totalWinPool > 0) {
                        totalPayout += (bet.amount * totalPool) / totalWinPool;
                    }
                } else if (!m.resolved) {
                    // Market timed out without resolution - refund
                    totalPayout += bet.amount;
                }
            }
        }

        if (totalPayout > 0) {
            (bool ok,) = msg.sender.call{value: totalPayout}("");
            require(ok, "transfer failed");
            emit Withdrawal(marketId, msg.sender, totalPayout);
        }
    }

    // ============================================================
    // DEGEN MODE: View functions
    // ============================================================

    /// @notice Get all degen bets for a market
    /// @param marketId Market ID
    /// @return Array of degen bets
    function getDegenBets(uint256 marketId) external view returns (DegenBet[] memory) {
        return degenBets[marketId];
    }

    /// @notice Get RNG history for a market
    /// @param marketId Market ID
    /// @return Array of historical RNG hashes
    function getRNGHistory(uint256 marketId) external view returns (bytes32[] memory) {
        uint256 count = rngHistoryIndex[marketId];
        bytes32[] memory history = new bytes32[](count);

        for (uint256 i = 0; i < count; i++) {
            history[i] = rngHistory[marketId][i];
        }

        return history;
    }

    /// @notice Check if market is degen mode
    /// @param marketId Market ID
    /// @return true if degen market
    function isDegenMarket(uint256 marketId) external view returns (bool) {
        return markets[marketId].isDegen;
    }

    /// @notice Get market RNG threshold
    /// @param marketId Market ID
    /// @return RNG threshold (0-10000)
    function getDegenThreshold(uint256 marketId) external view returns (uint256) {
        return markets[marketId].rngThreshold;
    }
}

// function getMarketTotals(uint256 marketId) external view returns (uint256[] memory totals) { Market storage m = markets[marketId]; return m.totalStaked; }
// function getUserStakes(uint256 marketId, address user) external view returns (uint256[] memory stakes) { return userStakes[marketId][user]; }
//  function getParticipants(uint256 marketId) external view returns (address[] memory) { return markets[marketId].participants; }
//  function getTargetParticipants(uint256 marketId) external view returns (address[] memory) {