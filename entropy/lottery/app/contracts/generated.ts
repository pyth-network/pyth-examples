import {
  createUseReadContract,
  createUseWriteContract,
  createUseSimulateContract,
  createUseWatchContractEvent,
} from 'wagmi/codegen'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Lottery
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const lotteryAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: '_entropy', internalType: 'address', type: 'address' },
      { name: '_provider', internalType: 'address', type: 'address' },
      { name: '_ticketPrice', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  { type: 'error', inputs: [], name: 'AlreadyClaimed' },
  { type: 'error', inputs: [], name: 'InsufficientFee' },
  { type: 'error', inputs: [], name: 'LotteryAlreadyEnded' },
  { type: 'error', inputs: [], name: 'LotteryNotActive' },
  { type: 'error', inputs: [], name: 'LotteryNotEnded' },
  { type: 'error', inputs: [], name: 'NoTicketsSold' },
  { type: 'error', inputs: [], name: 'NotWinner' },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'OwnableInvalidOwner',
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'OwnableUnauthorizedAccount',
  },
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  { type: 'error', inputs: [], name: 'TransferFailed' },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'winningTicketId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'winner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'prizeAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'LotteryEnded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'winner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'PrizeClaimed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'ticketId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'buyer',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'sequenceNumber',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false,
      },
    ],
    name: 'TicketPurchased',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'ticketId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'sequenceNumber',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false,
      },
      {
        name: 'randomNumber',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: false,
      },
    ],
    name: 'TicketRandomNumberRevealed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'sequenceNumber',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false,
      },
      {
        name: 'targetNumber',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: false,
      },
    ],
    name: 'WinningTargetSet',
  },
  {
    type: 'function',
    inputs: [
      { name: 'sequence', internalType: 'uint64', type: 'uint64' },
      { name: 'provider', internalType: 'address', type: 'address' },
      { name: 'randomNumber', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: '_entropyCallback',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'buyTicket',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'claimPrize',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'endLottery',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'ticketId', internalType: 'uint256', type: 'uint256' }],
    name: 'getTicket',
    outputs: [
      { name: 'buyer', internalType: 'address', type: 'address' },
      { name: 'sequenceNumber', internalType: 'uint64', type: 'uint64' },
      { name: 'randomNumber', internalType: 'bytes32', type: 'bytes32' },
      { name: 'fulfilled', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getTotalCost',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'user', internalType: 'address', type: 'address' }],
    name: 'getUserTickets',
    outputs: [{ name: '', internalType: 'uint256[]', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getWinnerAddress',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'prizeClaimed',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'prizePool',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint64', type: 'uint64' }],
    name: 'sequenceToTicketId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'status',
    outputs: [
      { name: '', internalType: 'enum Lottery.LotteryStatus', type: 'uint8' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ticketCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ticketPrice',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'tickets',
    outputs: [
      { name: 'buyer', internalType: 'address', type: 'address' },
      { name: 'sequenceNumber', internalType: 'uint64', type: 'uint64' },
      { name: 'randomNumber', internalType: 'bytes32', type: 'bytes32' },
      { name: 'fulfilled', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'address', type: 'address' },
      { name: '', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'userTickets',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'winningSequenceNumber',
    outputs: [{ name: '', internalType: 'uint64', type: 'uint64' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'winningTargetNumber',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'winningTicketId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  { type: 'receive', stateMutability: 'payable' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// React
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link lotteryAbi}__
 */
export const useReadLottery = /*#__PURE__*/ createUseReadContract({
  abi: lotteryAbi,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link lotteryAbi}__ and `functionName` set to `"getTicket"`
 */
export const useReadLotteryGetTicket = /*#__PURE__*/ createUseReadContract({
  abi: lotteryAbi,
  functionName: 'getTicket',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link lotteryAbi}__ and `functionName` set to `"getTotalCost"`
 */
export const useReadLotteryGetTotalCost = /*#__PURE__*/ createUseReadContract({
  abi: lotteryAbi,
  functionName: 'getTotalCost',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link lotteryAbi}__ and `functionName` set to `"getUserTickets"`
 */
export const useReadLotteryGetUserTickets = /*#__PURE__*/ createUseReadContract(
  { abi: lotteryAbi, functionName: 'getUserTickets' },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link lotteryAbi}__ and `functionName` set to `"getWinnerAddress"`
 */
export const useReadLotteryGetWinnerAddress =
  /*#__PURE__*/ createUseReadContract({
    abi: lotteryAbi,
    functionName: 'getWinnerAddress',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link lotteryAbi}__ and `functionName` set to `"owner"`
 */
export const useReadLotteryOwner = /*#__PURE__*/ createUseReadContract({
  abi: lotteryAbi,
  functionName: 'owner',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link lotteryAbi}__ and `functionName` set to `"prizeClaimed"`
 */
export const useReadLotteryPrizeClaimed = /*#__PURE__*/ createUseReadContract({
  abi: lotteryAbi,
  functionName: 'prizeClaimed',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link lotteryAbi}__ and `functionName` set to `"prizePool"`
 */
export const useReadLotteryPrizePool = /*#__PURE__*/ createUseReadContract({
  abi: lotteryAbi,
  functionName: 'prizePool',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link lotteryAbi}__ and `functionName` set to `"sequenceToTicketId"`
 */
export const useReadLotterySequenceToTicketId =
  /*#__PURE__*/ createUseReadContract({
    abi: lotteryAbi,
    functionName: 'sequenceToTicketId',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link lotteryAbi}__ and `functionName` set to `"status"`
 */
export const useReadLotteryStatus = /*#__PURE__*/ createUseReadContract({
  abi: lotteryAbi,
  functionName: 'status',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link lotteryAbi}__ and `functionName` set to `"ticketCount"`
 */
export const useReadLotteryTicketCount = /*#__PURE__*/ createUseReadContract({
  abi: lotteryAbi,
  functionName: 'ticketCount',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link lotteryAbi}__ and `functionName` set to `"ticketPrice"`
 */
export const useReadLotteryTicketPrice = /*#__PURE__*/ createUseReadContract({
  abi: lotteryAbi,
  functionName: 'ticketPrice',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link lotteryAbi}__ and `functionName` set to `"tickets"`
 */
export const useReadLotteryTickets = /*#__PURE__*/ createUseReadContract({
  abi: lotteryAbi,
  functionName: 'tickets',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link lotteryAbi}__ and `functionName` set to `"userTickets"`
 */
export const useReadLotteryUserTickets = /*#__PURE__*/ createUseReadContract({
  abi: lotteryAbi,
  functionName: 'userTickets',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link lotteryAbi}__ and `functionName` set to `"winningSequenceNumber"`
 */
export const useReadLotteryWinningSequenceNumber =
  /*#__PURE__*/ createUseReadContract({
    abi: lotteryAbi,
    functionName: 'winningSequenceNumber',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link lotteryAbi}__ and `functionName` set to `"winningTargetNumber"`
 */
export const useReadLotteryWinningTargetNumber =
  /*#__PURE__*/ createUseReadContract({
    abi: lotteryAbi,
    functionName: 'winningTargetNumber',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link lotteryAbi}__ and `functionName` set to `"winningTicketId"`
 */
export const useReadLotteryWinningTicketId =
  /*#__PURE__*/ createUseReadContract({
    abi: lotteryAbi,
    functionName: 'winningTicketId',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link lotteryAbi}__
 */
export const useWriteLottery = /*#__PURE__*/ createUseWriteContract({
  abi: lotteryAbi,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link lotteryAbi}__ and `functionName` set to `"_entropyCallback"`
 */
export const useWriteLotteryEntropyCallback =
  /*#__PURE__*/ createUseWriteContract({
    abi: lotteryAbi,
    functionName: '_entropyCallback',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link lotteryAbi}__ and `functionName` set to `"buyTicket"`
 */
export const useWriteLotteryBuyTicket = /*#__PURE__*/ createUseWriteContract({
  abi: lotteryAbi,
  functionName: 'buyTicket',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link lotteryAbi}__ and `functionName` set to `"claimPrize"`
 */
export const useWriteLotteryClaimPrize = /*#__PURE__*/ createUseWriteContract({
  abi: lotteryAbi,
  functionName: 'claimPrize',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link lotteryAbi}__ and `functionName` set to `"endLottery"`
 */
export const useWriteLotteryEndLottery = /*#__PURE__*/ createUseWriteContract({
  abi: lotteryAbi,
  functionName: 'endLottery',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link lotteryAbi}__ and `functionName` set to `"renounceOwnership"`
 */
export const useWriteLotteryRenounceOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: lotteryAbi,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link lotteryAbi}__ and `functionName` set to `"transferOwnership"`
 */
export const useWriteLotteryTransferOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: lotteryAbi,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link lotteryAbi}__
 */
export const useSimulateLottery = /*#__PURE__*/ createUseSimulateContract({
  abi: lotteryAbi,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link lotteryAbi}__ and `functionName` set to `"_entropyCallback"`
 */
export const useSimulateLotteryEntropyCallback =
  /*#__PURE__*/ createUseSimulateContract({
    abi: lotteryAbi,
    functionName: '_entropyCallback',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link lotteryAbi}__ and `functionName` set to `"buyTicket"`
 */
export const useSimulateLotteryBuyTicket =
  /*#__PURE__*/ createUseSimulateContract({
    abi: lotteryAbi,
    functionName: 'buyTicket',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link lotteryAbi}__ and `functionName` set to `"claimPrize"`
 */
export const useSimulateLotteryClaimPrize =
  /*#__PURE__*/ createUseSimulateContract({
    abi: lotteryAbi,
    functionName: 'claimPrize',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link lotteryAbi}__ and `functionName` set to `"endLottery"`
 */
export const useSimulateLotteryEndLottery =
  /*#__PURE__*/ createUseSimulateContract({
    abi: lotteryAbi,
    functionName: 'endLottery',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link lotteryAbi}__ and `functionName` set to `"renounceOwnership"`
 */
export const useSimulateLotteryRenounceOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: lotteryAbi,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link lotteryAbi}__ and `functionName` set to `"transferOwnership"`
 */
export const useSimulateLotteryTransferOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: lotteryAbi,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link lotteryAbi}__
 */
export const useWatchLotteryEvent = /*#__PURE__*/ createUseWatchContractEvent({
  abi: lotteryAbi,
})

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link lotteryAbi}__ and `eventName` set to `"LotteryEnded"`
 */
export const useWatchLotteryLotteryEndedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: lotteryAbi,
    eventName: 'LotteryEnded',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link lotteryAbi}__ and `eventName` set to `"OwnershipTransferred"`
 */
export const useWatchLotteryOwnershipTransferredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: lotteryAbi,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link lotteryAbi}__ and `eventName` set to `"PrizeClaimed"`
 */
export const useWatchLotteryPrizeClaimedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: lotteryAbi,
    eventName: 'PrizeClaimed',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link lotteryAbi}__ and `eventName` set to `"TicketPurchased"`
 */
export const useWatchLotteryTicketPurchasedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: lotteryAbi,
    eventName: 'TicketPurchased',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link lotteryAbi}__ and `eventName` set to `"TicketRandomNumberRevealed"`
 */
export const useWatchLotteryTicketRandomNumberRevealedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: lotteryAbi,
    eventName: 'TicketRandomNumberRevealed',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link lotteryAbi}__ and `eventName` set to `"WinningTargetSet"`
 */
export const useWatchLotteryWinningTargetSetEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: lotteryAbi,
    eventName: 'WinningTargetSet',
  })
