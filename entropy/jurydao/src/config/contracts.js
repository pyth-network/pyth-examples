// src/config/contracts.js

export const CONTRACTS = {
    governanceToken: import.meta.env.VITE_GOVERNANCE_TOKEN,
    jurorRegistry: import.meta.env.VITE_JUROR_REGISTRY,
    governor: import.meta.env.VITE_GOVERNOR_SORTITION,
}

// Validation & Debug Logs
const validateContracts = () => {
    console.log('🔗 Loading Contract Addresses...')
    console.log('Environment Variables:', {
        token: import.meta.env.VITE_GOVERNANCE_TOKEN,
        registry: import.meta.env.VITE_JUROR_REGISTRY,
        governor: import.meta.env.VITE_GOVERNOR_SORTITION
    })

    const missing = []
    if (!CONTRACTS.governanceToken) missing.push('GOVERNANCE_TOKEN')
    if (!CONTRACTS.jurorRegistry) missing.push('JUROR_REGISTRY')
    if (!CONTRACTS.governor) missing.push('GOVERNOR_SORTITION')

    if (missing.length > 0) {
        console.error('❌ MISSING CONTRACT ADDRESSES:', missing)
        console.error('Solution: Run ./redeploy.sh and hard refresh (Ctrl+Shift+R)')
        return false
    }

    console.log('✅ All contract addresses loaded:', CONTRACTS)
    return true
}

const isValid = validateContracts()

export const PYTH_ENTROPY = {
    entropy: '0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c',
    provider: '0x6CC14824Ea2918f5De5C2f75A9Da968ad4BD6334'
}

export const CHAIN_CONFIG = {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org'
}

import GovernorABI from '../../out/GovernorSortition.sol/GovernorSortition.json'
import RegistryABI from '../../out/JurorRegistry.sol/JurorRegistry.json'
import TokenABI from '../../out/GovernanceToken.sol/GovernanceToken.json'

export const ABIS = {
    governor: GovernorABI.abi,
    jurorRegistry: RegistryABI.abi,
    governanceToken: TokenABI.abi
}

console.log('✅ ABIs loaded successfully')

// Check if using NEW or OLD contract
const hasConstantFees = GovernorABI.abi.some(item =>
    item.name === 'GAS_REFUND_PER_VOTE' || item.name === 'BASE_FEE'
)

const hasVariableFees = GovernorABI.abi.some(item =>
    item.name === 'gasRefundAmount' && item.type === 'function'
)

console.log('📋 Contract Type:', hasConstantFees ? 'NEW (Fixed Fees)' : hasVariableFees ? 'OLD (Variable Fees)' : 'UNKNOWN')

export const CONTRACT_TYPE = hasConstantFees ? 'NEW' : 'OLD'

export const getExplorerLink = (address, type = 'address') => {
    return `${CHAIN_CONFIG.blockExplorer}/${type}/${address}`
}

export const areContractsLoaded = () => isValid

export default {
    CONTRACTS,
    ABIS,
    PYTH_ENTROPY,
    CHAIN_CONFIG,
    CONTRACT_TYPE,
    getExplorerLink,
    areContractsLoaded
}
