import { useMemo } from 'react'
import { ethers } from 'ethers'
import { useWallet } from '../context/WalletContext'
import { CONTRACTS, ABIS } from '../config/contracts'

export const useContract = (contractName) => {
    const { signer, provider } = useWallet()

    return useMemo(() => {
        // Need either signer or provider to create contract
        if (!signer && !provider) {
            return null
        }

        const address = CONTRACTS[contractName]
        const abi = ABIS[contractName]

        // Validate configuration
        if (!address) {
            console.error(`Contract address not found for: ${contractName}`)
            console.log('Available contracts:', Object.keys(CONTRACTS))
            return null
        }

        if (!abi) {
            console.error(`ABI not found for: ${contractName}`)
            console.log('Available ABIs:', Object.keys(ABIS))
            return null
        }

        try {
            // Use signer for write operations, provider for read-only
            const signerOrProvider = signer || provider
            return new ethers.Contract(address, abi, signerOrProvider)
        } catch (error) {
            console.error(`Failed to create contract instance for ${contractName}:`, error)
            return null
        }
    }, [contractName, signer, provider])
}
