import React from 'react'
import { motion } from 'framer-motion'

const StatCard = ({ icon: Icon, label, value, color = 'blue', index = 0 }) => {
    const colorClasses = {
        blue: 'from-blue-500 to-blue-600 text-blue-400',
        green: 'from-green-500 to-green-600 text-green-400',
        purple: 'from-purple-500 to-purple-600 text-purple-400',
        red: 'from-red-500 to-red-600 text-red-400',
        orange: 'from-orange-500 to-orange-600 text-orange-400',
        pink: 'from-pink-500 to-pink-600 text-pink-400',
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 overflow-hidden group hover:bg-white/10 transition-all"
        >
            {/* Background gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color]} opacity-0 group-hover:opacity-10 transition-opacity`} />

            <div className="relative">
                <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${colorClasses[color]} bg-opacity-10 mb-4`}>
                    <Icon className={`w-6 h-6 ${colorClasses[color]}`} />
                </div>
                <div className="text-gray-400 text-sm mb-1">{label}</div>
                <div className="text-2xl font-bold text-white">{value}</div>
            </div>

            {/* Shine effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
            </div>
        </motion.div>
    )
}

export default StatCard
