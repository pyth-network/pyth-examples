// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title JurorRegistry
 * @notice Manages juror registration and stake tracking
 */
contract JurorRegistry is Ownable {
    struct Juror {
        address addr;
        uint256 stake;
        uint256 registrationTime;
    }

    IERC20 public immutable token;
    uint256 public constant MIN_STAKE = 100 * 10**18; // 100 tokens

    mapping(address => Juror) public jurors;
    address[] public jurorList;

    event JurorRegistered(address indexed juror, uint256 stake);
    event StakeIncreased(address indexed juror, uint256 amount, uint256 newStake);
    event StakeWithdrawn(address indexed juror, uint256 amount, uint256 remainingStake);

    constructor(address _token) Ownable(msg.sender) {
        token = IERC20(_token);
    }

    /**
     * @notice Register as a juror by staking tokens
     * @param amount Amount of tokens to stake
     */
    function registerJuror(uint256 amount) external {
        require(!isJuror(msg.sender), "Already registered");
        require(amount >= MIN_STAKE, "Insufficient stake");

        token.transferFrom(msg.sender, address(this), amount);

        jurors[msg.sender] = Juror({
            addr: msg.sender,
            stake: amount,
            registrationTime: block.timestamp
        });

        jurorList.push(msg.sender);

        emit JurorRegistered(msg.sender, amount);
    }

    /**
     * @notice Increase your stake
     * @param amount Additional amount to stake
     */
    function increaseStake(uint256 amount) external {
        require(isJuror(msg.sender), "Not a juror");
        require(amount > 0, "Amount must be positive");

        token.transferFrom(msg.sender, address(this), amount);
        jurors[msg.sender].stake += amount;

        emit StakeIncreased(msg.sender, amount, jurors[msg.sender].stake);
    }

    /**
     * @notice Withdraw stake (must maintain minimum)
     * @param amount Amount to withdraw
     */
    function withdrawStake(uint256 amount) external {
        require(isJuror(msg.sender), "Not a juror");
        require(amount > 0, "Amount must be positive");

        uint256 currentStake = jurors[msg.sender].stake;
        require(currentStake >= amount, "Insufficient stake");
        require(currentStake - amount >= MIN_STAKE, "Must maintain minimum stake");

        jurors[msg.sender].stake -= amount;
        token.transfer(msg.sender, amount);

        emit StakeWithdrawn(msg.sender, amount, jurors[msg.sender].stake);
    }

    /**
     * @notice Check if address is a registered juror
     * @param account Address to check
     * @return True if registered
     */
    function isJuror(address account) public view returns (bool) {
        return jurors[account].stake >= MIN_STAKE;
    }

    /**
     * @notice Get total number of jurors
     * @return Number of registered jurors
     */
    function getJurorCount() external view returns (uint256) {
        return jurorList.length;
    }

    /**
     * @notice Get juror address at specific index
     * @param index Index in juror list
     * @return Juror address
     */
    function getJurorAtIndex(uint256 index) external view returns (address) {
        require(index < jurorList.length, "Index out of bounds");
        return jurorList[index];
    }

    /**
     * @notice Get staked amount for a specific address
     * @param account Address to check
     * @return Staked amount in tokens
     */
    function getStake(address account) external view returns (uint256) {
        return jurors[account].stake;
    }

    /**
     * @notice Get complete juror information
     * @param account Address to check
     * @return addr Juror address
     * @return stake Staked amount
     * @return registrationTime When juror registered
     */
    function getJurorInfo(address account) external view returns (
        address addr,
        uint256 stake,
        uint256 registrationTime
    ) {
        Juror memory juror = jurors[account];
        return (juror.addr, juror.stake, juror.registrationTime);
    }
}
