import React from 'react'
import { motion } from 'framer-motion'

const LoadingSpinner = ({ size = 'md', className = '' }) => {
    const sizes = {
        sm: 'w-8 h-8',
        md: 'w-16 h-16',
        lg: 'w-24 h-24',
    }

    return (
        <div className={`flex items-center justify-center ${className}`}>
            <motion.div
                className={`${sizes[size]} border-4 border-blue-500/20 border-t-blue-500 rounded-full`}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
        </div>
    )
}

export default LoadingSpinner
