export const EntropyBeastsABI = [
  {
    "type": "constructor",
    "inputs": [
      { "name": "_entropy", "type": "address", "internalType": "address" }
    ],
    "stateMutability": "nonpayable"
  },
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
    "name": "beasts",
    "inputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "outputs": [
      { "name": "tokenId", "type": "uint256", "internalType": "uint256" },
      { "name": "strength", "type": "uint256", "internalType": "uint256" },
      { "name": "intelligence", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getBeast",
    "inputs": [
      { "name": "tokenId", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct EntropyBeasts.Beast",
        "components": [
          { "name": "tokenId", "type": "uint256", "internalType": "uint256" },
          {
            "name": "strength",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "intelligence",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "mintBeast",
    "inputs": [
      { "name": "gasLimit", "type": "uint32", "internalType": "uint32" },
      { "name": "isBig", "type": "bool", "internalType": "bool" }
    ],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "pendingIsBig",
    "inputs": [{ "name": "", "type": "uint64", "internalType": "uint64" }],
    "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pendingMints",
    "inputs": [{ "name": "", "type": "uint64", "internalType": "uint64" }],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "provider",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalSupply",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "BeastMintRequested",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "gasLimit",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      },
      {
        "name": "isBig",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      },
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
    "name": "BeastMinted",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "strength",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "intelligence",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "gasUsed",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      }
    ],
    "anonymous": false
  }
] as const;