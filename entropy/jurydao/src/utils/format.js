export const formatProposalState = (state) => {
    const stateNum = Number(state)
    const states = {
        0: 'Pending',
        1: 'Active',
        2: 'Defeated',
        3: 'Succeeded',
        4: 'Executed'
    }
    return states[stateNum] || 'Unknown'
}

export const formatTimeLeft = (deadline) => {
    const now = Math.floor(Date.now() / 1000)
    const timeLeft = Number(deadline) - now

    if (timeLeft <= 0) return 'Expired'

    const days = Math.floor(timeLeft / 86400)
    const hours = Math.floor((timeLeft % 86400) / 3600)
    const minutes = Math.floor((timeLeft % 3600) / 60)

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
}

export const formatDate = (timestamp) => {
    const date = new Date(Number(timestamp) * 1000)
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    })
}

export const formatAddress = (address) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export const formatBalance = (balance) => {
    const num = parseFloat(balance)
    if (num === 0) return '0'
    if (num < 0.01) return '< 0.01'
    return num.toFixed(2)
}
