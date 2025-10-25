export const battlefieldAbi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "pythAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "entropyAddress",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "battleStart",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "creatorAddress",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint64",
        name: "creatorFid",
        type: "uint64",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "priceFeedId",
        type: "bytes32",
      },
    ],
    name: "PredictionCreated",
    type: "event",
  },
  {
    inputs: [],
    name: "RANDOM_REWARD",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "TOP_PRICE_CHANGE_REWARD",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "sequence",
        type: "uint64",
      },
      {
        internalType: "address",
        name: "provider",
        type: "address",
      },
      {
        internalType: "bytes32",
        name: "randomNumber",
        type: "bytes32",
      },
    ],
    name: "_entropyCallback",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "battleKey",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "battleToPredictions",
    outputs: [
      {
        internalType: "address",
        name: "creatorAddress",
        type: "address",
      },
      {
        internalType: "uint64",
        name: "creatorFid",
        type: "uint64",
      },
      {
        internalType: "bytes32",
        name: "priceFeedId",
        type: "bytes32",
      },
      {
        internalType: "int64",
        name: "priceStart",
        type: "int64",
      },
      {
        internalType: "int64",
        name: "priceEnd",
        type: "int64",
      },
      {
        internalType: "int64",
        name: "priceChange",
        type: "int64",
      },
      {
        internalType: "uint256",
        name: "topPriceChangeReward",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "randomReward",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "battleStart",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "battleEnd",
        type: "uint256",
      },
      {
        internalType: "uint64",
        name: "creatorFid",
        type: "uint64",
      },
      {
        internalType: "bytes32",
        name: "priceFeedId",
        type: "bytes32",
      },
    ],
    name: "createPrediction",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "entropy",
    outputs: [
      {
        internalType: "contract IEntropyV2",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "battleStart",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "battleEnd",
        type: "uint256",
      },
    ],
    name: "getBattleKey",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "battleStart",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "battleEnd",
        type: "uint256",
      },
    ],
    name: "getBattlePredictions",
    outputs: [
      {
        components: [
          {
            internalType: "address",
            name: "creatorAddress",
            type: "address",
          },
          {
            internalType: "uint64",
            name: "creatorFid",
            type: "uint64",
          },
          {
            internalType: "bytes32",
            name: "priceFeedId",
            type: "bytes32",
          },
          {
            internalType: "int64",
            name: "priceStart",
            type: "int64",
          },
          {
            internalType: "int64",
            name: "priceEnd",
            type: "int64",
          },
          {
            internalType: "int64",
            name: "priceChange",
            type: "int64",
          },
          {
            internalType: "uint256",
            name: "topPriceChangeReward",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "randomReward",
            type: "uint256",
          },
        ],
        internalType: "struct Battlefield.Prediction[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "battleStart",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "battleEnd",
        type: "uint256",
      },
      {
        internalType: "bytes[]",
        name: "priceUpdate",
        type: "bytes[]",
      },
    ],
    name: "processEndedBattle",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "battleStart",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "battleEnd",
        type: "uint256",
      },
      {
        internalType: "bytes[]",
        name: "priceUpdate",
        type: "bytes[]",
      },
    ],
    name: "processStartedBattle",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "pyth",
    outputs: [
      {
        internalType: "contract IPyth",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint64",
        name: "sequenceNumber",
        type: "uint64",
      },
    ],
    name: "sequenceToBattle",
    outputs: [
      {
        internalType: "bytes32",
        name: "battleKey",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const battlefieldAddress = "0x86916184b00b26dceaF63a2cD6c9095314f6e055";
