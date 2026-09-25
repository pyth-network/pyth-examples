// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";

/**
 * @title DailyLottery
 * @notice Manages daily lottery draws using Pyth Entropy for random winner selection
 * @dev Only whitelisted players (those who won the roulette) can win the lottery
 */
contract DailyLottery is IEntropyConsumer {
    
    // ============ Structs ============
    
    struct DrawRequest {
        uint256 day;
        bool fulfilled;
        address winner;
        uint256 prize;
    }
    
    // ============ State Variables ============
    
    IEntropyV2 public immutable entropy;
    address public rouletteContract;
    address public owner;
    bool private rouletteSet;
    
    // Mappings for daily lottery data
    mapping(uint256 => address[]) public dailyWhitelist;
    mapping(uint256 => uint256) public dailyPool;
    mapping(uint64 => DrawRequest) public draws;
    mapping(uint256 => bool) public dayCompleted;
    
    // ============ Events ============
    
    event PlayerWhitelisted(address indexed player, uint256 indexed day);
    
    event PoolIncreased(
        uint256 indexed day,
        uint256 amount,
        uint256 newTotal
    );
    
    event DrawRequested(
        uint256 indexed day,
        uint64 indexed sequenceNumber,
        uint256 whitelistSize,
        uint256 poolAmount
    );
    
    event WinnerSelected(
        uint256 indexed day,
        address indexed winner,
        uint256 prize
    );
    
    // ============ Errors ============
    
    error Unauthorized();
    error PoolEmpty();
    error WhitelistEmpty();
    error DayAlreadyCompleted();
    error TransferFailed();
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }
    
    modifier onlyRoulette() {
        if (msg.sender != rouletteContract) revert Unauthorized();
        _;
    }
    
    // ============ Constructor ============
    
    /**
     * @notice Initializes the DailyLottery contract
     * @param _entropy Address of the Entropy contract
     * @param _rouletteContract Address of the CryptoRoulette contract
     */
    constructor(address _entropy, address _rouletteContract) {
        entropy = IEntropyV2(_entropy);
        rouletteContract = _rouletteContract;
        owner = msg.sender;
    }
    
    // ============ External Functions ============
    
    /**
     * @notice Adds a player to the whitelist for a specific day
     * @dev Only callable by the roulette contract
     * @param player Address of the player who won the roulette
     * @param day The day number for which to add the player
     */
    function addToWhitelist(address player, uint256 day) external onlyRoulette {
        // Add player to whitelist (duplicates allowed intentionally)
        dailyWhitelist[day].push(player);
        
        emit PlayerWhitelisted(player, day);
    }
    
    /**
     * @notice Adds funds to the daily pool
     * @dev Only callable by the roulette contract
     * @param day The day number for which to add to the pool
     */
    function addToPool(uint256 day) external payable onlyRoulette {
        dailyPool[day] += msg.value;
        
        emit PoolIncreased(day, msg.value, dailyPool[day]);
    }
    
    /**
     * @notice Starts the daily lottery draw for a specific day
     * @dev Only callable by owner, requests random number from Entropy
     * @param day The day number for which to start the draw
     */
    function startDailyDraw(uint256 day) external payable onlyOwner {
        // Validations
        if (dayCompleted[day]) revert DayAlreadyCompleted();
        if (dailyPool[day] == 0) revert PoolEmpty();
        if (dailyWhitelist[day].length == 0) revert WhitelistEmpty();
        
        // Get the required Entropy fee
        uint128 entropyFee = entropy.getFeeV2();
        if (msg.value < entropyFee) revert Unauthorized(); // Reusing error for simplicity
        
        // Request random number from Entropy
        uint64 sequenceNumber = entropy.requestV2{ value: entropyFee }();
        
        // Store the draw request
        draws[sequenceNumber] = DrawRequest({
            day: day,
            fulfilled: false,
            winner: address(0),
            prize: dailyPool[day]
        });
        
        emit DrawRequested(
            day,
            sequenceNumber,
            dailyWhitelist[day].length,
            dailyPool[day]
        );
    }
    
    /**
     * @notice Emergency withdrawal function in case of issues
     * @dev Only callable by owner
     * @param day The day for which to withdraw the pool
     */
    function emergencyWithdraw(uint256 day) external onlyOwner {
        if (dayCompleted[day]) revert DayAlreadyCompleted();
        
        uint256 amount = dailyPool[day];
        dailyPool[day] = 0;
        
        (bool success, ) = owner.call{value: amount}("");
        if (!success) revert TransferFailed();
    }
    
    /**
     * @notice Sets the roulette contract address (can only be called once)
     * @param _roulette The address of the CryptoRoulette contract
     */
    function setRouletteContract(address _roulette) external onlyOwner {
        require(!rouletteSet, "Already configured");
        require(_roulette != address(0), "Invalid address");
        rouletteContract = _roulette;
        rouletteSet = true;
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
     * @notice Gets the whitelist for a specific day
     * @param day The day number
     * @return Array of whitelisted addresses (may contain duplicates)
     */
    function getWhitelist(uint256 day) external view returns (address[] memory) {
        return dailyWhitelist[day];
    }
    
    /**
     * @notice Gets the pool amount for a specific day
     * @param day The day number
     * @return The pool amount in wei
     */
    function getPoolAmount(uint256 day) external view returns (uint256) {
        return dailyPool[day];
    }
    
    /**
     * @notice Gets the whitelist size for a specific day
     * @param day The day number
     * @return The number of entries in the whitelist
     */
    function getWhitelistSize(uint256 day) external view returns (uint256) {
        return dailyWhitelist[day].length;
    }
    
    /**
     * @notice Gets details of a specific draw
     * @param sequenceNumber The sequence number of the draw
     * @return The DrawRequest struct
     */
    function getDrawDetails(uint64 sequenceNumber) external view returns (DrawRequest memory) {
        return draws[sequenceNumber];
    }
    
    /**
     * @notice Checks if a day's lottery has been completed
     * @param day The day number
     * @return True if completed, false otherwise
     */
    function isDayCompleted(uint256 day) external view returns (bool) {
        return dayCompleted[day];
    }
    
    // ============ Internal Functions ============
    
    /**
     * @notice Callback function called by Entropy with the random number
     * @dev Selects the winner and transfers the prize
     * @param sequenceNumber The sequence number of the request
     * @param randomNumber The random number provided by Entropy
     */
    function entropyCallback(
        uint64 sequenceNumber,
        address, // provider address, not used
        bytes32 randomNumber
    ) internal override {
        DrawRequest storage draw = draws[sequenceNumber];
        
        // Ensure draw hasn't been fulfilled already
        if (draw.fulfilled) return;
        
        uint256 day = draw.day;
        address[] memory whitelist = dailyWhitelist[day];
        
        // Select winner using random number
        uint256 winnerIndex = uint256(randomNumber) % whitelist.length;
        address winner = whitelist[winnerIndex];
        
        // Get prize amount
        uint256 prize = dailyPool[day];
        
        // Update state
        draw.fulfilled = true;
        draw.winner = winner;
        dayCompleted[day] = true;
        dailyPool[day] = 0; // Clear the pool
        
        // Transfer prize to winner
        (bool success, ) = winner.call{value: prize}("");
        if (!success) revert TransferFailed();
        
        emit WinnerSelected(day, winner, prize);
    }
    
    // ============ Receive Function ============
    
    receive() external payable {}
}

