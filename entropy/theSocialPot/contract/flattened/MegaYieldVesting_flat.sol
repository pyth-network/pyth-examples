// Sources flattened with hardhat v2.27.0 https://hardhat.org

// SPDX-License-Identifier: MIT

// File @openzeppelin/contracts/utils/Context.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

pragma solidity ^0.8.20;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}


// File @openzeppelin/contracts/access/Ownable.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}


// File @openzeppelin/contracts/utils/introspection/IERC165.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (utils/introspection/IERC165.sol)

pragma solidity >=0.4.16;

/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}


// File @openzeppelin/contracts/interfaces/IERC165.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC165.sol)

pragma solidity >=0.4.16;


// File @openzeppelin/contracts/token/ERC20/IERC20.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC20/IERC20.sol)

pragma solidity >=0.4.16;

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}


// File @openzeppelin/contracts/interfaces/IERC20.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC20.sol)

pragma solidity >=0.4.16;


// File @openzeppelin/contracts/interfaces/IERC1363.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC1363.sol)

pragma solidity >=0.6.2;


/**
 * @title IERC1363
 * @dev Interface of the ERC-1363 standard as defined in the https://eips.ethereum.org/EIPS/eip-1363[ERC-1363].
 *
 * Defines an extension interface for ERC-20 tokens that supports executing code on a recipient contract
 * after `transfer` or `transferFrom`, or code on a spender contract after `approve`, in a single transaction.
 */
interface IERC1363 is IERC20, IERC165 {
    /*
     * Note: the ERC-165 identifier for this interface is 0xb0202a11.
     * 0xb0202a11 ===
     *   bytes4(keccak256('transferAndCall(address,uint256)')) ^
     *   bytes4(keccak256('transferAndCall(address,uint256,bytes)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256,bytes)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256,bytes)'))
     */

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @param data Additional data with no specified format, sent in call to `spender`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value, bytes calldata data) external returns (bool);
}


// File @openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.3.0) (token/ERC20/utils/SafeERC20.sol)

pragma solidity ^0.8.20;


