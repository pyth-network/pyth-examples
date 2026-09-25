export const IEntropyV2ABI = [
    {
      "type": "function",
      "name": "getDefaultProvider",
      "inputs": [],
      "outputs": [
        { "name": "provider", "type": "address", "internalType": "address" }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "getFeeV2",
      "inputs": [
        { "name": "provider", "type": "address", "internalType": "address" },
        { "name": "gasLimit", "type": "uint32", "internalType": "uint32" }
      ],
      "outputs": [
        { "name": "feeAmount", "type": "uint128", "internalType": "uint128" }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "getFeeV2",
      "inputs": [],
      "outputs": [
        { "name": "feeAmount", "type": "uint128", "internalType": "uint128" }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "getFeeV2",
      "inputs": [
        { "name": "gasLimit", "type": "uint32", "internalType": "uint32" }
      ],
      "outputs": [
        { "name": "feeAmount", "type": "uint128", "internalType": "uint128" }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "getProviderInfoV2",
      "inputs": [
        { "name": "provider", "type": "address", "internalType": "address" }
      ],
      "outputs": [
        {
          "name": "info",
          "type": "tuple",
          "internalType": "struct EntropyStructsV2.ProviderInfo",
          "components": [
            {
              "name": "feeInWei",
              "type": "uint128",
              "internalType": "uint128"
            },
            {
              "name": "accruedFeesInWei",
              "type": "uint128",
              "internalType": "uint128"
            },
            {
              "name": "originalCommitment",
              "type": "bytes32",
              "internalType": "bytes32"
            },
            {
              "name": "originalCommitmentSequenceNumber",
              "type": "uint64",
              "internalType": "uint64"
            },
            {
              "name": "commitmentMetadata",
              "type": "bytes",
              "internalType": "bytes"
            },
            { "name": "uri", "type": "bytes", "internalType": "bytes" },
            {
              "name": "endSequenceNumber",
              "type": "uint64",
              "internalType": "uint64"
            },
            {
              "name": "sequenceNumber",
              "type": "uint64",
              "internalType": "uint64"
            },
            {
              "name": "currentCommitment",
              "type": "bytes32",
              "internalType": "bytes32"
            },
            {
              "name": "currentCommitmentSequenceNumber",
              "type": "uint64",
              "internalType": "uint64"
            },
            {
              "name": "feeManager",
              "type": "address",
              "internalType": "address"
            },
            {
              "name": "maxNumHashes",
              "type": "uint32",
              "internalType": "uint32"
            },
            {
              "name": "defaultGasLimit",
              "type": "uint32",
              "internalType": "uint32"
            }
          ]
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "getRequestV2",
      "inputs": [
        { "name": "provider", "type": "address", "internalType": "address" },
        { "name": "sequenceNumber", "type": "uint64", "internalType": "uint64" }
      ],
      "outputs": [
        {
          "name": "req",
          "type": "tuple",
          "internalType": "struct EntropyStructsV2.Request",
          "components": [
            {
              "name": "provider",
              "type": "address",
              "internalType": "address"
            },
            {
              "name": "sequenceNumber",
              "type": "uint64",
              "internalType": "uint64"
            },
            { "name": "numHashes", "type": "uint32", "internalType": "uint32" },
            {
              "name": "commitment",
              "type": "bytes32",
              "internalType": "bytes32"
            },
            {
              "name": "blockNumber",
              "type": "uint64",
              "internalType": "uint64"
            },
            {
              "name": "requester",
              "type": "address",
              "internalType": "address"
            },
            { "name": "useBlockhash", "type": "bool", "internalType": "bool" },
            {
              "name": "callbackStatus",
              "type": "uint8",
              "internalType": "uint8"
            },
            {
              "name": "gasLimit10k",
              "type": "uint16",
              "internalType": "uint16"
            }
          ]
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "requestV2",
      "inputs": [
        { "name": "gasLimit", "type": "uint32", "internalType": "uint32" }
      ],
      "outputs": [
        {
          "name": "assignedSequenceNumber",
          "type": "uint64",
          "internalType": "uint64"
        }
      ],
      "stateMutability": "payable"
    },
    {
      "type": "function",
      "name": "requestV2",
      "inputs": [
        { "name": "provider", "type": "address", "internalType": "address" },
        { "name": "gasLimit", "type": "uint32", "internalType": "uint32" }
      ],
      "outputs": [
        {
          "name": "assignedSequenceNumber",
          "type": "uint64",
          "internalType": "uint64"
        }
      ],
      "stateMutability": "payable"
    },
    {
      "type": "function",
      "name": "requestV2",
      "inputs": [],
      "outputs": [
        {
          "name": "assignedSequenceNumber",
          "type": "uint64",
          "internalType": "uint64"
        }
      ],
      "stateMutability": "payable"
    },
    {
      "type": "function",
      "name": "requestV2",
      "inputs": [
        { "name": "provider", "type": "address", "internalType": "address" },
        {
          "name": "userRandomNumber",
          "type": "bytes32",
          "internalType": "bytes32"
        },
        { "name": "gasLimit", "type": "uint32", "internalType": "uint32" }
      ],
      "outputs": [
        {
          "name": "assignedSequenceNumber",
          "type": "uint64",
          "internalType": "uint64"
        }
      ],
      "stateMutability": "payable"
    },
    {
      "type": "event",
      "name": "ProviderDefaultGasLimitUpdated",
      "inputs": [
        {
          "name": "provider",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "oldDefaultGasLimit",
          "type": "uint32",
          "indexed": false,
          "internalType": "uint32"
        },
        {
          "name": "newDefaultGasLimit",
          "type": "uint32",
          "indexed": false,
          "internalType": "uint32"
        },
        {
          "name": "extraArgs",
          "type": "bytes",
          "indexed": false,
          "internalType": "bytes"
        }
      ],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "ProviderFeeManagerUpdated",
      "inputs": [
        {
          "name": "provider",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "oldFeeManager",
          "type": "address",
          "indexed": false,
          "internalType": "address"
        },
        {
          "name": "newFeeManager",
          "type": "address",
          "indexed": false,
          "internalType": "address"
        },
        {
          "name": "extraArgs",
          "type": "bytes",
          "indexed": false,
          "internalType": "bytes"
        }
      ],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "ProviderFeeUpdated",
      "inputs": [
        {
          "name": "provider",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "oldFee",
          "type": "uint128",
          "indexed": false,
          "internalType": "uint128"
        },
        {
          "name": "newFee",
          "type": "uint128",
          "indexed": false,
          "internalType": "uint128"
        },
        {
          "name": "extraArgs",
          "type": "bytes",
          "indexed": false,
          "internalType": "bytes"
        }
      ],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "ProviderMaxNumHashesAdvanced",
      "inputs": [
        {
          "name": "provider",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "oldMaxNumHashes",
          "type": "uint32",
          "indexed": false,
          "internalType": "uint32"
        },
        {
          "name": "newMaxNumHashes",
          "type": "uint32",
          "indexed": false,
          "internalType": "uint32"
        },
        {
          "name": "extraArgs",
          "type": "bytes",
          "indexed": false,
          "internalType": "bytes"
        }
      ],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "ProviderUriUpdated",
      "inputs": [
        {
          "name": "provider",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "oldUri",
          "type": "bytes",
          "indexed": false,
          "internalType": "bytes"
        },
        {
          "name": "newUri",
          "type": "bytes",
          "indexed": false,
          "internalType": "bytes"
        },
        {
          "name": "extraArgs",
          "type": "bytes",
          "indexed": false,
          "internalType": "bytes"
        }
      ],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "Registered",
      "inputs": [
        {
          "name": "provider",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "extraArgs",
          "type": "bytes",
          "indexed": false,
          "internalType": "bytes"
        }
      ],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "Requested",
      "inputs": [
        {
          "name": "provider",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "caller",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "sequenceNumber",
          "type": "uint64",
          "indexed": true,
          "internalType": "uint64"
        },
        {
          "name": "userContribution",
          "type": "bytes32",
          "indexed": false,
          "internalType": "bytes32"
        },
        {
          "name": "gasLimit",
          "type": "uint32",
          "indexed": false,
          "internalType": "uint32"
        },
        {
          "name": "extraArgs",
          "type": "bytes",
          "indexed": false,
          "internalType": "bytes"
        }
      ],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "Revealed",
      "inputs": [
        {
          "name": "provider",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "caller",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "sequenceNumber",
          "type": "uint64",
          "indexed": true,
          "internalType": "uint64"
        },
        {
          "name": "randomNumber",
          "type": "bytes32",
          "indexed": false,
          "internalType": "bytes32"
        },
        {
          "name": "userContribution",
          "type": "bytes32",
          "indexed": false,
          "internalType": "bytes32"
        },
        {
          "name": "providerContribution",
          "type": "bytes32",
          "indexed": false,
          "internalType": "bytes32"
        },
        {
          "name": "callbackFailed",
          "type": "bool",
          "indexed": false,
          "internalType": "bool"
        },
        {
          "name": "callbackReturnValue",
          "type": "bytes",
          "indexed": false,
          "internalType": "bytes"
        },
        {
          "name": "callbackGasUsed",
          "type": "uint32",
          "indexed": false,
          "internalType": "uint32"
        },
        {
          "name": "extraArgs",
          "type": "bytes",
          "indexed": false,
          "internalType": "bytes"
        }
      ],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "Withdrawal",
      "inputs": [
        {
          "name": "provider",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "recipient",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "withdrawnAmount",
          "type": "uint128",
          "indexed": false,
          "internalType": "uint128"
        },
        {
          "name": "extraArgs",
          "type": "bytes",
          "indexed": false,
          "internalType": "bytes"
        }
      ],
      "anonymous": false
    }
  ] as const;