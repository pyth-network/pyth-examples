// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Moonshot - On-chain Crash Game
 * @author Christoph Drescher
 * @notice This game is designed to allow users to bet on a multiplier that increases over time and crashes at a random point.
 * The random crash point is determined using the Pyth Entropy oracle, ensuring fairness and unpredictability.
 * Players can place bets on the multiplier and choose to cash out at any time before the crash (planned - currently
 * they can set a AutoCashout which will then be claimable if the AutoCashOut is smaller than the actual multiplier).
 * If they cash out before the crash, they win their bet amount multiplied by the current multiplier.
 * If they fail to cash out before the crash, they lose their bet amount.
 * Besides the random crash point, the game is fully on-chain and transparent to ensure a fair gaming experience.
 * The contract is designed to be gas efficient and scalable, allowing for a large number of players to participate simultaneously.
 * The game runs automatically in rounds, with each round starting 30-60 seconds after the previous one ends.
 * Players can join a round by placing a bet before the round starts.
 * The automatic round management is managed by a Chainlink Upkeep (automation) which calls the necessary functions to start a new round and resolve the previous one.
 *
 */
contract CrashGame is IEntropyConsumer, ReentrancyGuard {

    enum RoundState {
        OPEN,
        LOCKED,
        RESOLVED
    }

    struct Round {
        uint256 id;
        uint256 startTime;
        uint256 crashMultiplier; // 1.00x–∞
        uint256 crashTime;
        uint256 lockTime;
        RoundState state;
    }

    struct Bet {
        uint256 roundId;
        uint256 amount;
        uint256 targetMultiplier; // 1.00x–∞
        uint256 autoCashout;
        bool claimed;
    }

    address immutable i_owner;
    uint256 private constant BPS_DENOMINATOR = 10_000;

    IEntropyV2 entropy;
    address private s_upkeep;
    uint256 public s_currentRoundId;
    uint256 public s_feesCollected;
    uint256 public s_betDuration = 60;
    uint256 public s_cooldown = 30;
    uint256 public s_feeBasisPoints = 200; // = 2%
    mapping(uint256 => Round) public s_rounds;
    mapping(uint256 roundId => mapping(address player => Bet bet))
        public s_bets;
    mapping(uint256 roundId => uint256 betCount) public s_betCount;

    //////////////
    // Events
    //////////////
    event FundsReceived(address sender, uint256 funds);
    event RoundStarted(uint256 roundId, uint256 startTime);
    event BetPlaced(
        uint256 roundId,
        address player,
        uint256 amount,
        uint256 targetMultiplier,
        uint256 autoCashout
    );
    event RoundLocked(uint256 indexed roundId, uint256 lockTime);
    event RoundCrashed(
        uint256 indexed roundId,
        uint256 crashTimeStamp,
        uint256 crashMultiplier
    );
    event FlipRequested(uint64 sequenceNumber);
    event FlipResult(uint64 sequenceNumber, bool isHeads);
    event UpkeepUpdated(address oldUpkeep, address newUpkeep);
    event WinningsClaimed(
        address indexed user,
        uint256 indexed roundId,
        uint256 payoutAmount
    );

    //////////////
    // Modifier
    //////////////

    modifier onlyAutomation() {
        require(
            msg.sender == s_upkeep,
            "Only an upkeep is allowed to call this method"
        );
        _;
    }

    modifier onlyOwner() {
        require(
            msg.sender == i_owner,
            "Only the owner is allowed to call this method"
        );
        _;
    }

    constructor(address _owner, address _entropy) {
        i_owner = _owner;
        entropy = IEntropyV2(_entropy);
    }

    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }

    function updateTimings(
        uint256 _betDuration,
        uint256 _cooldown
    ) external onlyOwner {
        s_betDuration = _betDuration;
        s_cooldown = _cooldown;
    }

    function setOrUpdateUpkeepAddress(address _upkeep) external onlyOwner {
        address oldUpkeep = s_upkeep;
        s_upkeep = _upkeep;
        emit UpkeepUpdated(oldUpkeep, _upkeep);
    }

    ///////////////////////////
    // Pyth Entropy Functions
    //////////////////////////

    // This method is required by the IEntropyConsumer interface
    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }

    function requestRandom() internal {
        uint128 requestFee = entropy.getFeeV2();

        // pay the fees and request a random number from entropy
        uint64 sequenceNumber = entropy.requestV2{value: requestFee}();

        // emit event
        emit FlipRequested(sequenceNumber);
    }

    function entropyCallback(
        uint64 sequenceNumber,
        // If your app uses multiple providers, you can use this argument
        // to distinguish which one is calling the app back. This app only
        // uses one provider so this argument is not used.
        address _providerAddress,
        bytes32 randomNumber
    ) internal override {
        require(
            s_rounds[s_currentRoundId].state == RoundState.LOCKED,
            "Round not locked or already resolved"
        );
        bool isHeads = uint256(randomNumber) % 2 == 0;

        uint256 crashMultiplier = _calculateCrashResult(randomNumber);
        s_rounds[s_currentRoundId].crashMultiplier = crashMultiplier;
        s_rounds[s_currentRoundId].crashTime = block.timestamp;
        s_rounds[s_currentRoundId].state = RoundState.RESOLVED;

        emit RoundCrashed(s_currentRoundId, block.timestamp, crashMultiplier);
    }

    //////////////
    // Upkeep
    //////////////

    function checkUpkeep() external onlyAutomation {
        RoundState state = getCurrentRoundState();
        uint256 lastStart = getCurrentRoundStartTime();
        uint256 crashTime = getCurrentRoundCrashTime();
        uint256 betCount = s_betCount[s_currentRoundId];
        if (
            state == RoundState.OPEN &&
            block.timestamp >= lastStart + s_betDuration && betCount > 0
        ) {
            _lockRoundAndCallPyth();
        } else if (
            s_currentRoundId == 0 ||
            (state == RoundState.RESOLVED &&
                block.timestamp >= crashTime + s_cooldown)
        ) {
            _startRound();
        }
    }

    ////////////////////////////////////
    // Game Mechanics
    ///////////////////////////////////

    function _startRound() internal {
        require(
            s_currentRoundId == 0 ||
                s_rounds[s_currentRoundId].state == RoundState.RESOLVED,
            "Previous round not resolved"
        );
        s_currentRoundId++;
        s_rounds[s_currentRoundId] = Round({
            id: s_currentRoundId,
            startTime: block.timestamp,
            crashMultiplier: 0,
            crashTime: 0,
            lockTime: 0,
            state: RoundState.OPEN
        });
        emit RoundStarted(s_currentRoundId, block.timestamp);
    }

    function _lockRoundAndCallPyth() internal {
        require(
            s_rounds[s_currentRoundId].state == RoundState.OPEN,
            "Round not open"
        );
        s_rounds[s_currentRoundId].state = RoundState.LOCKED;
        s_rounds[s_currentRoundId].lockTime = block.timestamp;

        emit RoundLocked(s_currentRoundId, block.timestamp);

        // Request random number from Pyth Entropy (private function)
        requestRandom();
    }

    function placeBet(
        uint256 amount,
        uint256 targetMultiplier,
        uint256 autoCashout
    ) external payable nonReentrant {
        require(msg.value >= amount, "Not enough ETH sent");
        require(
            s_rounds[s_currentRoundId].state == RoundState.OPEN,
            "Round not open"
        );
        require(
            s_bets[s_currentRoundId][msg.sender].amount == 0,
            "already placed a bet on this round"
        );
        require(amount > 0, "Bet amount must be greater than 0");
        require(
            targetMultiplier >= 100,
            "Target multiplier must be at least 1.00x"
        );
        require(
            autoCashout > amount,
            "Auto cashout must be greater than bet amount"
        );
        require(
            s_bets[s_currentRoundId][msg.sender].amount == 0,
            "Bet already placed for this round"
        );

        s_bets[s_currentRoundId][msg.sender] = Bet({
            roundId: s_currentRoundId,
            amount: amount,
            targetMultiplier: targetMultiplier,
            autoCashout: autoCashout,
            claimed: false
        });
        s_betCount[s_currentRoundId]++;

        emit BetPlaced(
            s_currentRoundId,
            msg.sender,
            amount,
            targetMultiplier,
            autoCashout
        );
    }

    function _calculateCrashResult(
        bytes32 _randomBytes
    ) internal pure returns (uint256) {
        uint256 randomInt = uint256(_randomBytes);
        if (randomInt % 33 == 0) {
            return 100;
        }

        uint256 e = 2 ** 52;
        uint256 h = randomInt % e;

        uint256 numerator = (100 * e) - h;
        uint256 denominator = e - h;

        uint256 crash = (numerator * 1e2) / denominator; // 2 Dezimalstellen
        return crash / 100;
    }

    function claimWinnings(uint256 _roundId) external nonReentrant {
        require(
            s_rounds[_roundId].state == RoundState.RESOLVED,
            "Current Round is not resolved yet"
        );
        require(
            s_bets[_roundId][msg.sender].targetMultiplier <
                s_rounds[_roundId].crashMultiplier,
            "Not claimable"
        );

        uint256 claim = s_bets[_roundId][msg.sender].amount *
            (s_bets[_roundId][msg.sender].targetMultiplier / 100);
        uint256 fee = (claim * s_feeBasisPoints) / BPS_DENOMINATOR;
        s_feesCollected += fee;
        uint256 payout = claim - fee;
        s_bets[_roundId][msg.sender].claimed = true;

        (bool success, ) = msg.sender.call{value: payout}("");
        require(success, "Payout failed!");

        emit WinningsClaimed(msg.sender, _roundId, claim);
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        payable(i_owner).transfer(balance);
    }

    function withdrawFees() external onlyOwner {
        require(s_feesCollected > 0, "No funds to withdraw");
        payable(i_owner).transfer(s_feesCollected);
    }

    ////////////////////////////////////
    // Internal Game Mechanics
    ///////////////////////////////////

    function getCurrentRoundState() public view returns (RoundState) {
        return s_rounds[s_currentRoundId].state;
    }

    function getCurrentRoundStartTime() public view returns (uint256) {
        return s_rounds[s_currentRoundId].startTime;
    }

    function getCurrentRoundCrashTime() public view returns (uint256) {
        return s_rounds[s_currentRoundId].crashTime;
    }

    function getCurrentRoundLockTime() public view returns (uint256) {
        return s_rounds[s_currentRoundId].lockTime;
    }

    function getCrashMultiplier() public view returns (uint256) {
        return s_rounds[s_currentRoundId].crashMultiplier;
    }

    function getCurrentUserBet(address _user) public view returns (Bet memory) {
        require(
            s_bets[s_currentRoundId][_user].amount != 0,
            "This user has not placed a bet on this round"
        );
        return s_bets[s_currentRoundId][_user];
    }

    function getLastRoundResult() public view returns (Round memory) {
        return s_rounds[s_currentRoundId - 1];
    }

}
