export const CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890' as const // Replace with your deployed contract address

export const CONTRACT_ABI = [
  {
    type: 'constructor',
    inputs: [
      { name: '_entropy', type: 'address', internalType: 'address' }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'mintBeast',
    inputs: [
      { name: 'gasLimit', type: 'uint32', internalType: 'uint32' }
    ],
    outputs: [
      { name: '', type: 'uint256', internalType: 'uint256' }
    ],
    stateMutability: 'payable'
  },
  {
    type: 'function',
    name: 'getFee',
    inputs: [
      { name: 'gasLimit', type: 'uint32', internalType: 'uint32' }
    ],
    outputs: [
      { name: '', type: 'uint256', internalType: 'uint256' }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getBeast',
    inputs: [
      { name: 'tokenId', type: 'uint256', internalType: 'uint256' }
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct EntropyBeasts.Beast',
        components: [
          { name: 'tokenId', type: 'uint256', internalType: 'uint256' },
          { name: 'strength', type: 'uint256', internalType: 'uint256' },
          { name: 'intelligence', type: 'uint256', internalType: 'uint256' }
        ]
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'totalSupply',
    inputs: [],
    outputs: [
      { name: '', type: 'uint256', internalType: 'uint256' }
    ],
    stateMutability: 'view'
  },
  {
    type: 'event',
    name: 'BeastMinted',
    inputs: [
      { name: 'tokenId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'strength', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'intelligence', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'gasUsed', type: 'uint32', indexed: false, internalType: 'uint32' }
    ],
    anonymous: false
  }
] as const