/**
 * @title SafeERC20
 * @dev Wrappers around ERC-20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    /**
     * @dev An operation with an ERC-20 token failed.
     */
    error SafeERC20FailedOperation(address token);

    /**
     * @dev Indicates a failed `decreaseAllowance` request.
     */
    error SafeERC20FailedDecreaseAllowance(address spender, uint256 currentAllowance, uint256 requestedDecrease);

    /**
     * @dev Transfer `value` amount of `token` from the calling contract to `to`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     */
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeCall(token.transfer, (to, value)));
    }

    /**
     * @dev Transfer `value` amount of `token` from `from` to `to`, spending the approval given by `from` to the
     * calling contract. If `token` returns no value, non-reverting calls are assumed to be successful.
     */
    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeCall(token.transferFrom, (from, to, value)));
    }

    /**
     * @dev Variant of {safeTransfer} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransfer(IERC20 token, address to, uint256 value) internal returns (bool) {
        return _callOptionalReturnBool(token, abi.encodeCall(token.transfer, (to, value)));
    }

    /**
     * @dev Variant of {safeTransferFrom} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransferFrom(IERC20 token, address from, address to, uint256 value) internal returns (bool) {
        return _callOptionalReturnBool(token, abi.encodeCall(token.transferFrom, (from, to, value)));
    }

    /**
     * @dev Increase the calling contract's allowance toward `spender` by `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 oldAllowance = token.allowance(address(this), spender);
        forceApprove(token, spender, oldAllowance + value);
    }

    /**
     * @dev Decrease the calling contract's allowance toward `spender` by `requestedDecrease`. If `token` returns no
     * value, non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeDecreaseAllowance(IERC20 token, address spender, uint256 requestedDecrease) internal {
        unchecked {
            uint256 currentAllowance = token.allowance(address(this), spender);
            if (currentAllowance < requestedDecrease) {
                revert SafeERC20FailedDecreaseAllowance(spender, currentAllowance, requestedDecrease);
            }
            forceApprove(token, spender, currentAllowance - requestedDecrease);
        }
    }

    /**
     * @dev Set the calling contract's allowance toward `spender` to `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful. Meant to be used with tokens that require the approval
     * to be set to zero before setting it to a non-zero value, such as USDT.
     *
     * NOTE: If the token implements ERC-7674, this function will not modify any temporary allowance. This function
     * only sets the "standard" allowance. Any temporary allowance will remain active, in addition to the value being
     * set here.
     */
    function forceApprove(IERC20 token, address spender, uint256 value) internal {
        bytes memory approvalCall = abi.encodeCall(token.approve, (spender, value));

        if (!_callOptionalReturnBool(token, approvalCall)) {
            _callOptionalReturn(token, abi.encodeCall(token.approve, (spender, 0)));
            _callOptionalReturn(token, approvalCall);
        }
    }

    /**
     * @dev Performs an {ERC1363} transferAndCall, with a fallback to the simple {ERC20} transfer if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            safeTransfer(token, to, value);
        } else if (!token.transferAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferFromAndCall, with a fallback to the simple {ERC20} transferFrom if the target
     * has no code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferFromAndCallRelaxed(
        IERC1363 token,
        address from,
        address to,
        uint256 value,
        bytes memory data
    ) internal {
        if (to.code.length == 0) {
            safeTransferFrom(token, from, to, value);
        } else if (!token.transferFromAndCall(from, to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} approveAndCall, with a fallback to the simple {ERC20} approve if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * NOTE: When the recipient address (`to`) has no code (i.e. is an EOA), this function behaves as {forceApprove}.
     * Opposedly, when the recipient address (`to`) has code, this function only attempts to call {ERC1363-approveAndCall}
     * once without retrying, and relies on the returned value to be true.
     *
     * Reverts if the returned value is other than `true`.
     */
    function approveAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            forceApprove(token, to, value);
        } else if (!token.approveAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     *
     * This is a variant of {_callOptionalReturnBool} that reverts if call fails to meet the requirements.
     */
    function _callOptionalReturn(IERC20 token, bytes memory data) private {
        uint256 returnSize;
        uint256 returnValue;
        assembly ("memory-safe") {
            let success := call(gas(), token, 0, add(data, 0x20), mload(data), 0, 0x20)
            // bubble errors
            if iszero(success) {
                let ptr := mload(0x40)
                returndatacopy(ptr, 0, returndatasize())
                revert(ptr, returndatasize())
            }
            returnSize := returndatasize()
            returnValue := mload(0)
        }

        if (returnSize == 0 ? address(token).code.length == 0 : returnValue != 1) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     *
     * This is a variant of {_callOptionalReturn} that silently catches all reverts and returns a bool instead.
     */
    function _callOptionalReturnBool(IERC20 token, bytes memory data) private returns (bool) {
        bool success;
        uint256 returnSize;
        uint256 returnValue;
        assembly ("memory-safe") {
            success := call(gas(), token, 0, add(data, 0x20), mload(data), 0, 0x20)
            returnSize := returndatasize()
            returnValue := mload(0)
        }
        return success && (returnSize == 0 ? address(token).code.length > 0 : returnValue == 1);
    }
}


// File interfaces/IAavePool.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IAavePool
 * @notice Interface for Aave V3 Pool
 * @dev Simplified interface for Aave Pool interactions
 */
interface IAavePool {
    /**
     * @dev Supplies an `amount` of underlying asset into the reserve, receiving in return overlying aTokens.
     * - E.g. User supplies 100 USDC and gets in return 100 aUSDC
     * @param asset The address of the underlying asset to supply
     * @param amount The amount to be supplied
     * @param onBehalfOf The address that will receive the aTokens, same as msg.sender if the user
     *   wants to receive them on his own wallet, or a different address if the beneficiary of aTokens
     *   is a different wallet
     * @param referralCode Code used to register the integrator originating the operation, for potential rewards.
     *   0 if the action is executed directly by the user, without any middle-man
     */
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    /**
     * @dev Withdraws an `amount` of underlying asset from the reserve, burning the equivalent aTokens owned
     * E.g. User has 100 aUSDC, calls withdraw() and receives 100 USDC, burning the 100 aUSDC
     * @param asset The address of the underlying asset to withdraw
     * @param amount The underlying amount to be withdrawn
     *   - Send the value type(uint256).max in order to withdraw the whole aToken balance
     * @param to The address that will receive the underlying, same as msg.sender if the user
     *   wants to receive it on his own wallet, or a different address if the beneficiary is a
     *   different wallet
     * @return The final amount withdrawn
     */
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256);

    /**
     * @dev Returns the normalized income normalized income of the reserve
     * @param asset The address of the underlying asset of the reserve
     * @return The reserve's normalized income
     */
    function getReserveNormalizedIncome(address asset) external view returns (uint256);

    /**
     * @dev Returns the state and configuration of the reserve
     * @param asset The address of the underlying asset of the reserve
     * @return The state of the reserve
     */
    function getReserveData(address asset) external view returns (ReserveData memory);

    struct ReserveData {
        //stores the reserve configuration
        ReserveConfigurationMap configuration;
        //the liquidity index. Expressed in ray
        uint128 liquidityIndex;
        //the current supply rate. Expressed in ray
        uint128 currentLiquidityRate;
        //variable borrow index. Expressed in ray
        uint128 variableBorrowIndex;
        //the current variable borrow rate. Expressed in ray
        uint128 currentVariableBorrowRate;
        //the current stable borrow rate. Expressed in ray
        uint128 currentStableBorrowRate;
        //timestamp of last update
        uint40 lastUpdateTimestamp;
        //the id of the reserve. Represents the position in the list of the active reserves
        uint16 id;
        //aToken address
        address aTokenAddress;
        //stableDebtToken address
        address stableDebtTokenAddress;
        //variableDebtToken address
        address variableDebtTokenAddress;
        //address of the interest rate strategy
        address interestRateStrategyAddress;
        //the current treasury balance, scaled
        uint128 accruedToTreasury;
        //the outstanding unbacked aTokens minted through the bridging feature
        uint128 unbacked;
        //the outstanding debt borrowed against this asset in isolation mode
        uint128 isolationModeTotalDebt;
    }

    struct ReserveConfigurationMap {
        //bit 0-15: LTV
        //bit 16-31: Liq. threshold
        //bit 32-47: Liq. bonus
        //bit 48-55: Decimals
        //bit 56: reserve is active
        //bit 57: reserve is frozen
        //bit 58: borrowing is enabled
        //bit 59: stable rate borrowing enabled
        //bit 60: asset is paused
        //bit 61: borrowing in isolation mode is enabled
        //bit 62-63: reserved
        //bit 64-79: reserve factor
        //bit 80-115 borrow cap in whole tokens, borrowCap == 0 => no cap
        //bit 116-151 supply cap in whole tokens, supplyCap == 0 => no cap
        //bit 152-167 liquidation protocol fee
        //bit 168-175 eMode category
        //bit 176-211 unbacked mint cap in whole tokens, unbackedMintCap == 0 => no cap
        //bit 212-251 debt ceiling for isolation mode with (ReserveConfiguration::DEBT_CEILING_DECIMALS) decimals
        //bit 252-255 unused
        uint256 data;
    }
}


// File contracts/AaveIntegration.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.24;




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


// File @openzeppelin/contracts/utils/ReentrancyGuard.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (utils/ReentrancyGuard.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    uint256 private _status;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        if (_status == ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }

        // Any calls to nonReentrant after this point will fail
        _status = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == ENTERED;
    }
}


// File contracts/MegaYieldVesting.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.24;





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
