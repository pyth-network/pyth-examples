import React from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const Modal = ({ isOpen, onClose, title, children }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-lg"
                        >
                            <div className="bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                                {/* Gradient background */}
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />

                                {/* Content */}
                                <div className="relative">
                                    {/* Header */}
                                    <div className="flex items-center justify-between p-6 border-b border-white/10">
                                        <h3 className="text-xl font-bold text-white">{title}</h3>
                                        <button
                                            onClick={onClose}
                                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                        >
                                            <X className="w-5 h-5 text-gray-400" />
                                        </button>
                                    </div>

                                    {/* Body */}
                                    <div className="p-6">{children}</div>
                                </div>

                                {/* Glow effect */}
                                <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 via-transparent to-transparent pointer-events-none" />
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    )
}

export default Modal
