// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IAavePool.sol";

/**
 * @title AaveIntegration
 * @notice Helper contract for Aave V3 lending pool integration
 * @dev Wraps Aave Pool interactions for USDC deposits and withdrawals
 */
contract AaveIntegration is Ownable {
    using SafeERC20 for IERC20;

    // Aave Pool contract
    IAavePool public immutable aavePool;

    // USDC token address
    address public immutable usdcToken;

    // Referral code for Aave (0 = no referral)
    uint16 public constant REFERRAL_CODE = 0;

    event DepositedToAave(address indexed user, uint256 amount);
    event WithdrawnFromAave(address indexed to, uint256 amount);

    /**
     * @notice Constructor
     * @param _aavePool Address of Aave Pool contract
     * @param _usdcToken Address of USDC token
     */
    constructor(address _aavePool, address _usdcToken) Ownable(msg.sender) {
        require(_aavePool != address(0), "AaveIntegration: invalid pool address");
        require(_usdcToken != address(0), "AaveIntegration: invalid USDC address");
        aavePool = IAavePool(_aavePool);
        usdcToken = _usdcToken;
    }

    /**
     * @notice Deposit USDC to Aave lending pool
     * @param amount Amount of USDC to deposit
     */
    function depositToAave(uint256 amount) external {
        require(amount > 0, "AaveIntegration: amount must be greater than 0");

        IERC20 token = IERC20(usdcToken);

        // Transfer USDC from caller to this contract
        token.safeTransferFrom(msg.sender, address(this), amount);

        // Approve Aave Pool to spend USDC (forceApprove in OpenZeppelin 5.x replaces safeApprove)
        token.forceApprove(address(aavePool), amount);

        // Supply to Aave Pool (receives aUSDC in return)
        aavePool.supply(usdcToken, amount, address(this), REFERRAL_CODE);

        emit DepositedToAave(msg.sender, amount);
    }

    /**
     * @notice Withdraw USDC from Aave lending pool
     * @param amount Amount of USDC to withdraw (use type(uint256).max to withdraw all)
     * @param to Address to receive the withdrawn USDC
     * @return withdrawnAmount Actual amount withdrawn
     */
    function withdrawFromAave(uint256 amount, address to) external returns (uint256 withdrawnAmount) {
        require(to != address(0), "AaveIntegration: invalid recipient");
        require(amount > 0, "AaveIntegration: amount must be greater than 0");

        // Withdraw from Aave Pool
        withdrawnAmount = aavePool.withdraw(usdcToken, amount, to);

        emit WithdrawnFromAave(to, withdrawnAmount);
    }

    /**
     * @notice Get the current balance of aUSDC for this contract
     * @return Balance of aUSDC tokens
     */
    function getAaveBalance() external view returns (uint256) {
        IAavePool.ReserveData memory reserveData = aavePool.getReserveData(usdcToken);
        address aTokenAddress = reserveData.aTokenAddress;
        if (aTokenAddress == address(0)) {
            return 0;
        }
        return IERC20(aTokenAddress).balanceOf(address(this));
    }

    /**
     * @notice Get the underlying USDC value of aUSDC balance
     * @return Value in USDC terms
     */
    function getUnderlyingBalance() external view returns (uint256) {
        IAavePool.ReserveData memory reserveData = aavePool.getReserveData(usdcToken);
        address aTokenAddress = reserveData.aTokenAddress;
        if (aTokenAddress == address(0)) {
            return 0;
        }

        uint256 aTokenBalance = IERC20(aTokenAddress).balanceOf(address(this));
        if (aTokenBalance == 0) {
            return 0;
        }

        // Get normalized income (accounts for interest)
        uint256 normalizedIncome = aavePool.getReserveNormalizedIncome(usdcToken);
        
        // Calculate underlying value: aTokenBalance * normalizedIncome / 1e27
        // Normalized income is in ray (1e27)
        return (aTokenBalance * normalizedIncome) / 1e27;
    }

    /**
     * @notice Emergency function to withdraw tokens (only owner)
     * @param token Address of token to withdraw
     * @param to Address to receive tokens
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, address to, uint256 amount) external onlyOwner {
        require(to != address(0), "AaveIntegration: invalid recipient");
        IERC20(token).safeTransfer(to, amount);
    }
}

