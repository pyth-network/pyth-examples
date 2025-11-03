import React, { useState, useEffect } from 'react'
import { useContract } from '../hooks/useContract'
import { useWallet } from '../context/WalletContext'
import { DollarSign, TrendingUp, Shield, Wallet, AlertCircle } from 'lucide-react'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

const AdminPanel = () => {
    const [balance, setBalance] = useState('0')
    const [isOwner, setIsOwner] = useState(false)
    const [loading, setLoading] = useState(true)
    const [withdrawing, setWithdrawing] = useState(false)

    const { account, isConnected, connectWallet, provider, signer } = useWallet()
    const governor = useContract('governor')

    const GAS_REFUND_PER_VOTE = '0.0005'
    const BASE_FEE = '0.002'

    useEffect(() => {
        if (governor && account && provider) {
            checkOwnership()
            fetchBalance()
        }
    }, [governor, account, provider])

    const checkOwnership = async () => {
        if (!governor || !account) return

        try {
            console.log('👑 Checking ownership...')

            const contractAddress = await governor.getAddress()
            console.log('Contract address:', contractAddress)
            console.log('My account:', account)
            console.log('Provider type:', provider.constructor.name)

            // IMPORTANT: Get provider from governor (which has the right one)
            // OR create fresh provider if needed
            let activeProvider = provider

            // If provider is still JsonRpcProvider (fallback), use window.ethereum instead
            if (window.ethereum && provider.constructor.name === 'JsonRpcProvider') {
                console.log('⚠️ Using MetaMask provider instead of fallback')
                activeProvider = new ethers.BrowserProvider(window.ethereum)
            }

            console.log('Using provider:', activeProvider.constructor.name)

            // Raw call to owner()
            const result = await activeProvider.call({
                to: contractAddress,
                data: '0x8da5cb5b'
            })

            console.log('Raw owner call result:', result)

            if (result === '0x' || result === '0x0000000000000000000000000000000000000000000000000000000000000000') {
                console.error('❌ Owner function returned empty/zero')
                setIsOwner(false)
                return
            }

            const owner = ethers.AbiCoder.defaultAbiCoder().decode(['address'], result)[0]
            console.log('Contract owner:', owner)

            const isOwnerResult = owner.toLowerCase() === account.toLowerCase()
            console.log('Is owner?', isOwnerResult)

            setIsOwner(isOwnerResult)
        } catch (error) {
            console.error('❌ Error checking ownership:', error)
            setIsOwner(false)
        } finally {
            setLoading(false)
        }
    }


    const fetchBalance = async () => {
        if (!governor || !provider) return

        try {
            const contractAddress = await governor.getAddress()
            const balance = await provider.getBalance(contractAddress)
            const balanceInEth = ethers.formatEther(balance)

            console.log('💰 Contract balance:', balanceInEth, 'ETH')
            setBalance(balanceInEth)
        } catch (error) {
            console.error('❌ Error fetching balance:', error)
        }
    }

    const handleWithdraw = async () => {
        if (!governor || !signer) {
            toast.error('Contract not loaded or wallet not connected')
            return
        }

        setWithdrawing(true)

        try {
            console.log('💸 Attempting withdrawal...')

            // Connect contract with signer for transactions
            const governorWithSigner = governor.connect(signer)

            const tx = await governorWithSigner.withdrawFees({
                gasLimit: 200000
            })

            toast.loading('Withdrawing fees...', { id: 'withdraw' })
            console.log('📝 Transaction hash:', tx.hash)

            const receipt = await tx.wait()

            if (receipt.status === 1) {
                toast.success('Successfully withdrew fees!', { id: 'withdraw' })
                console.log('✅ Withdrawal successful')
                await fetchBalance()
            } else {
                toast.error('Transaction failed', { id: 'withdraw' })
            }

        } catch (error) {
            console.error('❌ Withdrawal error:', error)

            let errorMsg = 'Withdrawal failed'
            if (error.reason) {
                errorMsg = error.reason
            } else if (error.message?.includes('No fees')) {
                errorMsg = 'No withdrawable fees'
            } else if (error.message?.includes('user rejected')) {
                errorMsg = 'Transaction cancelled'
            }

            toast.error(errorMsg, { id: 'withdraw' })
        } finally {
            setWithdrawing(false)
        }
    }

    if (!isConnected) {
        return (
            <div className="min-h-screen flex items-center justify-center py-8 px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="card max-w-md w-full text-center p-8"
                >
                    <Shield size={48} className="mx-auto mb-4 text-accent-blue" />
                    <h2 className="text-2xl font-bold mb-4">Admin Panel</h2>
                    <p className="text-gray-400 mb-6">Connect your wallet to access admin functions</p>
                    <button onClick={connectWallet} className="btn btn-primary w-full">
                        Connect Wallet
                    </button>
                </motion.div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner"></div>
            </div>
        )
    }

    if (!isOwner) {
        return (
            <div className="min-h-screen flex items-center justify-center py-8 px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="card max-w-md w-full text-center p-8 bg-red-500/5 border-red-500/20"
                >
                    <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
                    <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
                    <p className="text-gray-400 mb-2">You are not the contract owner</p>
                    <p className="text-xs text-gray-500">Your address: {account}</p>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen py-8">
            <div className="container mx-auto px-4 max-w-4xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h1 className="text-4xl font-bold mb-2">Admin Panel</h1>
                    <p className="text-gray-400 mb-8">Manage contract funds</p>

                    {/* Stats */}
                    <div className="grid md:grid-cols-3 gap-6 mb-8">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="card"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-gray-400">Contract Balance</span>
                                <DollarSign className="text-green-400" size={20} />
                            </div>
                            <div className="text-3xl font-bold text-green-400">
                                {parseFloat(balance).toFixed(4)} ETH
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className="card"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-gray-400">Gas Refund/Vote</span>
                                <TrendingUp className="text-blue-400" size={20} />
                            </div>
                            <div className="text-2xl font-bold text-blue-400">
                                {GAS_REFUND_PER_VOTE} ETH
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Fixed per vote</p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="card"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-gray-400">Base Fee</span>
                                <Shield className="text-purple-400" size={20} />
                            </div>
                            <div className="text-2xl font-bold text-purple-400">
                                {BASE_FEE} ETH
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Pyth Entropy</p>
                        </motion.div>
                    </div>

                    {/* Withdraw Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="card mb-6"
                    >
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            <Wallet size={24} />
                            Withdraw Fees
                        </h2>

                        <div className="card bg-blue-500/5 border-blue-500/20 mb-6">
                            <p className="text-sm text-gray-400">
                                <strong className="text-blue-400">Info:</strong> Withdraw available ETH from the contract.
                                Reserved funds for active proposals are protected.
                            </p>
                        </div>

                        <div className="mb-4">
                            <p className="text-gray-400 mb-2">
                                Contract Balance: <strong className="text-white">{parseFloat(balance).toFixed(6)} ETH</strong>
                            </p>
                        </div>

                        <button
                            onClick={handleWithdraw}
                            disabled={withdrawing || parseFloat(balance) === 0}
                            className="btn btn-primary w-full"
                        >
                            {withdrawing ? (
                                <>
                                    <span className="spinner"></span>
                                    Withdrawing...
                                </>
                            ) : (
                                <>
                                    <DollarSign size={20} />
                                    Withdraw Fees
                                </>
                            )}
                        </button>
                    </motion.div>

                    {/* Info Card */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="card bg-yellow-500/5 border-yellow-500/20"
                    >
                        <div className="flex items-start gap-3">
                            <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={20} />
                            <div>
                                <p className="font-semibold text-yellow-500 mb-1">Simplified System</p>
                                <p className="text-sm text-gray-400">
                                    Fixed fees: <strong>0.002 ETH base + 0.0005 ETH per juror</strong>.
                                    All jurors automatically receive gas refunds when voting.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    )
}

export default AdminPanel
