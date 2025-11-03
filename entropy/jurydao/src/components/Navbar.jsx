import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { Wallet, Home, FileText, Users, Settings, Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const Navbar = () => {
    const location = useLocation()
    const { account, isConnected, connectWallet, disconnect, isCorrectNetwork } = useWallet()
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

    const formatAddress = (address) => {
        if (!address) return ''
        return `${address.slice(0, 6)}...${address.slice(-4)}`
    }

    const navItems = [
        { path: '/', label: 'Home', icon: Home },
        { path: '/dashboard', label: 'Proposals', icon: FileText },
        { path: '/juror', label: 'Juror', icon: Users },
        { path: '/admin', label: 'Admin', icon: Settings },
    ]

    return (
        <nav className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/50">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="relative">
                            <img
                                src="/favicon.png"
                                alt="JuryDAO Logo"
                                className="w-10 h-10 object-contain group-hover:scale-110 transition-transform duration-300"
                            />
                            {/* Glow effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent hidden sm:block">
                            JuryDAO
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const isActive = location.pathname === item.path
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`relative px-4 py-2 rounded-lg transition-all ${
                                        isActive
                                            ? 'text-blue-400 font-semibold'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon size={18} />
                                        {item.label}
                                    </div>
                                    {/* Active indicator - horizontal only */}
                                    {isActive && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                                    )}
                                </Link>
                            )
                        })}
                    </div>

                    {/* Wallet Button */}
                    <div className="flex items-center gap-3">
                        {!isConnected ? (
                            <button
                                onClick={connectWallet}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
                            >
                                <Wallet size={18} />
                                <span className="hidden sm:inline">Connect</span>
                            </button>
                        ) : (
                            <div className="relative">
                                {!isCorrectNetwork && (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                )}
                                <button
                                    onClick={disconnect}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 hover:border-gray-600 text-white rounded-lg font-mono text-sm transition-all"
                                >
                                    <Wallet size={18} />
                                    {formatAddress(account)}
                                </button>
                            </div>
                        )}

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
                        >
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="md:hidden py-4 space-y-2 border-t border-gray-800/50"
                        >
                            {navItems.map((item) => {
                                const Icon = item.icon
                                const isActive = location.pathname === item.path
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                            isActive
                                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                                : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                                        }`}
                                    >
                                        <Icon size={20} />
                                        {item.label}
                                    </Link>
                                )
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </nav>
    )
}

export default Navbar
