// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./AaveIntegration.sol";

/**
 * @title MegaYieldVesting
 * @notice Contract for managing 10-year monthly vesting via Aave lending
 * @dev Handles monthly payments to winner over 120 months after first payment
 */
contract MegaYieldVesting is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant MONTHLY_PAYMENTS = 120; // 10 years * 12 months
    uint256 public constant SECONDS_PER_MONTH = 30 days;

    // Aave integration contract
    AaveIntegration public immutable aaveIntegration;

    // USDC token
    IERC20 public immutable usdcToken;

    // Lottery contract (authorized to initialize and deposit)
    address public lotteryContract;

    // Winner address
    address public winner;

    // Total jackpot amount (after first payment)
    uint256 public totalVestingAmount;

    // Amount per monthly payment
    uint256 public monthlyPaymentAmount;

    // Number of payments already made (0 means no payments yet)
    uint256 public paymentsMade;

    // Timestamp of last payment
    uint256 public lastPaymentTimestamp;

    // Whether vesting has been initialized
    bool public initialized;

    // Whether all funds have been deposited to Aave
    bool public depositedToAave;

    event VestingInitialized(address indexed winner, uint256 totalAmount, uint256 monthlyAmount);
    event DepositedToAave(uint256 amount);
    event MonthlyPaymentClaimed(address indexed winner, uint256 amount, uint256 paymentNumber);
    event VestingCompleted(address indexed winner);

    /**
     * @notice Constructor
     * @param _aaveIntegration Address of AaveIntegration contract
     * @param _usdcToken Address of USDC token
     */
    constructor(address _aaveIntegration, address _usdcToken) Ownable(msg.sender) {
        require(_aaveIntegration != address(0), "MegaYieldVesting: invalid AaveIntegration address");
        require(_usdcToken != address(0), "MegaYieldVesting: invalid USDC address");
        aaveIntegration = AaveIntegration(_aaveIntegration);
        usdcToken = IERC20(_usdcToken);
    }

    /**
     * @notice Set lottery contract address (only owner, called after deployment)
     * @param _lotteryContract Address of lottery contract
     */
    function setLotteryContract(address _lotteryContract) external onlyOwner {
        require(_lotteryContract != address(0), "MegaYieldVesting: invalid lottery contract");
        require(lotteryContract == address(0), "MegaYieldVesting: lottery contract already set");
        lotteryContract = _lotteryContract;
    }

    /**
     * @notice Initialize vesting for a winner
     * @param _winner Address of the winner
     * @param _totalAmount Total amount to vest (after first payment)
     * @param _firstPaymentAmount Amount of first payment (paid immediately by lottery contract)
     */
    function initialize(
        address _winner,
        uint256 _totalAmount,
        uint256 _firstPaymentAmount
    ) external {
        require(msg.sender == lotteryContract, "MegaYieldVesting: not lottery contract");
        require(!initialized, "MegaYieldVesting: already initialized");
        require(_winner != address(0), "MegaYieldVesting: invalid winner");
        require(_totalAmount > 0, "MegaYieldVesting: total amount must be greater than 0");

        winner = _winner;
        totalVestingAmount = _totalAmount;
        
        // Calculate monthly payment amount
        monthlyPaymentAmount = _totalAmount / MONTHLY_PAYMENTS;
        
        // Ensure we have enough for all payments (handle remainder)
        require(monthlyPaymentAmount * MONTHLY_PAYMENTS <= _totalAmount, "MegaYieldVesting: calculation error");

        initialized = true;
        lastPaymentTimestamp = block.timestamp;

        emit VestingInitialized(_winner, _totalAmount, monthlyPaymentAmount);
    }

    /**
     * @notice Deposit remaining funds to Aave (called by lottery contract after initialization)
     * @param amount Amount to deposit to Aave
     */
    function depositToAave(uint256 amount) external {
        require(msg.sender == lotteryContract, "MegaYieldVesting: not lottery contract");
        require(initialized, "MegaYieldVesting: not initialized");
        require(!depositedToAave, "MegaYieldVesting: already deposited");
        require(amount > 0, "MegaYieldVesting: amount must be greater than 0");
        require(amount <= totalVestingAmount, "MegaYieldVesting: amount exceeds total vesting");

        // Check that we have the funds in this contract
        uint256 balance = usdcToken.balanceOf(address(this));
        require(balance >= amount, "MegaYieldVesting: insufficient balance");

        // Approve AaveIntegration to spend USDC (forceApprove in OpenZeppelin 5.x)
        usdcToken.forceApprove(address(aaveIntegration), amount);

        // Deposit to Aave via AaveIntegration
        aaveIntegration.depositToAave(amount);

        depositedToAave = true;

        emit DepositedToAave(amount);
    }

    /**
     * @notice Claim monthly payment (can be called by winner)
     */
    function claimMonthlyPayment() external nonReentrant {
        require(initialized, "MegaYieldVesting: not initialized");
        require(msg.sender == winner, "MegaYieldVesting: not winner");
        require(paymentsMade < MONTHLY_PAYMENTS, "MegaYieldVesting: all payments completed");
        require(depositedToAave, "MegaYieldVesting: funds not deposited to Aave");

        // Check if enough time has passed (30 days since last payment)
        uint256 timeSinceLastPayment = block.timestamp - lastPaymentTimestamp;
        require(timeSinceLastPayment >= SECONDS_PER_MONTH, "MegaYieldVesting: too soon for next payment");

        // Calculate payment amount (may include remainder on last payment)
        uint256 paymentAmount = monthlyPaymentAmount;
        if (paymentsMade == MONTHLY_PAYMENTS - 1) {
            // Last payment: send all remaining balance
            paymentAmount = totalVestingAmount - (monthlyPaymentAmount * (MONTHLY_PAYMENTS - 1));
        }

        // Withdraw from Aave
        uint256 withdrawnAmount = aaveIntegration.withdrawFromAave(paymentAmount, address(this));

        // Transfer to winner
        usdcToken.safeTransfer(winner, withdrawnAmount);

        // Update state
        paymentsMade++;
        lastPaymentTimestamp = block.timestamp;

        emit MonthlyPaymentClaimed(winner, withdrawnAmount, paymentsMade);

        // Check if all payments are complete
        if (paymentsMade >= MONTHLY_PAYMENTS) {
            emit VestingCompleted(winner);
        }
    }

    /**
     * @notice Get the current balance available on Aave (including accrued interest)
     * @return Balance in USDC terms
     */
    function getAaveBalance() external view returns (uint256) {
        if (!depositedToAave) {
            return 0;
        }
        return aaveIntegration.getUnderlyingBalance();
    }

    /**
     * @notice Get vesting information for the winner
     * @return _winner Winner address
     * @return _totalAmount Total vesting amount
     * @return _monthlyAmount Monthly payment amount
     * @return _paymentsMade Number of payments made
     * @return _paymentsRemaining Number of payments remaining
     * @return _nextPaymentTime Timestamp when next payment can be claimed
     */
    function getVestingInfo() external view returns (
        address _winner,
        uint256 _totalAmount,
        uint256 _monthlyAmount,
        uint256 _paymentsMade,
        uint256 _paymentsRemaining,
        uint256 _nextPaymentTime
    ) {
        _winner = winner;
        _totalAmount = totalVestingAmount;
        _monthlyAmount = monthlyPaymentAmount;
        _paymentsMade = paymentsMade;
        _paymentsRemaining = MONTHLY_PAYMENTS - paymentsMade;
        _nextPaymentTime = lastPaymentTimestamp + SECONDS_PER_MONTH;
    }

    /**
     * @notice Check if next payment can be claimed
     * @return true if payment can be claimed
     */
    function canClaimNextPayment() external view returns (bool) {
        if (!initialized || !depositedToAave || paymentsMade >= MONTHLY_PAYMENTS) {
            return false;
        }
        uint256 timeSinceLastPayment = block.timestamp - lastPaymentTimestamp;
        return timeSinceLastPayment >= SECONDS_PER_MONTH;
    }

    /**
     * @notice Emergency function to withdraw tokens (only owner, use with caution)
     * @param token Address of token to withdraw
     * @param to Address to receive tokens
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, address to, uint256 amount) external onlyOwner {
        require(to != address(0), "MegaYieldVesting: invalid recipient");
        IERC20(token).safeTransfer(to, amount);
    }

    /**
     * @notice Get lottery contract address
     * @return Address of lottery contract
     */
    function getLotteryContract() external view returns (address) {
        return lotteryContract;
    }
}

