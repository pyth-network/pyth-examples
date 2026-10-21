export const abi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "entropyAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_wagerAmount",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_usdcAddress",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "sequence",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "provider",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "randomNumber",
        "type": "bytes32"
      }
    ],
    "name": "_entropyCallback",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "p1hash",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "p2hash",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "serverhash",
        "type": "bytes32"
      },
      {
        "internalType": "bool",
        "name": "p1winner",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "p2winner",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "serverwinner",
        "type": "bool"
      }
    ],
    "name": "chooseWinner",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "entropy",
    "outputs": [
      {
        "internalType": "contract IEntropyV2",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "number",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "numberAsUint",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "player1Balance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "player1Ready",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "player2Balance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "player2Ready",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "requestRandomNumber",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "usdcAddress",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "wagerAmount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "wagerPlayer1",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "wagerPlayer2",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
]
