import {
  createUseReadContract,
  createUseWriteContract,
  createUseSimulateContract,
  createUseWatchContractEvent,
} from 'wagmi/codegen'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// NFTGrowth
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const nftGrowthAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: '_entropy', internalType: 'address', type: 'address' },
      { name: '_provider', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  { type: 'error', inputs: [], name: 'ApprovalCallerNotOwnerNorApproved' },
  { type: 'error', inputs: [], name: 'ApprovalQueryForNonexistentToken' },
  { type: 'error', inputs: [], name: 'BalanceQueryForZeroAddress' },
  { type: 'error', inputs: [], name: 'MintERC2309QuantityExceedsLimit' },
  { type: 'error', inputs: [], name: 'MintToZeroAddress' },
  { type: 'error', inputs: [], name: 'MintZeroQuantity' },
  { type: 'error', inputs: [], name: 'NotCompatibleWithSpotMints' },
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
  { type: 'error', inputs: [], name: 'OwnerQueryForNonexistentToken' },
  { type: 'error', inputs: [], name: 'OwnershipNotInitializedForExtraData' },
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  { type: 'error', inputs: [], name: 'SequentialMintExceedsLimit' },
  { type: 'error', inputs: [], name: 'SequentialUpToTooSmall' },
  { type: 'error', inputs: [], name: 'SpotMintTokenIdTooSmall' },
  { type: 'error', inputs: [], name: 'TokenAlreadyExists' },
  { type: 'error', inputs: [], name: 'TransferCallerNotOwnerNorApproved' },
  { type: 'error', inputs: [], name: 'TransferFromIncorrectOwner' },
  { type: 'error', inputs: [], name: 'TransferToNonERC721ReceiverImplementer' },
  { type: 'error', inputs: [], name: 'TransferToZeroAddress' },
  { type: 'error', inputs: [], name: 'URIQueryForNonexistentToken' },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'approved',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'Approval',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'operator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: 'approved', internalType: 'bool', type: 'bool', indexed: false },
    ],
    name: 'ApprovalForAll',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'fromTokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'toTokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'from', internalType: 'address', type: 'address', indexed: true },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
    ],
    name: 'ConsecutiveTransfer',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'sender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'tokenId',
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
        name: 'nftInfo',
        internalType: 'struct NFTInfo',
        type: 'tuple',
        components: [
          { name: 'level', internalType: 'uint256', type: 'uint256' },
          { name: 'status', internalType: 'enum NFTStatus', type: 'uint8' },
        ],
        indexed: false,
      },
      {
        name: 'result',
        internalType: 'enum Result',
        type: 'uint8',
        indexed: false,
      },
    ],
    name: 'NFTResult',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'sender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'tokenId',
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
    ],
    name: 'NftGrowthRequested',
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
      { name: 'from', internalType: 'address', type: 'address', indexed: true },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'Transfer',
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
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'getApproved',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getGrowFee',
    outputs: [{ name: 'fee', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'userRandomNumber', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'grow',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'operator', internalType: 'address', type: 'address' },
    ],
    name: 'isApprovedForAll',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'name',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'nftInfo',
    outputs: [
      { name: 'level', internalType: 'uint256', type: 'uint256' },
      { name: 'status', internalType: 'enum NFTStatus', type: 'uint8' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'nftLock',
    outputs: [
      { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
      { name: 'status', internalType: 'enum LockStatus', type: 'uint8' },
    ],
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
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'ownerUnlockFlower',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint64', type: 'uint64' }],
    name: 'pendingRandomRequests',
    outputs: [
      { name: 'sender', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
    ],
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
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: '_data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'operator', internalType: 'address', type: 'address' },
      { name: 'approved', internalType: 'bool', type: 'bool' },
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'tokensOfOwner',
    outputs: [{ name: '', internalType: 'uint256[]', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: 'result', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [],
    stateMutability: 'payable',
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
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'unlockFlower',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'to', internalType: 'address', type: 'address' }],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// React
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftGrowthAbi}__
 */
export const useReadNftGrowth = /*#__PURE__*/ createUseReadContract({
  abi: nftGrowthAbi,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"balanceOf"`
 */
export const useReadNftGrowthBalanceOf = /*#__PURE__*/ createUseReadContract({
  abi: nftGrowthAbi,
  functionName: 'balanceOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"getApproved"`
 */
export const useReadNftGrowthGetApproved = /*#__PURE__*/ createUseReadContract({
  abi: nftGrowthAbi,
  functionName: 'getApproved',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"getGrowFee"`
 */
export const useReadNftGrowthGetGrowFee = /*#__PURE__*/ createUseReadContract({
  abi: nftGrowthAbi,
  functionName: 'getGrowFee',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"isApprovedForAll"`
 */
export const useReadNftGrowthIsApprovedForAll =
  /*#__PURE__*/ createUseReadContract({
    abi: nftGrowthAbi,
    functionName: 'isApprovedForAll',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"name"`
 */
export const useReadNftGrowthName = /*#__PURE__*/ createUseReadContract({
  abi: nftGrowthAbi,
  functionName: 'name',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"nftInfo"`
 */
export const useReadNftGrowthNftInfo = /*#__PURE__*/ createUseReadContract({
  abi: nftGrowthAbi,
  functionName: 'nftInfo',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"nftLock"`
 */
export const useReadNftGrowthNftLock = /*#__PURE__*/ createUseReadContract({
  abi: nftGrowthAbi,
  functionName: 'nftLock',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"owner"`
 */
export const useReadNftGrowthOwner = /*#__PURE__*/ createUseReadContract({
  abi: nftGrowthAbi,
  functionName: 'owner',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"ownerOf"`
 */
export const useReadNftGrowthOwnerOf = /*#__PURE__*/ createUseReadContract({
  abi: nftGrowthAbi,
  functionName: 'ownerOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"pendingRandomRequests"`
 */
export const useReadNftGrowthPendingRandomRequests =
  /*#__PURE__*/ createUseReadContract({
    abi: nftGrowthAbi,
    functionName: 'pendingRandomRequests',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"supportsInterface"`
 */
export const useReadNftGrowthSupportsInterface =
  /*#__PURE__*/ createUseReadContract({
    abi: nftGrowthAbi,
    functionName: 'supportsInterface',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"symbol"`
 */
export const useReadNftGrowthSymbol = /*#__PURE__*/ createUseReadContract({
  abi: nftGrowthAbi,
  functionName: 'symbol',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"tokenURI"`
 */
export const useReadNftGrowthTokenUri = /*#__PURE__*/ createUseReadContract({
  abi: nftGrowthAbi,
  functionName: 'tokenURI',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"tokensOfOwner"`
 */
export const useReadNftGrowthTokensOfOwner =
  /*#__PURE__*/ createUseReadContract({
    abi: nftGrowthAbi,
    functionName: 'tokensOfOwner',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"totalSupply"`
 */
export const useReadNftGrowthTotalSupply = /*#__PURE__*/ createUseReadContract({
  abi: nftGrowthAbi,
  functionName: 'totalSupply',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftGrowthAbi}__
 */
export const useWriteNftGrowth = /*#__PURE__*/ createUseWriteContract({
  abi: nftGrowthAbi,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"_entropyCallback"`
 */
export const useWriteNftGrowthEntropyCallback =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftGrowthAbi,
    functionName: '_entropyCallback',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"approve"`
 */
export const useWriteNftGrowthApprove = /*#__PURE__*/ createUseWriteContract({
  abi: nftGrowthAbi,
  functionName: 'approve',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"grow"`
 */
export const useWriteNftGrowthGrow = /*#__PURE__*/ createUseWriteContract({
  abi: nftGrowthAbi,
  functionName: 'grow',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"mint"`
 */
export const useWriteNftGrowthMint = /*#__PURE__*/ createUseWriteContract({
  abi: nftGrowthAbi,
  functionName: 'mint',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"ownerUnlockFlower"`
 */
export const useWriteNftGrowthOwnerUnlockFlower =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftGrowthAbi,
    functionName: 'ownerUnlockFlower',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"renounceOwnership"`
 */
export const useWriteNftGrowthRenounceOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftGrowthAbi,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"safeTransferFrom"`
 */
export const useWriteNftGrowthSafeTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftGrowthAbi,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"setApprovalForAll"`
 */
export const useWriteNftGrowthSetApprovalForAll =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftGrowthAbi,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"transferFrom"`
 */
export const useWriteNftGrowthTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftGrowthAbi,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"transferOwnership"`
 */
export const useWriteNftGrowthTransferOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftGrowthAbi,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"unlockFlower"`
 */
export const useWriteNftGrowthUnlockFlower =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftGrowthAbi,
    functionName: 'unlockFlower',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"withdraw"`
 */
export const useWriteNftGrowthWithdraw = /*#__PURE__*/ createUseWriteContract({
  abi: nftGrowthAbi,
  functionName: 'withdraw',
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftGrowthAbi}__
 */
export const useSimulateNftGrowth = /*#__PURE__*/ createUseSimulateContract({
  abi: nftGrowthAbi,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"_entropyCallback"`
 */
export const useSimulateNftGrowthEntropyCallback =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftGrowthAbi,
    functionName: '_entropyCallback',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"approve"`
 */
export const useSimulateNftGrowthApprove =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftGrowthAbi,
    functionName: 'approve',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"grow"`
 */
export const useSimulateNftGrowthGrow = /*#__PURE__*/ createUseSimulateContract(
  { abi: nftGrowthAbi, functionName: 'grow' },
)

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"mint"`
 */
export const useSimulateNftGrowthMint = /*#__PURE__*/ createUseSimulateContract(
  { abi: nftGrowthAbi, functionName: 'mint' },
)

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"ownerUnlockFlower"`
 */
export const useSimulateNftGrowthOwnerUnlockFlower =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftGrowthAbi,
    functionName: 'ownerUnlockFlower',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"renounceOwnership"`
 */
export const useSimulateNftGrowthRenounceOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftGrowthAbi,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"safeTransferFrom"`
 */
export const useSimulateNftGrowthSafeTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftGrowthAbi,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"setApprovalForAll"`
 */
export const useSimulateNftGrowthSetApprovalForAll =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftGrowthAbi,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"transferFrom"`
 */
export const useSimulateNftGrowthTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftGrowthAbi,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"transferOwnership"`
 */
export const useSimulateNftGrowthTransferOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftGrowthAbi,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"unlockFlower"`
 */
export const useSimulateNftGrowthUnlockFlower =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftGrowthAbi,
    functionName: 'unlockFlower',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftGrowthAbi}__ and `functionName` set to `"withdraw"`
 */
export const useSimulateNftGrowthWithdraw =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftGrowthAbi,
    functionName: 'withdraw',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nftGrowthAbi}__
 */
export const useWatchNftGrowthEvent = /*#__PURE__*/ createUseWatchContractEvent(
  { abi: nftGrowthAbi },
)

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nftGrowthAbi}__ and `eventName` set to `"Approval"`
 */
export const useWatchNftGrowthApprovalEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nftGrowthAbi,
    eventName: 'Approval',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nftGrowthAbi}__ and `eventName` set to `"ApprovalForAll"`
 */
export const useWatchNftGrowthApprovalForAllEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nftGrowthAbi,
    eventName: 'ApprovalForAll',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nftGrowthAbi}__ and `eventName` set to `"ConsecutiveTransfer"`
 */
export const useWatchNftGrowthConsecutiveTransferEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nftGrowthAbi,
    eventName: 'ConsecutiveTransfer',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nftGrowthAbi}__ and `eventName` set to `"NFTResult"`
 */
export const useWatchNftGrowthNftResultEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nftGrowthAbi,
    eventName: 'NFTResult',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nftGrowthAbi}__ and `eventName` set to `"NftGrowthRequested"`
 */
export const useWatchNftGrowthNftGrowthRequestedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nftGrowthAbi,
    eventName: 'NftGrowthRequested',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nftGrowthAbi}__ and `eventName` set to `"OwnershipTransferred"`
 */
export const useWatchNftGrowthOwnershipTransferredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nftGrowthAbi,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nftGrowthAbi}__ and `eventName` set to `"Transfer"`
 */
export const useWatchNftGrowthTransferEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nftGrowthAbi,
    eventName: 'Transfer',
  })
