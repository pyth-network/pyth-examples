// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
import "./interfaces/IDailyLottery.sol";

/**
 * @title CryptoRoulette
 * @notice A crypto roulette game that uses Pyth Entropy for verifiable randomness
 * @dev Players spin the roulette by guessing one of 5 crypto assets
 */
contract CryptoRoulette is IEntropyConsumer {
    
    // ============ Enums ============
    
    enum Asset { BTC, ETH, SOL, AVAX, DOGE }
    
    // ============ Structs ============
    
    struct SpinRequest {
        address player;
        Asset guessedAsset;
        uint256 day;
        bool fulfilled;
        Asset resultAsset;
        bool won;
    }
    
    // ============ State Variables ============
    
    IEntropyV2 public immutable entropy;
    IDailyLottery public immutable lotteryContract;
    
    address public owner;
    uint256 public ticketPrice;
    uint256 public currentDay;
    
    // Mapping from Entropy sequence number to spin request
    mapping(uint64 => SpinRequest) public spins;
    
    // ============ Events ============
    
    event SpinRequested(
        address indexed player,
        uint64 indexed sequenceNumber,
        Asset guess,
        uint256 day
    );
    
    event SpinCompleted(
        uint64 indexed sequenceNumber,
        Asset result,
        bool won,
        address indexed player
    );
    
    event DayAdvanced(uint256 newDay);
    event TicketPriceUpdated(uint256 newPrice);
    
    // ============ Errors ============
    
    error NotEnoughFees();
    error Unauthorized();
    error TransferFailed();
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }
    
    // ============ Constructor ============
    
    /**
     * @notice Initializes the CryptoRoulette contract
     * @param _entropy Address of the Entropy contract
     * @param _lottery Address of the DailyLottery contract
     * @param _ticketPrice Price of each ticket (goes to lottery pool)
     */
    constructor(
        address _entropy,
        address _lottery,
        uint256 _ticketPrice
    ) {
        entropy = IEntropyV2(_entropy);
        lotteryContract = IDailyLottery(_lottery);
        ticketPrice = _ticketPrice;
        owner = msg.sender;
        currentDay = 1; // Start at day 1
    }
    
    // ============ External Functions ============
    
    /**
     * @notice Spin the roulette with a guess
     * @param guess The asset the player is guessing will be selected
     */
    function spinRoulette(Asset guess) external payable {
        // Get the required Entropy fee
        uint128 entropyFee = entropy.getFeeV2();
        
        // Validate payment covers both entropy fee and ticket price
        if (msg.value < entropyFee + ticketPrice) revert NotEnoughFees();
        
        // Request random number from Entropy
        uint64 sequenceNumber = entropy.requestV2{ value: entropyFee }();
        
        // Store the spin request
        spins[sequenceNumber] = SpinRequest({
            player: msg.sender,
            guessedAsset: guess,
            day: currentDay,
            fulfilled: false,
            resultAsset: Asset.BTC, // Placeholder, will be set in callback
            won: false
        });
        
        emit SpinRequested(msg.sender, sequenceNumber, guess, currentDay);
    }
    
    /**
     * @notice Advances to the next day
     * @dev Only callable by owner, typically at the end of each day
     */
    function advanceDay() external onlyOwner {
        currentDay++;
        emit DayAdvanced(currentDay);
    }
    
    /**
     * @notice Updates the ticket price
     * @param newPrice The new ticket price
     */
    function setTicketPrice(uint256 newPrice) external onlyOwner {
        ticketPrice = newPrice;
        emit TicketPriceUpdated(newPrice);
    }
    
    /**
     * @notice Withdraws accumulated entropy fees
     * @dev Withdraws any ETH balance beyond what's needed for pending tickets
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = owner.call{value: balance}("");
        if (!success) revert TransferFailed();
    }
    
    /**
     * @notice Transfers ownership to a new address
     * @param newOwner The new owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Returns the Entropy contract address
     * @return Address of the Entropy contract
     */
    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }
    
    /**
     * @notice Gets details of a specific spin
     * @param sequenceNumber The sequence number of the spin
     * @return The SpinRequest struct
     */
    function getSpinDetails(uint64 sequenceNumber) external view returns (SpinRequest memory) {
        return spins[sequenceNumber];
    }
    
    /**
     * @notice Gets the current day number
     * @return The current day
     */
    function getCurrentDay() external view returns (uint256) {
        return currentDay;
    }
    
    /**
     * @notice Calculates the total cost to spin (entropy fee + ticket price)
     * @return The total cost in wei
     */
    function getTotalSpinCost() external view returns (uint256) {
        return uint256(entropy.getFeeV2()) + ticketPrice;
    }
    
    // ============ Internal Functions ============
    
    /**
     * @notice Callback function called by Entropy with the random number
     * @param sequenceNumber The sequence number of the request
     * @param randomNumber The random number provided by Entropy
     */
    function entropyCallback(
        uint64 sequenceNumber,
        address, // provider address, not used
        bytes32 randomNumber
    ) internal override {
        SpinRequest storage spin = spins[sequenceNumber];
        
        // Determine the winning asset (0-4 maps to BTC, ETH, SOL, AVAX, DOGE)
        uint256 randomIndex = uint256(randomNumber) % 5;
        Asset resultAsset = Asset(randomIndex);
        
        // Check if player won
        bool won = (resultAsset == spin.guessedAsset);
        
        // Update the spin request
        spin.fulfilled = true;
        spin.resultAsset = resultAsset;
        spin.won = won;
        
        // ALWAYS add ticket price to the pool (regardless of win/loss)
        lotteryContract.addToPool{value: ticketPrice}(spin.day);
        
        // ONLY add to whitelist if player won
        if (won) {
            lotteryContract.addToWhitelist(spin.player, spin.day);
        }
        
        emit SpinCompleted(sequenceNumber, resultAsset, won, spin.player);
    }
    
    // ============ Receive Function ============
    
    receive() external payable {}
}

