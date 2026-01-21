// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@pythnetwork/entropy-sdk-solidity/IEntropy.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Raffle is IEntropyConsumer, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    IEntropy public entropy;
    address public provider;
    IERC20 public pyusdToken;
    address public factory; // Reference to factory for funding

    enum PrizeType { Crypto, Physical, Digital }
 
    // Raffle details
    PrizeType public prizeType;
    uint256 public prizeAmount; // For crypto in PYUSD (with decimals)
    string public prizeDescription; // e.g., "PlayStation 5"
    uint256 public ticketPrice; // in PYUSD (with decimals)
    uint256 public maxTickets;
    uint256 public maxTicketsPerUser; // Per-user ticket limit to prevent 51% attacks
    uint256 public startTime; // Unix timestamp when raffle starts
    uint256 public endTime; // Unix timestamp when raffle ends
    uint256 public houseFeePercentage; // e.g., 300 for 3%
    mapping(address => uint256) public entrantTickets; // Tickets per user
    address[] public entrants; // List of unique entrants
    uint256 public totalTicketsSold;
    bool public isClosed;
    address public winner;
    bool public prizeClaimed;

    // Randomness
    uint64 public currentSequenceNumber;
    bytes32 public userCommitment; // Stored for reference
    mapping(uint64 => bool) public pendingRequests;

    event RaffleInitialized(uint256 ticketPrice, uint256 startTime, uint256 endTime);
    event TicketPurchased(address buyer, uint256 numTickets);
    event RaffleClosed(uint64 sequenceNumber);
    event WinnerSelected(address winner);
    event PrizeDistributed(address winner, uint256 amount);

    constructor(
        address _entropyAddress,
        address _provider,
        address _pyusdToken,
        PrizeType _prizeType,
        uint256 _prizeAmount,
        string memory _prizeDescription,
        uint256 _ticketPrice,
        uint256 _maxTickets,
        uint256 _maxTicketsPerUser,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _houseFeePercentage,
        address _admin,
        address _factory
    ) Ownable(_admin) {
        entropy = IEntropy(_entropyAddress);
        provider = _provider;
        pyusdToken = IERC20(_pyusdToken);
        factory = _factory;
        prizeType = _prizeType;
        prizeAmount = _prizeAmount;
        prizeDescription = _prizeDescription;
        ticketPrice = _ticketPrice;
        maxTickets = _maxTickets;
        maxTicketsPerUser = _maxTicketsPerUser;
        startTime = _startTime;
        endTime = _endTime;
        houseFeePercentage = _houseFeePercentage;
        emit RaffleInitialized(_ticketPrice, _startTime, _endTime);
    }

    // Buy tickets
    function buyTicket(uint256 numTickets) external nonReentrant {
        require(!isClosed, "Raffle closed");
        require(block.timestamp >= startTime, "Raffle not started yet");
        require(block.timestamp < endTime, "Raffle ended");
        require(totalTicketsSold + numTickets <= maxTickets, "Max tickets exceeded");
        require(entrantTickets[msg.sender] + numTickets <= maxTicketsPerUser, "Max tickets per user exceeded");
        
        uint256 totalCost = ticketPrice * numTickets;
        require(pyusdToken.balanceOf(msg.sender) >= totalCost, "Insufficient PYUSD balance");
        require(pyusdToken.allowance(msg.sender, address(this)) >= totalCost, "Insufficient PYUSD allowance");

        // Transfer PYUSD tokens from user to contract
        pyusdToken.safeTransferFrom(msg.sender, address(this), totalCost);

        if (entrantTickets[msg.sender] == 0) {
            entrants.push(msg.sender);
        }
        entrantTickets[msg.sender] += numTickets;
        totalTicketsSold += numTickets;
        emit TicketPurchased(msg.sender, numTickets);
    }

    // Close raffle and request randomness
    function closeRaffle(bytes32 _userCommitment) external onlyOwner {
        require(!isClosed, "Already closed");
        require(block.timestamp >= startTime, "Raffle not started yet");
        require(block.timestamp >= endTime || totalTicketsSold >= maxTickets, "Not ready to close");
        require(totalTicketsSold > 0, "No entrants");

        uint128 fee = entropy.getFee(provider);
        require(address(this).balance >= fee, "Insufficient ETH fee balance"); // Still need ETH for entropy fees

        userCommitment = _userCommitment;
        currentSequenceNumber = entropy.requestWithCallback{value: fee}(provider, _userCommitment);
        pendingRequests[currentSequenceNumber] = true;
        isClosed = true;
        emit RaffleClosed(currentSequenceNumber);
    }

    // Auto-close raffle when conditions are met (admin only)
    function closeIfReady() external onlyOwner {
        require(!isClosed, "Already closed");
        require(block.timestamp >= startTime, "Raffle not started yet");
        require(block.timestamp >= endTime || totalTicketsSold >= maxTickets, "Not ready to close");
        require(totalTicketsSold > 0, "No entrants");

        uint128 fee = entropy.getFee(provider);
        
        // Check if we have enough ETH, if not request from factory
        if (address(this).balance < fee) {
            // Request funding from factory
            (bool success, ) = factory.call(
                abi.encodeWithSignature("requestEntropyFunding(address)", address(this))
            );
            require(success, "Failed to get funding from factory");
        }
        
        require(address(this).balance >= fee, "Insufficient ETH fee balance");

        // Generate random commitment for automatic closing
        bytes32 randomCommitment = keccak256(abi.encodePacked(block.timestamp, block.difficulty, msg.sender));
        
        userCommitment = randomCommitment;
        currentSequenceNumber = entropy.requestWithCallback{value: fee}(provider, randomCommitment);
        pendingRequests[currentSequenceNumber] = true;
        isClosed = true;
        emit RaffleClosed(currentSequenceNumber);
    }

    // Pyth Entropy callback (called by Entropy contract after reveal)
    function entropyCallback(uint64 sequenceNumber, address _provider, bytes32 randomNumber) internal override {
        require(pendingRequests[sequenceNumber], "Invalid request");
        require(_provider == provider, "Invalid provider");
        require(winner == address(0), "Winner already selected");

        // Select winner using randomNumber (weighted by tickets)
        uint256 cumulative = 0;
        uint256 randomIndex = uint256(randomNumber) % totalTicketsSold;
        for (uint256 i = 0; i < entrants.length; i++) {
            cumulative += entrantTickets[entrants[i]];
            if (randomIndex < cumulative) {
                winner = entrants[i];
                break;
            }
        }

        emit WinnerSelected(winner);
        delete pendingRequests[sequenceNumber];
    }

    // Distribute prize
    function distributePrize() external onlyOwner nonReentrant {
        require(isClosed, "Raffle not closed");
        require(winner != address(0), "Winner not selected");
        require(!prizeClaimed, "Prize already claimed");

        uint256 totalPot = pyusdToken.balanceOf(address(this));
        
        // If no PYUSD tokens, just return ETH to factory
        if (totalPot == 0) {
            uint256 ethBalance = address(this).balance;
            if (ethBalance > 0) {
                (bool success, ) = payable(factory).call{value: ethBalance}("");
                require(success, "Failed to return ETH to factory");
            }
            prizeClaimed = true;
            emit PrizeDistributed(winner, 0);
            return;
        }

        uint256 houseFee = (totalPot * houseFeePercentage) / 10000; // e.g., 3% = 300 / 10000 = 0.03
        uint256 winnerAmount = totalPot - houseFee;

        if (prizeType == PrizeType.Crypto) {
            pyusdToken.safeTransfer(winner, winnerAmount);
        } else {
            // For Physical/Digital: Transfer pot minus fee to admin for fulfillment
            pyusdToken.safeTransfer(owner(), winnerAmount);
        }

        // Transfer house fee to admin
        pyusdToken.safeTransfer(owner(), houseFee);

        // Return leftover ETH to factory
        uint256 ethBalance = address(this).balance;
        if (ethBalance > 0) {
            (bool success, ) = payable(factory).call{value: ethBalance}("");
            require(success, "Failed to return ETH to factory");
        }

        prizeClaimed = true;
        emit PrizeDistributed(winner, winnerAmount);
    }

    // Required by IEntropyConsumer
    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }

    // Fund the contract for ETH fees (admin)
    receive() external payable {}
    
    // Emergency function to withdraw ETH (admin only)
    function withdrawETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    // Emergency function to withdraw PYUSD (admin only)
    function withdrawPYUSD() external onlyOwner {
        uint256 balance = pyusdToken.balanceOf(address(this));
        pyusdToken.safeTransfer(owner(), balance);
    }
}