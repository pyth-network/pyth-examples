// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

library LotteryErrors {
    error InsufficientFee();
    error LotteryNotActive();
    error LotteryAlreadyEnded();
    error LotteryNotEnded();
    error NoTicketsSold();
    error AlreadyClaimed();
    error NotWinner();
    error TransferFailed();
}

contract Lottery is IEntropyConsumer, Ownable, ReentrancyGuard {
    enum LotteryStatus {
        ACTIVE,
        DRAWING,
        ENDED
    }

    struct Ticket {
        address buyer;
        uint64 sequenceNumber;
        bytes32 randomNumber;
        bool fulfilled;
    }

    IEntropyV2 private entropy;
    address private entropyProvider;
    
    uint256 public ticketPrice;
    uint256 public prizePool;
    LotteryStatus public status;
    
    uint256 public ticketCount;
    mapping(uint256 => Ticket) public tickets;
    mapping(uint64 => uint256) public sequenceToTicketId;
    mapping(address => uint256[]) public userTickets;
    
    uint64 public winningSequenceNumber;
    bytes32 public winningTargetNumber;
    uint256 public winningTicketId;
    bool public prizeClaimed;

    event TicketPurchased(
        uint256 indexed ticketId,
        address indexed buyer,
        uint64 sequenceNumber
    );

    event TicketRandomNumberRevealed(
        uint256 indexed ticketId,
        uint64 sequenceNumber,
        bytes32 randomNumber
    );

    event LotteryEnded(
        uint256 indexed winningTicketId,
        address indexed winner,
        uint256 prizeAmount
    );

    event WinningTargetSet(
        uint64 sequenceNumber,
        bytes32 targetNumber
    );

    event PrizeClaimed(
        address indexed winner,
        uint256 amount
    );

    constructor(
        address _entropy,
        address _provider,
        uint256 _ticketPrice
    ) Ownable(msg.sender) {
        entropy = IEntropyV2(_entropy);
        entropyProvider = _provider;
        ticketPrice = _ticketPrice;
        status = LotteryStatus.ACTIVE;
    }

    function buyTicket() external payable nonReentrant {
        if (status != LotteryStatus.ACTIVE) {
            revert LotteryErrors.LotteryNotActive();
        }

        uint256 entropyFee = entropy.getFeeV2();
        uint256 totalRequired = ticketPrice + entropyFee;
        
        if (msg.value < totalRequired) {
            revert LotteryErrors.InsufficientFee();
        }

        uint256 ticketId = ticketCount++;
        
        uint64 sequenceNumber = entropy.requestV2{value: entropyFee}();

        tickets[ticketId] = Ticket({
            buyer: msg.sender,
            sequenceNumber: sequenceNumber,
            randomNumber: bytes32(0),
            fulfilled: false
        });

        sequenceToTicketId[sequenceNumber] = ticketId;
        userTickets[msg.sender].push(ticketId);
        prizePool += ticketPrice;

        emit TicketPurchased(ticketId, msg.sender, sequenceNumber);

        if (msg.value > totalRequired) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - totalRequired}("");
            if (!success) {
                revert LotteryErrors.TransferFailed();
            }
        }
    }

    function endLottery() external onlyOwner nonReentrant {
        if (status != LotteryStatus.ACTIVE) {
            revert LotteryErrors.LotteryAlreadyEnded();
        }
        
        if (ticketCount == 0) {
            revert LotteryErrors.NoTicketsSold();
        }

        status = LotteryStatus.DRAWING;

        uint256 entropyFee = entropy.getFeeV2();
        winningSequenceNumber = entropy.requestV2{value: entropyFee}();
    }

    function entropyCallback(
        uint64 sequenceNumber,
        address,
        bytes32 randomNumber
    ) internal override {
        if (sequenceNumber == winningSequenceNumber) {
            winningTargetNumber = randomNumber;
            status = LotteryStatus.ENDED;
            
            uint256 closestTicketId = 0;
            uint256 smallestDifference = type(uint256).max;

            for (uint256 i = 0; i < ticketCount; i++) {
                if (tickets[i].fulfilled) {
                    uint256 difference = _calculateDifference(
                        tickets[i].randomNumber,
                        winningTargetNumber
                    );
                    
                    if (difference < smallestDifference) {
                        smallestDifference = difference;
                        closestTicketId = i;
                    }
                }
            }

            winningTicketId = closestTicketId;

            emit WinningTargetSet(sequenceNumber, randomNumber);
            emit LotteryEnded(
                closestTicketId,
                tickets[closestTicketId].buyer,
                prizePool
            );
        } else {
            uint256 ticketId = sequenceToTicketId[sequenceNumber];
            tickets[ticketId].randomNumber = randomNumber;
            tickets[ticketId].fulfilled = true;

            emit TicketRandomNumberRevealed(ticketId, sequenceNumber, randomNumber);
        }
    }

    function claimPrize() external nonReentrant {
        if (status != LotteryStatus.ENDED) {
            revert LotteryErrors.LotteryNotEnded();
        }
        
        if (tickets[winningTicketId].buyer != msg.sender) {
            revert LotteryErrors.NotWinner();
        }
        
        if (prizeClaimed) {
            revert LotteryErrors.AlreadyClaimed();
        }

        prizeClaimed = true;
        uint256 amount = prizePool;

        emit PrizeClaimed(msg.sender, amount);

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            revert LotteryErrors.TransferFailed();
        }
    }

    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }

    function getUserTickets(address user) external view returns (uint256[] memory) {
        return userTickets[user];
    }

    function getTicket(uint256 ticketId) external view returns (
        address buyer,
        uint64 sequenceNumber,
        bytes32 randomNumber,
        bool fulfilled
    ) {
        Ticket memory ticket = tickets[ticketId];
        return (
            ticket.buyer,
            ticket.sequenceNumber,
            ticket.randomNumber,
            ticket.fulfilled
        );
    }

    function getTotalCost() external view returns (uint256) {
        uint256 entropyFee = entropy.getFeeV2();
        return ticketPrice + entropyFee;
    }

    function getWinnerAddress() external view returns (address) {
        if (status != LotteryStatus.ENDED) {
            return address(0);
        }
        return tickets[winningTicketId].buyer;
    }

    function _calculateDifference(bytes32 a, bytes32 b) private pure returns (uint256) {
        uint256 aValue = uint256(a);
        uint256 bValue = uint256(b);
        return aValue > bValue ? aValue - bValue : bValue - aValue;
    }

    receive() external payable {}
}
