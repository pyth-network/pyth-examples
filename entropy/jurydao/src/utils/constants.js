// Gas costs (unchanged)
export const GAS_REFUND_PER_VOTE = '0.0005'
export const BASE_FEE = '0.01'

// Add multiplier constant
export const PYTH_FEE_MULTIPLIER = 3

// Update calculation function
export const calculateProposalCost = (jurySize) => {
    const pythFee = parseFloat(BASE_FEE) * PYTH_FEE_MULTIPLIER // 0.01 * 3 = 0.03
    const refunds = jurySize * parseFloat(GAS_REFUND_PER_VOTE)
    return (pythFee + refunds).toFixed(4) // Return string with 4 decimals
}

// Proposal costs
export const MIN_VOTING_PERIOD = 3600 // 1 hour in seconds
export const MAX_VOTING_PERIOD = 2592000 // 30 days in seconds
export const VOTING_PERIOD_OPTIONS = [
    { value: 259200, label: '3 Days' },
    { value: 432000, label: '5 Days' },
    { value: 604800, label: '7 Days' },
    { value: 1209600, label: '14 Days' }
]

// Proposal states
export const STATE_NAMES = {
    0: 'Pending',
    1: 'Active',
    2: 'Defeated',
    3: 'Succeeded',
    4: 'Executed'
}

export const STATE_COLORS = {
    0: 'text-yellow-600 bg-yellow-50',
    1: 'text-blue-600 bg-blue-50',
    2: 'text-red-600 bg-red-50',
    3: 'text-green-600 bg-green-50',
    4: 'text-purple-600 bg-purple-50'
}
