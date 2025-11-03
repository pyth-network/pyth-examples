import React from 'react'
import { Inbox } from 'lucide-react'
import { motion } from 'framer-motion'

const EmptyState = ({ message = 'No items found', icon: Icon = Inbox }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
        >
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                <Icon className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-400 text-lg">{message}</p>
        </motion.div>
    )
}

export default EmptyState
