export const ICoinFlipAbi = [
  {
    "type": "constructor",
    "inputs": [
      { "name": "_entropy", "type": "address", "internalType": "address" },
      {
        "name": "_entropyProvider",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  { "type": "receive", "stateMutability": "payable" },
  {
    "type": "function",
    "name": "_entropyCallback",
    "inputs": [
      { "name": "sequence", "type": "uint64", "internalType": "uint64" },
      { "name": "provider", "type": "address", "internalType": "address" },
      { "name": "randomNumber", "type": "bytes32", "internalType": "bytes32" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getFlipFee",
    "inputs": [],
    "outputs": [
      { "name": "fee", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "requestFlip",
    "inputs": [
      {
        "name": "userRandomNumber",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "event",
    "name": "FlipRequest",
    "inputs": [
      {
        "name": "sequenceNumber",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "FlipResult",
    "inputs": [
      {
        "name": "sequenceNumber",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "isHeads",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  { "type": "error", "name": "InsufficientFee", "inputs": [] }
] as const;
