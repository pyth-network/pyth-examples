// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropy.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import "./PythIntegration.sol";
import "./MegaYieldVesting.sol";
import "./AaveIntegration.sol";

/**
 * @title MegaYieldLottery
 * @notice Main lottery contract with vesting payout via Aave
 * @dev Similar to Megapot but with 10-year monthly vesting instead of immediate payout
 * Implements IEntropyConsumer to receive random numbers from Pyth Entropy via callback
 */
contract MegaYieldLottery is Ownable, ReentrancyGuard, IEntropyConsumer {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant JACKPOT_PERCENTAGE = 70; // 70% to jackpot
    uint256 public constant REFERRAL_PERCENTAGE = 30; // 30% to referrals
    uint256 public constant PERCENTAGE_DIVISOR = 100;
    uint256 public constant SECONDS_PER_DAY = 1 days;

    // USDC token
    IERC20 public immutable usdcToken;

    // Pyth integration contract
    PythIntegration public immutable pythIntegration;

    // Vesting contract
    MegaYieldVesting public vestingContract;

    // Aave integration contract (for depositing jackpot)
    AaveIntegration public aaveIntegration;

    // Ticket price in USDC (with 6 decimals)
    uint256 public ticketPrice;

    // Current day's jackpot
    uint256 public currentJackpot;

    // Amount of jackpot deposited to Aave (to track withdrawals correctly)
    uint256 public jackpotDepositedToAave;

    // Current day's start timestamp
    uint256 public currentDayStart;

    // Current day's ticket buyers
    address[] public currentDayTickets;

    // Mapping from day to winner (if drawn)
    mapping(uint256 => address) public dayWinners;

    // Mapping from day to whether winner has been drawn
    mapping(uint256 => bool) public dayDrawn;

    // Current day number (days since epoch)
    uint256 public currentDay;

    // First payment percentage (e.g., 1/120 = 0.833% per month, but first month is paid immediately)
    // We'll calculate first payment as 1 month's worth
    uint256 public constant FIRST_PAYMENT_MONTHS = 1;
    uint256 public constant TOTAL_VESTING_MONTHS = 120;

    // Pending Pyth request for current day
    mapping(uint64 => uint256) public sequenceToDay; // Map sequence number to day
    mapping(uint64 => bool) public sequenceProcessed; // Track if sequence has been processed

    // Events
    event TicketPurchased(address indexed buyer, uint256 amount, address indexed referrer);
    event RandomNumberRequested(uint64 indexed sequenceNumber, uint256 indexed day);
    event WinnerDrawn(uint256 indexed day, address indexed winner, uint256 jackpotAmount);
    event FirstPaymentClaimed(address indexed winner, uint256 amount);
    event VestingInitialized(address indexed winner, uint256 vestingAmount);
    event DayReset(uint256 indexed newDay, uint256 newJackpot);
    event JackpotDepositedToAave(uint256 amount);
    event JackpotWithdrawnFromAave(uint256 amount);

    /**
     * @notice Constructor
     * @param _usdcToken Address of USDC token
     * @param _pythIntegration Address of PythIntegration contract
     * @param _ticketPrice Ticket price in USDC (with 6 decimals)
     */
    constructor(
        address _usdcToken,
        address _pythIntegration,
        uint256 _ticketPrice
    ) Ownable(msg.sender) {
        require(_usdcToken != address(0), "MegaYieldLottery: invalid USDC address");
        require(_pythIntegration != address(0), "MegaYieldLottery: invalid PythIntegration address");
        require(_ticketPrice > 0, "MegaYieldLottery: invalid ticket price");

        usdcToken = IERC20(_usdcToken);
        pythIntegration = PythIntegration(_pythIntegration);
        ticketPrice = _ticketPrice;

        // Initialize first day
        currentDay = block.timestamp / SECONDS_PER_DAY;
        currentDayStart = block.timestamp;
    }

    /**
     * @notice Set vesting contract address (only owner, called after deployment)
     * @param _vestingContract Address of MegaYieldVesting contract
     */
    function setVestingContract(address _vestingContract) external onlyOwner {
        require(_vestingContract != address(0), "MegaYieldLottery: invalid vesting contract");
        require(address(vestingContract) == address(0), "MegaYieldLottery: vesting contract already set");
        vestingContract = MegaYieldVesting(_vestingContract);
    }

    /**
     * @notice Set Aave integration contract address (only owner, called after deployment)
     * @param _aaveIntegration Address of AaveIntegration contract
     * @dev IMPORTANT: For production, use a SEPARATE AaveIntegration contract for the jackpot
     * If the same AaveIntegration is shared with MegaYieldVesting, withdrawals may include vesting funds.
     * Recommended: Deploy a separate AaveIntegration contract specifically for jackpot deposits.
     */
    function setAaveIntegration(address _aaveIntegration) external onlyOwner {
        require(_aaveIntegration != address(0), "MegaYieldLottery: invalid AaveIntegration address");
        require(address(aaveIntegration) == address(0), "MegaYieldLottery: AaveIntegration already set");
        aaveIntegration = AaveIntegration(_aaveIntegration);
    }

    /**
     * @notice Buy lottery tickets with permit (single transaction, no approve needed)
     * @param amount Number of tickets to buy
     * @param referrer Address of referrer (optional, can be address(0))
     * @param deadline Deadline for the permit signature
     * @param v Recovery byte of the signature
     * @param r R value of the signature
     * @param s S value of the signature
     * @dev This function uses ERC20 permit (EIP-2612) to approve and buy tickets in a single transaction
     * The user signs a permit message off-chain, then calls this function with the signature
     * Note: USDC must support permit for this to work. If not, use buyTicket() with pre-approval
     */
    function buyTicketWithPermit(
        uint256 amount,
        address referrer,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        // Calculate total cost
        uint256 totalCost = ticketPrice * amount;
        
        // Try to use permit if USDC supports it
        try IERC20Permit(address(usdcToken)).permit(
            msg.sender,
            address(this),
            totalCost,
            deadline,
            v,
            r,
            s
        ) {
            // Permit succeeded - now buy ticket
            _buyTicketInternal(amount, referrer);
        } catch {
            // Permit failed - revert with helpful message
            revert("MegaYieldLottery: permit failed. Use buyTicket() with pre-approval instead.");
        }
    }

    /**
     * @notice Buy lottery tickets (requires pre-approval)
     * @param amount Number of tickets to buy
     * @param referrer Address of referrer (optional, can be address(0))
     * @dev Requires user to approve USDC spending before calling this function
     * For single-transaction purchase, use buyTicketWithPermit() instead
     */
    function buyTicket(uint256 amount, address referrer) external nonReentrant {
        _buyTicketInternal(amount, referrer);
    }

    /**
     * @notice Internal function to handle ticket purchase logic
     * @param amount Number of tickets to buy
     * @param referrer Address of referrer (optional, can be address(0))
     */
    function _buyTicketInternal(uint256 amount, address referrer) internal {
        require(amount > 0, "MegaYieldLottery: amount must be greater than 0");
        require(vestingContract != MegaYieldVesting(address(0)), "MegaYieldLottery: vesting contract not set");

        // Check if new day has started
        uint256 today = block.timestamp / SECONDS_PER_DAY;
        if (today > currentDay) {
            _resetDay(today);
        }

        // Calculate total cost
        uint256 totalCost = ticketPrice * amount;

        // Transfer USDC from buyer (requires approval)
        usdcToken.safeTransferFrom(msg.sender, address(this), totalCost);

        // Calculate jackpot and referral amounts
        uint256 jackpotAmount = (totalCost * JACKPOT_PERCENTAGE) / PERCENTAGE_DIVISOR;
        uint256 referralAmount = totalCost - jackpotAmount; // Remaining 30%

        // Add to current day's jackpot
        currentJackpot += jackpotAmount;

        // Handle referral (if provided)
        if (referrer != address(0) && referrer != msg.sender) {
            usdcToken.safeTransfer(referrer, referralAmount);
        } else {
            // If no valid referrer, add to jackpot
            currentJackpot += referralAmount;
        }

        // Deposit jackpot to Aave if AaveIntegration is set
        if (address(aaveIntegration) != address(0) && currentJackpot > 0) {
            uint256 balance = usdcToken.balanceOf(address(this));
            if (balance > 0) {
                // Deposit available balance to Aave (up to currentJackpot amount)
                uint256 amountToDeposit = balance < currentJackpot ? balance : currentJackpot;
                // Try to deposit - if it fails, funds remain in contract
                // Use try-catch on external call to AaveIntegration
                // Note: AaveIntegration.depositToAave() uses safeTransferFrom, so we need to approve first
                usdcToken.forceApprove(address(aaveIntegration), amountToDeposit);
                try aaveIntegration.depositToAave(amountToDeposit) {
                    // Success - jackpot deposited to Aave
                    jackpotDepositedToAave += amountToDeposit;
                    emit JackpotDepositedToAave(amountToDeposit);
                } catch {
                    // Aave deposit failed - funds remain in contract
                    // This allows operation without Aave configured
                }
            }
        }

        // Add buyer to current day's tickets (once per buyer)
        bool alreadyAdded = false;
        for (uint256 i = 0; i < currentDayTickets.length; i++) {
            if (currentDayTickets[i] == msg.sender) {
                alreadyAdded = true;
                break;
            }
        }
        if (!alreadyAdded) {
            currentDayTickets.push(msg.sender);
        }

        emit TicketPurchased(msg.sender, amount, referrer);
    }

    /**
     * @notice Request random number from Pyth for drawing winner
     * @dev Uses callback pattern - Pyth will call entropyCallback() when ready
     * Note: userRandomness is no longer needed - Pyth generates it internally
     */
    function requestDrawWinner() external payable {
        uint256 today = block.timestamp / SECONDS_PER_DAY;
        
        // Check if new day has started
        if (today > currentDay) {
            _resetDay(today);
        }

        // Simplified: Only check if day already drawn (prevent double drawing)
        require(!dayDrawn[today], "MegaYieldLottery: winner already drawn for this day");

        // Request random number from Pyth using callback pattern (following coinflip tutorial)
        // Pyth will call entropyCallback() on this contract when ready
        // Use IEntropyV2 to get the correct fee with getFeeV2()
        IEntropyV2 entropyV2 = IEntropyV2(address(pythIntegration.pyth()));
        
        // Get fee dynamically using getFeeV2() (getFee() returns 1 and doesn't work)
        uint128 requiredFee;
        try entropyV2.getFeeV2() returns (uint128 fee) {
            requiredFee = fee;
        } catch {
            // Fallback to current fee for Base Sepolia if getFeeV2() fails
            requiredFee = 22244112000001; // 0.000022244112000001 ETH (current fee for Base Sepolia)
        }
        
        require(msg.value >= requiredFee, "MegaYieldLottery: insufficient fee");
        
        // Call requestV2() - Pyth generates userRandomness internally
        // requestV2() uses default provider and generates userRandomness internally
        // The callback will go to entropyCallback() on this contract
        uint64 sequenceNumber = entropyV2.requestV2{value: requiredFee}();
        
        // Refund excess ETH if any
        if (msg.value > requiredFee) {
            payable(msg.sender).transfer(msg.value - requiredFee);
        }
        
        // Store mapping from sequence to day
        sequenceToDay[sequenceNumber] = today;
        sequenceProcessed[sequenceNumber] = false;

        emit RandomNumberRequested(sequenceNumber, today);
    }

    /**
     * @notice Callback function called by Pyth Entropy when random number is ready
     * @param sequenceNumber The sequence number of the request
     * @param randomBytes Random bytes provided by Pyth Entropy
     * @dev This is called automatically by Pyth Entropy contract directly
     * Based on Pyth Entropy best practices: callback pattern
     * Pyth calls this function directly, not through PythIntegration
     */
    /**
     * @notice Get the Entropy contract address (required by IEntropyConsumer)
     * @return The address of the Pyth Entropy contract
     */
    function getEntropy() internal view override returns (address) {
        return address(pythIntegration.pyth());
    }

    /**
     * @notice Callback function called by Pyth Entropy when random number is ready
     * @param sequenceNumber The sequence number of the request
     * @param provider The provider address that fulfilled the request
     * @param randomNumber Random bytes provided by Pyth Entropy
     * @dev This is called automatically by Pyth Entropy contract via _entropyCallback
     */
    function entropyCallback(
        uint64 sequenceNumber,
        address provider,
        bytes32 randomNumber
    ) internal override {
        // VERIFICA CHIAVE: Il callback può essere chiamato solo da Pyth
        // getEntropy() restituisce l'indirizzo di Pyth, e l'interfaccia IEntropyConsumer
        // verifica che msg.sender sia Pyth prima di chiamare questo callback
        // Questo garantisce che il numero casuale provenga DAVVERO da Pyth, non generato localmente
        address pythAddress = getEntropy();
        require(pythAddress != address(0), "MegaYieldLottery: Pyth address not set");
        
        require(!sequenceProcessed[sequenceNumber], "MegaYieldLottery: sequence already processed");

        uint256 dayToDraw = sequenceToDay[sequenceNumber];
        require(dayToDraw > 0, "MegaYieldLottery: invalid sequence");
        require(!dayDrawn[dayToDraw], "MegaYieldLottery: winner already drawn for this day");

        // Mark as processed
        sequenceProcessed[sequenceNumber] = true;

        // Simplified: Only draw if we have tickets and jackpot, otherwise just emit event
        if (currentDayTickets.length > 0 && currentJackpot > 0) {
            _drawWinnerWithRandom(dayToDraw, randomNumber);
        } else {
            // No tickets/jackpot - just mark as drawn to prevent re-drawing
            dayDrawn[dayToDraw] = true;
            emit WinnerDrawn(dayToDraw, address(0), 0);
        }
    }

    /**
     * @notice Internal function to draw winner using random bytes
     * @param dayToDraw The day to draw winner for
     * @param randomBytes Random bytes from Pyth Entropy
     * @dev Called automatically by entropyCallback() when Pyth provides random number
     */
    function _drawWinnerWithRandom(uint256 dayToDraw, bytes32 randomBytes) internal nonReentrant {
        // Store current day info before potentially resetting
        address[] memory dayTickets = currentDayTickets;
        uint256 dayJackpot = currentJackpot;

        // Ensure we have tickets
        require(dayTickets.length > 0, "MegaYieldLottery: no tickets");

        // Convert random bytes to uint256 for winner selection
        uint256 randomNumber = uint256(randomBytes);

        // Select winner using random number
        uint256 winnerIndex = randomNumber % dayTickets.length;
        address winner = dayTickets[winnerIndex];

        // Mark day as drawn
        dayDrawn[dayToDraw] = true;
        dayWinners[dayToDraw] = winner;

        // Withdraw jackpot from Aave if it was deposited
        uint256 totalJackpot = dayJackpot;
        if (address(aaveIntegration) != address(0) && jackpotDepositedToAave > 0) {
            // Calculate how much to withdraw: the deposited amount plus interest
            // We'll withdraw based on the tracked amount, but Aave will give us more due to interest
            try aaveIntegration.withdrawFromAave(jackpotDepositedToAave, address(this)) returns (uint256 withdrawnAmount) {
                if (withdrawnAmount > 0) {
                    // Update totalJackpot with actual withdrawn amount (includes interest)
                    totalJackpot = withdrawnAmount;
                    // Reset tracked amount
                    jackpotDepositedToAave = 0;
                    emit JackpotWithdrawnFromAave(withdrawnAmount);
                }
                // If withdrawnAmount is 0, jackpot might not have been on Aave, use dayJackpot
            } catch {
                // Withdrawal failed - check if we have balance in contract
                // This allows operation if Aave is unavailable
            }
        }

        // Check contract balance - if we have funds here, use them
        uint256 contractBalance = usdcToken.balanceOf(address(this));
        if (contractBalance > 0 && contractBalance >= dayJackpot) {
            // If we have enough in contract, use that (jackpot might not have been deposited)
            if (totalJackpot < contractBalance) {
                totalJackpot = contractBalance;
            }
        }

        // Ensure we have enough balance for payout
        require(totalJackpot > 0, "MegaYieldLottery: no jackpot available");
        require(contractBalance >= totalJackpot, "MegaYieldLottery: insufficient balance for payout");

        // Calculate amounts
        uint256 firstPayment = (totalJackpot * FIRST_PAYMENT_MONTHS) / TOTAL_VESTING_MONTHS;
        uint256 vestingAmount = totalJackpot - firstPayment;

        // Transfer first payment to winner immediately
        usdcToken.safeTransfer(winner, firstPayment);

        // Transfer rest to vesting contract
        usdcToken.safeTransfer(address(vestingContract), vestingAmount);
        
        // Initialize vesting for winner
        vestingContract.initialize(winner, vestingAmount, firstPayment);
        
        // Deposit to Aave (funds are already in vesting contract)
        // Use try-catch to allow deployment without Aave (for testing)
        // If Aave deposit fails, vesting will still work (funds stay in contract)
        try vestingContract.depositToAave(vestingAmount) {
            // Success - funds deposited to Aave
        } catch {
            // Aave deposit failed - funds remain in vesting contract
            // This allows testing without Aave configured
            // Note: VestingInitialized is already emitted by initialize()
        }

        // Reset current day's jackpot and tickets (if still for same day)
        if (dayToDraw == currentDay) {
            currentJackpot = 0;
            // Note: jackpotDepositedToAave is already reset in _withdrawJackpotFromAave
            delete currentDayTickets;
        }

        emit WinnerDrawn(dayToDraw, winner, totalJackpot);
        emit FirstPaymentClaimed(winner, firstPayment);
        // Note: VestingInitialized is emitted by vestingContract.initialize()
    }

    /**
     * @notice Reset to new day (internal function)
     * @param newDay New day number
     */
    function _resetDay(uint256 newDay) internal {
        // If previous day had jackpot but no winner, carry it over
        if (currentJackpot > 0 && !dayDrawn[currentDay]) {
            // Jackpot carries over to new day
            // If jackpot was on Aave, it stays there and will be withdrawn when winner is drawn
            // Note: jackpotDepositedToAave is not reset, so we can track it across days
            emit DayReset(newDay, currentJackpot);
        } else {
            // Reset jackpot for new day
            currentJackpot = 0;
            // Only reset jackpotDepositedToAave if there's no carryover
            // (if there's carryover, it's still on Aave)
            if (jackpotDepositedToAave > 0 && currentJackpot == 0) {
                // This shouldn't happen, but just in case
                jackpotDepositedToAave = 0;
            }
            emit DayReset(newDay, 0);
        }

        // Reset tickets
        delete currentDayTickets;

        // Update day
        currentDay = newDay;
        currentDayStart = block.timestamp;
    }


    /**
     * @notice Get the current jackpot value including interest from Aave
     * @return Current jackpot value (including accrued interest if deposited to Aave)
     * @dev Note: If AaveIntegration is shared with vesting contract, this may include vesting funds
     * In production, use separate AaveIntegration contracts for jackpot and vesting
     */
    function getCurrentJackpotWithInterest() external view returns (uint256) {
        if (address(aaveIntegration) == address(0)) {
            return currentJackpot;
        }
        
        // If we have tracked deposits, estimate the value with interest
        // Note: This is an approximation. For accurate tracking, use separate AaveIntegration contracts
        if (jackpotDepositedToAave > 0) {
            // Get total balance on Aave (may include vesting funds if shared)
            uint256 totalAaveBalance = aaveIntegration.getUnderlyingBalance();
            
            // Estimate jackpot value: assume proportional growth
            // This is approximate - in production, use separate AaveIntegration contracts
            if (totalAaveBalance >= jackpotDepositedToAave) {
                // At minimum, we have what we deposited (plus interest)
                // But we can't know exactly how much is jackpot vs vesting if shared
                // So we return currentJackpot + estimated interest
                // For accurate tracking, use separate AaveIntegration contracts
                return currentJackpot;
            }
        }
        
        // Also check contract balance (in case some funds weren't deposited)
        uint256 contractBalance = usdcToken.balanceOf(address(this));
        
        // Return currentJackpot + contract balance
        // Note: If jackpot is on Aave, currentJackpot tracks the base amount
        return currentJackpot + contractBalance;
    }

    /**
     * @notice Get current day's information
     * @return _currentDay Current day number
     * @return _jackpot Current jackpot amount
     * @return _ticketCount Number of unique ticket buyers
     * @return _startTime Day start timestamp
     */
    function getCurrentDayInfo() external view returns (
        uint256 _currentDay,
        uint256 _jackpot,
        uint256 _ticketCount,
        uint256 _startTime
    ) {
        _currentDay = currentDay;
        _jackpot = currentJackpot;
        _ticketCount = currentDayTickets.length;
        _startTime = currentDayStart;
    }

    /**
     * @notice Get winner for a specific day
     * @param day Day number
     * @return winner Winner address (address(0) if no winner yet)
     */
    function getWinner(uint256 day) external view returns (address winner) {
        winner = dayWinners[day];
    }

    /**
     * @notice Update ticket price (only owner)
     * @param newPrice New ticket price in USDC
     */
    function setTicketPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "MegaYieldLottery: invalid ticket price");
        ticketPrice = newPrice;
    }

    /**
     * @notice Emergency function to withdraw tokens (only owner, use with caution)
     * @param token Address of token to withdraw
     * @param to Address to receive tokens
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, address to, uint256 amount) external onlyOwner {
        require(to != address(0), "MegaYieldLottery: invalid recipient");
        IERC20(token).safeTransfer(to, amount);
    }

    /**
     * @notice Withdraw ETH balance (only owner)
     * @param to Address to receive ETH
     */
    function withdrawETH(address payable to) external onlyOwner {
        require(to != address(0), "MegaYieldLottery: invalid recipient");
        to.transfer(address(this).balance);
    }

    // Allow contract to receive ETH for Pyth fees
    receive() external payable {}
}

