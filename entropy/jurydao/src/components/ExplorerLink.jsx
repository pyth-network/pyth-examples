import React from 'react'
import { ExternalLink } from 'lucide-react'
import { getExplorerLink } from '../utils/constants'

const ExplorerLink = ({ type, value, children, className = '', chainId }) => {
    if (!value) return null

    const link = getExplorerLink(type, value, chainId)

    return (
        <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors ${className}`}
        >
            {children}
            <ExternalLink className="w-3 h-3" />
        </a>
    )
}

export default ExplorerLink
