// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import { IEntropyConsumer } from "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
import { IEntropyV2 } from "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import {ContractRegistry} from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";
import {RandomNumberV2Interface} from "@flarenetwork/flare-periphery-contracts/coston2/RandomNumberV2Interface.sol";

interface IERC20 {
  function transferFrom(address from, address to, uint256 amount) external returns (bool);
  function transfer(address to, uint256 amount) external returns (bool);
  function balanceOf(address account) external view returns (uint256);
}
 
// @param entropyAddress The address of the entropy contract.
// @param wagerAmount The wager amount in wei.
// @param usdcAddress The address of the USDC token contract.
contract Snake is IEntropyConsumer {
  IEntropyV2 public entropy;
  bytes32 public number;
  uint256 public numberAsUint;
  uint256 public wagerAmount;
  address public usdcAddress;
  bool public isFlare;
  // Player balances and ready states
  uint256 public player1Balance;
  uint256 public player2Balance;
  bool public player1Ready;
  bool public player2Ready;

  // Flare Random Number V2
  RandomNumberV2Interface public randomV2;
 
  constructor(address entropyAddress, uint256 _wagerAmount, address _usdcAddress, bool _isFlare) {
    entropy = IEntropyV2(entropyAddress);
    wagerAmount = _wagerAmount;
    usdcAddress = _usdcAddress;
    randomV2 = ContractRegistry.getRandomNumberV2();
    isFlare = _isFlare;
  }

  function requestRandomNumber() external payable {
    if (isFlare) {
              (uint256 _randomNumber, bool _isSecure, uint256 _timestamp) = randomV2
            .getRandomNumber();

            number = bytes32(_randomNumber);
            numberAsUint = uint256(_randomNumber);
    } else {
    uint256 fee = entropy.getFeeV2();
    uint64 sequenceNumber = entropy.requestV2{ value: fee }();
    }
  }

function wagerPlayer1() external payable {
  require(!player1Ready, "Player 1 already ready");
  
  // Transfer USDC from user to contract
  IERC20 usdc = IERC20(usdcAddress);
  require(usdc.transferFrom(msg.sender, address(this), wagerAmount), "USDC transfer failed");
  
  // Set player 1 ready state
  player1Ready = true;
  
  if (isFlare) {
    // Flare: use RandomNumberV2 (no fee needed)
    (uint256 _randomNumber, bool _isSecure, uint256 _timestamp) = randomV2.getRandomNumber();
    number = bytes32(_randomNumber);
    numberAsUint = uint256(_randomNumber);
    
    // Refund any ETH sent (should be 0, but just in case)
    if (msg.value > 0) {
      payable(msg.sender).transfer(msg.value);
    }
  } else {
    // Pyth: require ETH fee and request random number
    uint256 fee = entropy.getFeeV2();
    require(msg.value >= fee, "Insufficient ETH for Pyth fee");
    entropy.requestV2{ value: fee }();
    
    // Refund excess ETH if any
    if (msg.value > fee) {
      payable(msg.sender).transfer(msg.value - fee);
    }
  }
}

function wagerPlayer2() external payable {
  require(!player2Ready, "Player 2 already ready");
  
  // Transfer USDC from user to contract
  IERC20 usdc = IERC20(usdcAddress);
  require(usdc.transferFrom(msg.sender, address(this), wagerAmount), "USDC transfer failed");
  
  // Set player 2 ready state
  player2Ready = true;
  
  if (isFlare) {
    // Flare: use RandomNumberV2 (no fee needed)
    (uint256 _randomNumber, bool _isSecure, uint256 _timestamp) = randomV2.getRandomNumber();
    number = bytes32(_randomNumber);
    numberAsUint = uint256(_randomNumber);
    
    // Refund any ETH sent (should be 0, but just in case)
    if (msg.value > 0) {
      payable(msg.sender).transfer(msg.value);
    }
  } else {
    // Pyth: require ETH fee and request random number
    uint256 fee = entropy.getFeeV2();
    require(msg.value >= fee, "Insufficient ETH for Pyth fee");
    entropy.requestV2{ value: fee }();
    
    // Refund excess ETH if any
    if (msg.value > fee) {
      payable(msg.sender).transfer(msg.value - fee);
    }
  }
}
 

   function entropyCallback(
    uint64 sequenceNumber,
    address provider,
    bytes32 randomNumber
  ) internal override {
    number = randomNumber;
    numberAsUint = uint256(randomNumber);
  }

  // This method is required by the IEntropyConsumer interface.
  // It returns the address of the entropy contract which will call the callback.
  function getEntropy() internal view override returns (address) {
    return address(entropy);
  }

  /**
   * @notice Consensus-based winner selection with hash verification
   * @dev NOTE: For hackathon purposes, this is a single function combining what would normally be
   *      three separate functions (one for each party: player1, player2, server) in a distributed
   *      consensus system. In production, each party would submit their vote and hash separately
   *      to prevent collusion and ensure verifiability.
   * 
   * @param p1hash Game state hash from player 1
   * @param p2hash Game state hash from player 2
   * @param serverhash Game state hash from server
   * @param p1winner True if player 1 votes for player 1, false if player 1 votes for player 2
   * @param p2winner True if player 2 votes for player 1, false if player 2 votes for player 2
   * @param serverwinner True if server votes for player 1, false if server votes for player 2
   */
  function chooseWinner(
    bytes32 p1hash,
    bytes32 p2hash,
    bytes32 serverhash,
    bool p1winner,
    bool p2winner,
    bool serverwinner
  ) external {
    require(player1Ready && player2Ready, "Both players must be ready");
    
    uint256 totalWager = wagerAmount * 2; // Total wager in contract (2 * wagerAmount)
    
    // Count votes for player 1 (true votes)
    uint256 votesForP1 = 0;
    if (p1winner) votesForP1++;
    if (p2winner) votesForP1++;
    if (serverwinner) votesForP1++;
    
    // Determine majority winner (2/3 or more)
    bool p1Wins = votesForP1 >= 2;
    bool p2Wins = votesForP1 <= 1;
    
    if (p1Wins) {
      // Player 1 wins by majority - verify hashes match among voters
      bytes32[] memory winnerHashes = new bytes32[](votesForP1);
      uint256 index = 0;
      
      if (p1winner) {
        winnerHashes[index] = p1hash;
        index++;
      }
      if (p2winner) {
        winnerHashes[index] = p2hash;
        index++;
      }
      if (serverwinner) {
        winnerHashes[index] = serverhash;
        index++;
      }
      
      // Check if all hashes match
      bool hashesMatch = true;
      for (uint256 i = 1; i < winnerHashes.length; i++) {
        if (winnerHashes[0] != winnerHashes[i]) {
          hashesMatch = false;
          break;
        }
      }
      
      if (hashesMatch) {
        // Hashes match - pay winner the full pot (wager * 2)
        player1Balance += totalWager;
      } else {
        // Hashes don't match - refund both players (split 50/50)
        player1Balance += wagerAmount;
        player2Balance += wagerAmount;
      }
    } else if (p2Wins) {
      // Player 2 wins by majority - verify hashes match among voters
      bytes32[] memory winnerHashes = new bytes32[](3 - votesForP1);
      uint256 index = 0;
      
      if (!p1winner) {
        winnerHashes[index] = p1hash;
        index++;
      }
      if (!p2winner) {
        winnerHashes[index] = p2hash;
        index++;
      }
      if (!serverwinner) {
        winnerHashes[index] = serverhash;
        index++;
      }
      
      // Check if all hashes match
      bool hashesMatch = true;
      for (uint256 i = 1; i < winnerHashes.length; i++) {
        if (winnerHashes[0] != winnerHashes[i]) {
          hashesMatch = false;
          break;
        }
      }
      
      if (hashesMatch) {
        // Hashes match - pay winner the full pot (wager * 2)
        player2Balance += totalWager;
      } else {
        // Hashes don't match - refund both players (split 50/50)
        player1Balance += wagerAmount;
        player2Balance += wagerAmount;
      }
    }
    
    // Reset ready states for next game
    player1Ready = false;
    player2Ready = false;
  }
}

 

