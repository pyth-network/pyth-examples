// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Raffle.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropy.sol";

contract RaffleFactory {
    address public entropyAddress;
    address public defaultProvider;
    address public pyusdToken;
    address[] public raffles;
    uint256 public fundingAmount; // Amount of ETH to send to each new raffle
    uint256 public entropyFeeReserve; // ETH reserved for entropy fees

    event RaffleCreated(address raffleAddress, string prizeDescription, uint256 fundingAmount);
    event ETHDeposited(address depositor, uint256 amount);
    event ETHWithdrawn(address withdrawer, uint256 amount);

    constructor(
        address _entropyAddress, 
        address _defaultProvider, 
        address _pyusdToken,
        uint256 _fundingAmount
    ) {
        entropyAddress = _entropyAddress;
        defaultProvider = _defaultProvider;
        pyusdToken = _pyusdToken;
        fundingAmount = _fundingAmount; // e.g., 0.01 ETH
    }

    function createRaffle(
        Raffle.PrizeType _prizeType,
        uint256 _prizeAmount,
        string memory _prizeDescription,
        uint256 _ticketPrice,
        uint256 _maxTickets,
        uint256 _maxTicketsPerUser,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _houseFeePercentage
    ) external returns (address) {
        // Validate timing
        require(_startTime < _endTime, "Start time must be before end time");
        require(_startTime > block.timestamp, "Start time must be in the future");
        
        // Check if factory has enough ETH for funding
        require(address(this).balance >= fundingAmount, "Factory has insufficient ETH for raffle funding");
        require(entropyFeeReserve >= fundingAmount, "Insufficient ETH reserve for raffle funding");
        
        Raffle newRaffle = new Raffle(
            entropyAddress,
            defaultProvider,
            pyusdToken,
            _prizeType,
            _prizeAmount,
            _prizeDescription,
            _ticketPrice,
            _maxTickets,
            _maxTicketsPerUser,
            _startTime,
            _endTime,
            _houseFeePercentage,
            msg.sender, // Admin is creator
            address(this) // Factory address
        );
        
        // Fund the new raffle with ETH from factory reserve
        payable(address(newRaffle)).transfer(fundingAmount);
        entropyFeeReserve -= fundingAmount;
        
        raffles.push(address(newRaffle));
        emit RaffleCreated(address(newRaffle), _prizeDescription, fundingAmount);
        
        return address(newRaffle);
    }

    // Deposit ETH to factory for entropy fees
    function depositETH() external payable {
        require(msg.value > 0, "Must deposit some ETH");
        entropyFeeReserve += msg.value;
        emit ETHDeposited(msg.sender, msg.value);
    }

    // Fund a specific raffle with ETH for entropy fees
    function fundRaffleForEntropy(address raffleAddress) external {
        require(address(this).balance >= entropyFeeReserve, "Insufficient ETH reserve");
        
        // Get entropy fee requirement
        IEntropy entropy = IEntropy(entropyAddress);
        uint128 fee = entropy.getFee(defaultProvider);
        
        // Transfer ETH to raffle
        payable(raffleAddress).transfer(fee);
        entropyFeeReserve -= fee;
    }

    // Auto-fund raffle when closing (called by raffle)
    function requestEntropyFunding(address raffleAddress) external {
        // Only allow calls from deployed raffles
        bool isDeployedRaffle = false;
        for (uint256 i = 0; i < raffles.length; i++) {
            if (raffles[i] == raffleAddress) {
                isDeployedRaffle = true;
                break;
            }
        }
        require(isDeployedRaffle, "Only deployed raffles can request funding");
        
        // Get entropy fee requirement
        IEntropy entropy = IEntropy(entropyAddress);
        uint128 fee = entropy.getFee(defaultProvider);
        
        require(address(this).balance >= fee, "Insufficient ETH for entropy fee");
        require(entropyFeeReserve >= fee, "Insufficient ETH reserve");
        
        // Transfer ETH to raffle
        payable(raffleAddress).transfer(fee);
        entropyFeeReserve -= fee;
    }

    function getRaffles() external view returns (address[] memory) {
        return raffles;
    }

    // Admin function to update funding amount
    function setFundingAmount(uint256 _newAmount) external {
        // Only allow owner to change funding amount
        // You might want to add access control here
        fundingAmount = _newAmount;
    }

    // Emergency function to withdraw ETH from factory
    function withdrawETH() external {
        // Only allow owner to withdraw
        // You might want to add access control here
        payable(msg.sender).transfer(address(this).balance);
    }

    // Get factory ETH balance
    function getFactoryBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // Get entropy fee reserve
    function getEntropyFeeReserve() external view returns (uint256) {
        return entropyFeeReserve;
    }

    // Handle ETH returned from raffles
    function receiveETHFromRaffle() external payable {
        // Only allow calls from deployed raffles
        bool isDeployedRaffle = false;
        for (uint256 i = 0; i < raffles.length; i++) {
            if (raffles[i] == msg.sender) {
                isDeployedRaffle = true;
                break;
            }
        }
        require(isDeployedRaffle, "Only deployed raffles can return ETH");
        
        entropyFeeReserve += msg.value;
        emit ETHDeposited(msg.sender, msg.value);
    }

    // Receive ETH
    receive() external payable {
        entropyFeeReserve += msg.value;
        emit ETHDeposited(msg.sender, msg.value);
    }
}
