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


// File interfaces/IEntropyConsumer.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IEntropyConsumer
 * @notice Interface for contracts that consume Pyth Entropy random numbers
 * @dev Based on Pyth Entropy documentation
 */
interface IEntropyConsumer {
    /**
     * @notice Callback function called by Pyth Entropy when random number is ready
     * @param sequenceNumber The sequence number of the request
     * @param randomBytes Random bytes provided by Pyth Entropy
     */
    function entropyCallback(uint64 sequenceNumber, bytes32 randomBytes) external;
}


// File interfaces/IPythEntropy.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IPythEntropy
 * @notice Interface for Pyth Entropy V2
 * @dev Based on Pyth Entropy documentation - callback pattern
 */
interface IPythEntropy {
    /**
     * @notice Request a random number with callback
     * @param consumer The contract that will receive the random number via callback
     * @param provider The provider address (optional, can be address(0))
     * @param userRandomness Additional user-provided randomness (optional, can be 0)
     * @return sequenceNumber The sequence number for tracking this request
     */
    function request(
        IEntropyConsumer consumer,
        address provider,
        uint256 userRandomness
    ) external payable returns (uint64 sequenceNumber);

    /**
     * @notice Request a random number with callback (alternative method)
     * @param consumer The contract that will receive the random number via callback
     * @param provider The provider address (optional, can be address(0))
     * @param userRandomness Additional user-provided randomness (optional, can be 0)
     * @return sequenceNumber The sequence number for tracking this request
     */
    function requestV2(
        IEntropyConsumer consumer,
        address provider,
        uint256 userRandomness
    ) external payable returns (uint64 sequenceNumber);

    /**
     * @notice Get the fee required for a request
     * @return fee The fee amount in wei
     */
    function fee() external view returns (uint256);

    /**
     * @notice Check if a sequence number has been revealed
     * @param sequenceNumber The sequence number to check
     * @return true if revealed
     */
    function isRevealed(uint64 sequenceNumber) external view returns (bool);
}


// File contracts/PythIntegration.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.24;



/**
 * @title PythIntegration
 * @notice Simple wrapper for Pyth Entropy random number generation
 * @dev Based on Pyth Entropy best practices: https://docs.pyth.network/entropy/entropy-sol/best-practices
 * This contract acts as a thin wrapper - the callback goes directly to the consumer
 */
contract PythIntegration is Ownable {
    // Pyth Entropy contract
    IPythEntropy public immutable pyth;

    event RandomNumberRequested(uint64 indexed sequenceNumber, address indexed consumer);

    /**
     * @notice Constructor
     * @param _pyth Address of Pyth Entropy contract
     */
    constructor(address _pyth) Ownable(msg.sender) {
        require(_pyth != address(0), "PythIntegration: invalid Pyth address");
        pyth = IPythEntropy(_pyth);
    }

    /**
     * @notice Request a random number from Pyth Entropy
     * @param callbackHandler The contract that will receive the callback (must implement IEntropyConsumer)
     * @param userRandomness Additional user-provided randomness (optional, can be 0)
     * @return sequenceNumber The sequence number for tracking this request
     * @dev The callback will go directly to callbackHandler.entropyCallback()
     */
    function requestRandomNumber(
        IEntropyConsumer callbackHandler,
        uint256 userRandomness
    ) external payable returns (uint64 sequenceNumber) {
        uint256 requiredFee = pyth.fee();
        require(msg.value >= requiredFee, "PythIntegration: insufficient fee");

        // Request random number - Pyth will call callbackHandler.entropyCallback() directly
        sequenceNumber = pyth.requestV2{value: requiredFee}(
            callbackHandler,
            address(0), // provider (use default)
            userRandomness
        );

        // Refund excess ETH if any
        if (msg.value > requiredFee) {
            payable(msg.sender).transfer(msg.value - requiredFee);
        }

        emit RandomNumberRequested(sequenceNumber, address(callbackHandler));
    }

    /**
     * @notice Get the fee required for a request
     * @return fee The fee amount in wei
     */
    function getRequiredFee() external view returns (uint256) {
        return pyth.fee();
    }

    /**
     * @notice Withdraw contract balance (only owner)
     * @param to Address to receive funds
     */
    function withdrawBalance(address payable to) external onlyOwner {
        require(to != address(0), "PythIntegration: invalid recipient");
        to.transfer(address(this).balance);
    }
}
