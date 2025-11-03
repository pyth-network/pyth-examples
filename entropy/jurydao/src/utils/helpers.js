import { ethers } from 'ethers'
import { STATE_LABELS } from './constants'

// Format address
export const formatAddress = (address) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Format time
export const formatTime = (seconds) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
}

// Format ETH amount
export const formatEther = (value) => {
    try {
        return ethers.formatEther(value)
    } catch (error) {
        return '0'
    }
}

// Parse ETH amount
export const parseEther = (value) => {
    try {
        return ethers.parseEther(value.toString())
    } catch (error) {
        return ethers.parseEther('0')
    }
}

// Get proposal state label
export const getProposalStateLabel = (state) => {
    return STATE_LABELS[state] || 'Unknown'
}

// Get proposal state color
export const getProposalStateColor = (state) => {
    const colors = {
        0: 'text-yellow-400',
        1: 'text-blue-400',
        2: 'text-red-400',
        3: 'text-green-400',
        4: 'text-purple-400',
    }
    return colors[state] || 'text-gray-400'
}
