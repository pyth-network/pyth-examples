import React, { useState, useEffect } from 'react'
import { useContract } from '../hooks/useContract'
import { useWallet } from '../context/WalletContext'
import { Shield, CheckCircle, XCircle, Coins, AlertCircle } from 'lucide-react'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import StatCard from '../components/StatCard'

const JurorPage = () => {
    const [isJuror, setIsJuror] = useState(false)
    const [balance, setBalance] = useState('0')
    const [minStake, setMinStake] = useState('100')
    const [stakeAmount, setStakeAmount] = useState('100')
    const [loading, setLoading] = useState(true)
    const [registering, setRegistering] = useState(false)
    const [approving, setApproving] = useState(false)

    const { account, isConnected, connectWallet } = useWallet()
    const token = useContract('governanceToken')
    const registry = useContract('jurorRegistry')

    useEffect(() => {
        if (account && registry && token) {
            checkJurorStatus()
            fetchBalance()
            fetchMinimumStake()
        }
    }, [account, registry, token])

    const checkJurorStatus = async () => {
        if (!registry || !account) return

        try {

            const status = await registry.isJuror(account)
            setIsJuror(status)
        } catch (error) {
            // Silent error
        } finally {
            setLoading(false)
        }
    }

    const fetchBalance = async () => {
        if (!token || !account) return

        try {
            const bal = await token.balanceOf(account)
            setBalance(ethers.formatEther(bal))
        } catch (error) {
            // Silent error
        }
    }

    const fetchMinimumStake = async () => {
        if (!registry) return

        try {
            const minStakeAmount = await registry.MINIMUM_STAKE()
            const minStakeFormatted = ethers.formatEther(minStakeAmount)
            setMinStake(minStakeFormatted)
            setStakeAmount(minStakeFormatted)
        } catch (error) {
            // Use default 100 if fetch fails
        }
    }

    const handleApprove = async () => {
        if (!token || !registry) {
            toast.error('Contracts not loaded')
            return
        }

        const amount = parseFloat(stakeAmount)
        const minAmount = parseFloat(minStake)

        if (amount < minAmount) {
            toast.error(`Minimum stake is ${minStake} DGOV`)
            return
        }

        if (parseFloat(balance) < amount) {
            toast.error('Insufficient balance')
            return
        }

        setApproving(true)

        try {
            const amountWei = ethers.parseEther(stakeAmount)
            const registryAddress = await registry.getAddress()

            const tx = await token.approve(registryAddress, amountWei)
            toast.loading('Approving tokens...', { id: 'approve' })
            await tx.wait()

            toast.success('Tokens approved! Now register as juror.', { id: 'approve' })
        } catch (error) {
            const errorMsg = error.code === 'ACTION_REJECTED'
                ? 'Transaction rejected'
                : error.reason || 'Approval failed'
            toast.error(errorMsg, { id: 'approve' })
        } finally {
            setApproving(false)
        }
    }

    const handleRegister = async () => {
        if (!registry) {
            toast.error('Contract not loaded')
            return
        }

        const amount = parseFloat(stakeAmount)
        const minAmount = parseFloat(minStake)

        if (amount < minAmount) {
            toast.error(`Minimum stake is ${minStake} DGOV`)
            return
        }

        setRegistering(true)

        try {
            const amountWei = ethers.parseEther(stakeAmount)

            const tx = await registry.registerJuror(amountWei)
            toast.loading('Registering as juror...', { id: 'register' })
            await tx.wait()

            toast.success('Successfully registered as juror!', { id: 'register' })
            setIsJuror(true)
            fetchBalance()
        } catch (error) {
            let errorMsg = 'Registration failed'

            if (error.code === 'ACTION_REJECTED') {
                errorMsg = 'Transaction rejected'
            } else if (error.message?.includes('Insufficient stake')) {
                errorMsg = `Minimum stake is ${minStake} DGOV`
            } else if (error.message?.includes('Already registered')) {
                errorMsg = 'Already registered as juror'
            } else if (error.reason) {
                errorMsg = error.reason
            }

            toast.error(errorMsg, { id: 'register' })
        } finally {
            setRegistering(false)
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
                    <h2 className="text-2xl font-bold mb-4">Become a Juror</h2>
                    <p className="text-gray-400 mb-6">Connect your wallet to register as a juror</p>
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

    const hasInsufficientBalance = parseFloat(balance) < parseFloat(minStake)

    return (
        <div className="min-h-screen py-8">
            <div className="container mx-auto px-4 max-w-4xl">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 className="text-4xl font-bold mb-2">Become a Juror</h1>
                    <p className="text-gray-400 mb-8">
                        Stake tokens to participate in governance and earn rewards
                    </p>

                    {/* Insufficient Balance Warning */}
                    {!isJuror && hasInsufficientBalance && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card bg-yellow-500/5 border-yellow-500/20 mb-6"
                        >
                            <div className="flex items-start gap-3">
                                <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={20} />
                                <div>
                                    <p className="font-semibold text-yellow-500 mb-1">Insufficient Balance</p>
                                    <p className="text-sm text-gray-400">
                                        You need at least {minStake} DGOV tokens to register as a juror.
                                        Your current balance is {parseFloat(balance).toFixed(2)} DGOV.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Status Cards */}
                    <div className="grid md:grid-cols-3 gap-6 mb-8">
                        <StatCard
                            icon={isJuror ? CheckCircle : XCircle}
                            label="Juror Status"
                            value={isJuror ? 'Registered' : 'Not Registered'}
                            color={isJuror ? 'green' : 'red'}
                            index={0}
                        />
                        <StatCard
                            icon={Coins}
                            label="DGOV Balance"
                            value={parseFloat(balance).toFixed(2)}
                            color="blue"
                            index={1}
                        />
                        <StatCard
                            icon={Shield}
                            label="Minimum Stake"
                            value={`${minStake} DGOV`}
                            color="purple"
                            index={2}
                        />
                    </div>

                    {!isJuror ? (
                        <div className="card">
                            <h2 className="text-2xl font-bold mb-6">Register as Juror</h2>

                            {/* Stake Amount */}
                            <div className="mb-6">
                                <label className="block text-sm font-semibold mb-2">
                                    Stake Amount (DGOV)
                                </label>
                                <input
                                    type="number"
                                    value={stakeAmount}
                                    onChange={(e) => setStakeAmount(e.target.value)}
                                    min={minStake}
                                    step="1"
                                    className="input"
                                    placeholder={`Minimum ${minStake} DGOV`}
                                />
                                <p className="text-sm text-gray-400 mt-2">
                                    You currently have {parseFloat(balance).toFixed(2)} DGOV tokens
                                </p>
                            </div>

                            {/* Info */}
                            <div className="card bg-blue-500/5 border-blue-500/20 mb-6">
                                <h3 className="font-semibold text-blue-400 mb-2">How it works</h3>
                                <ul className="text-sm text-gray-400 space-y-1">
                                    <li>• Approve DGOV tokens for the registry contract</li>
                                    <li>• Register with your desired stake amount (min {minStake} DGOV)</li>
                                    <li>• Get randomly selected for proposal juries</li>
                                    <li>• Vote on proposals and earn gas refunds</li>
                                </ul>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={handleApprove}
                                    disabled={approving || hasInsufficientBalance}
                                    className="btn btn-secondary flex-1"
                                >
                                    {approving ? (
                                        <>
                                            <span className="spinner"></span>
                                            Approving...
                                        </>
                                    ) : (
                                        '1. Approve Tokens'
                                    )}
                                </button>
                                <button
                                    onClick={handleRegister}
                                    disabled={registering || hasInsufficientBalance}
                                    className="btn btn-primary flex-1"
                                >
                                    {registering ? (
                                        <>
                                            <span className="spinner"></span>
                                            Registering...
                                        </>
                                    ) : (
                                        '2. Register as Juror'
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="card text-center p-12 bg-gradient-to-br from-green-500/5 to-blue-500/5 border-green-500/20">
                            <CheckCircle size={64} className="mx-auto mb-4 text-green-500" />
                            <h2 className="text-3xl font-bold mb-4">You're a Juror!</h2>
                            <p className="text-gray-400 mb-8 max-w-md mx-auto">
                                You're now eligible to be randomly selected for proposal juries. Check your dashboard
                                for active proposals.
                            </p>
                            <a href="/dashboard" className="btn btn-primary">
                                View Proposals
                            </a>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    )
}

export default JurorPage
