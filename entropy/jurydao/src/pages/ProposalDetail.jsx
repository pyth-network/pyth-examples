import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useContract } from '../hooks/useContract'
import { useWallet } from '../context/WalletContext'
import { ArrowLeft, ThumbsUp, ThumbsDown, Users, Clock, User, CheckCircle, AlertCircle, Activity, Zap } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import Modal from '../components/Modal'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

const ProposalDetail = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { account } = useWallet()

    const [proposal, setProposal] = useState(null)
    const [jurors, setJurors] = useState([])
    const [voteProgress, setVoteProgress] = useState({ votesCast: 0, total: 0 })
    const [loading, setLoading] = useState(true)
    const [voting, setVoting] = useState(false)
    const [executing, setExecuting] = useState(false)
    const [isSelectedJuror, setIsSelectedJuror] = useState(false)
    const [hasVoted, setHasVoted] = useState(false)
    const [showVoteModal, setShowVoteModal] = useState(false)
    const [voteChoice, setVoteChoice] = useState(null)

    const governor = useContract('governor')

    useEffect(() => {
        fetchProposal()
        const interval = setInterval(fetchProposal, 5000)
        return () => clearInterval(interval)
    }, [id, governor, account])

    const fetchProposal = async () => {
        if (!governor || !id) return

        try {
            const data = await governor.getProposal(id)

            // Contract returns: [title, description, proposer, forVotes, againstVotes, deadline, state, jurySize]
            const proposalData = {
                id,
                title: data[0],
                description: data[1],
                proposer: data[2],
                forVotes: Number(data[3]),
                againstVotes: Number(data[4]),
                deadline: Number(data[5]),
                state: Number(data[6]),
                jurySize: Number(data[7]),
            }

            setProposal(proposalData)

            const totalVotesCast = proposalData.forVotes + proposalData.againstVotes

            setVoteProgress({
                votesCast: totalVotesCast,
                total: proposalData.jurySize
            })

            // Fetch jurors list
            try {
                const jurorsList = await governor.getProposalJurors(id)
                const jurorsArray = Array.isArray(jurorsList) ? jurorsList : []
                setJurors(jurorsArray)

                if (account && jurorsArray.length > 0) {
                    const isJuror = jurorsArray.some(
                        j => j.toLowerCase() === account.toLowerCase()
                    )
                    setIsSelectedJuror(isJuror)

                    if (isJuror) {
                        try {
                            const voted = await governor.hasVoted(id, account)
                            setHasVoted(voted)
                        } catch (error) {
                            setHasVoted(false)
                        }
                    }
                }
            } catch (err) {
                // Jurors not loaded yet - Pyth Entropy still processing
                setJurors([])
            }
        } catch (error) {
            toast.error('Failed to load proposal')
        } finally {
            setLoading(false)
        }
    }

    const handleVote = async (support) => {
        if (!governor) return

        setVoting(true)
        try {
            const tx = await governor.castVote(id, support)
            toast.loading('Submitting vote...', { id: 'vote' })

            await tx.wait()

            toast.success(
                `Vote submitted! ${voteProgress.votesCast + 1}/${voteProgress.total}`,
                { id: 'vote', duration: 5000 }
            )

            setShowVoteModal(false)

            if (voteProgress.votesCast + 1 >= voteProgress.total) {
                toast.success('🎉 All jurors voted!', { duration: 7000 })
            }

            setTimeout(fetchProposal, 2000)
        } catch (error) {
            let errorMsg = 'Vote failed'

            if (error.code === 'ACTION_REJECTED') {
                errorMsg = 'Transaction rejected'
            } else if (error.message?.includes('Already voted')) {
                errorMsg = 'You already voted!'
            } else if (error.message?.includes('Not a selected juror')) {
                errorMsg = 'You are not a selected juror!'
            } else if (error.message?.includes('Voting ended')) {
                errorMsg = 'Voting period has ended!'
            } else if (error.message?.includes('Not active')) {
                errorMsg = 'Proposal is not active!'
            } else if (error.reason) {
                errorMsg = error.reason
            }

            toast.error(errorMsg, { id: 'vote' })
        } finally {
            setVoting(false)
        }
    }

    const handleExecute = async () => {
        if (!governor) return

        setExecuting(true)
        try {
            const tx = await governor.executeProposal(id)
            toast.loading('Executing proposal...', { id: 'execute' })

            await tx.wait()

            toast.success('Proposal executed successfully!', { id: 'execute', duration: 5000 })
            fetchProposal()
        } catch (error) {
            const errorMsg = error.reason || error.message || 'Execution failed'
            toast.error(errorMsg, { id: 'execute' })
        } finally {
            setExecuting(false)
        }
    }

    const formatAddress = (addr) => {
        if (!addr) return ''
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`
    }

    const formatDate = (timestamp) => {
        if (!timestamp) return ''
        return new Date(timestamp * 1000).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const formatTimeLeft = (deadline) => {
        const now = Math.floor(Date.now() / 1000)
        const timeLeft = deadline - now

        if (timeLeft <= 0) return 'Ended'

        const days = Math.floor(timeLeft / 86400)
        const hours = Math.floor((timeLeft % 86400) / 3600)
        const minutes = Math.floor((timeLeft % 3600) / 60)

        if (days > 0) return `${days}d ${hours}h`
        if (hours > 0) return `${hours}h ${minutes}m`
        return `${minutes}m`
    }

    const calculatePercentage = (value, total) => {
        if (total === 0) return 0
        return Math.round((value / total) * 100)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    if (!proposal) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Proposal Not Found</h2>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        )
    }

    const totalVotes = proposal.forVotes + proposal.againstVotes
    const forPercentage = calculatePercentage(proposal.forVotes, totalVotes)
    const now = Math.floor(Date.now() / 1000)

    const isActive = proposal.state === 1 && now < proposal.deadline
    const canVote = isSelectedJuror && !hasVoted && isActive
    const canExecute = proposal.state === 1 && (now >= proposal.deadline || voteProgress.votesCast >= voteProgress.total)
    const allVoted = voteProgress.votesCast >= voteProgress.total && voteProgress.total > 0
    const voteProgressPercent = voteProgress.total > 0 ? (voteProgress.votesCast / voteProgress.total) * 100 : 0

    const stateNames = ['Pending', 'Active', 'Defeated', 'Succeeded', 'Executed']
    const stateColors = [
        'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
        'bg-blue-500/10 border-blue-500/30 text-blue-400',
        'bg-red-500/10 border-red-500/30 text-red-400',
        'bg-green-500/10 border-green-500/30 text-green-400',
        'bg-gray-500/10 border-gray-500/30 text-gray-400'
    ]

    const statusBadge = {
        text: stateNames[proposal.state] || 'Unknown',
        color: stateColors[proposal.state] || stateColors[0]
    }

    return (
        <div className="min-h-screen py-8 bg-gray-900 text-white">
            <div className="container mx-auto px-4 max-w-4xl">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2 text-gray-400 hover:text-gray-100 mb-6 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        Back to Proposals
                    </button>

                    {/* Header */}
                    <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700 shadow-xl">
                        <div className="flex items-start justify-between mb-4">
                            <h1 className="text-3xl font-bold flex-1 pr-4">{proposal.title}</h1>
                            <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${statusBadge.color} whitespace-nowrap`}>
                                {statusBadge.text}
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-4">
                            <div className="flex items-center gap-2">
                                <User size={16} />
                                <span>By {formatAddress(proposal.proposer)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock size={16} />
                                <span>
                                    {isActive
                                        ? `Ends in ${formatTimeLeft(proposal.deadline)}`
                                        : `Ended ${formatDate(proposal.deadline)}`}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users size={16} />
                                <span>{proposal.jurySize} Juror{proposal.jurySize !== 1 ? 's' : ''}</span>
                            </div>
                        </div>

                        <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{proposal.description}</p>
                    </div>

                    {/* Execute Call-to-Action */}
                    {canExecute && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 border-2 border-yellow-500/40 rounded-lg p-6 mb-6 shadow-2xl"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-yellow-500/20 rounded-lg">
                                    <Zap size={24} className="text-yellow-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-yellow-400">Action Required!</h3>
                                    <p className="text-sm text-gray-300">Voting period has ended</p>
                                </div>
                            </div>

                            <p className="text-gray-300 mb-4">
                                The voting deadline has passed with <strong className="text-white">{voteProgress.votesCast}/{voteProgress.total}</strong> jurors voting.
                                Execute this proposal to finalize the outcome and update its status to {proposal.forVotes > proposal.againstVotes ?
                                <span className="text-green-400 font-semibold">Succeeded</span> :
                                <span className="text-red-400 font-semibold">Defeated</span>}.
                            </p>

                            <button
                                onClick={handleExecute}
                                disabled={executing}
                                className="w-full px-6 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                <Zap size={20} />
                                {executing ? 'Executing Proposal...' : 'Execute Proposal Now'}
                            </button>

                            <p className="text-xs text-gray-400 mt-3 text-center">
                                Anyone can execute this proposal after the deadline
                            </p>
                        </motion.div>
                    )}

                    {/* Vote Progress */}
                    {isActive && voteProgress.total > 0 && (
                        <div className="bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-blue-500/20 rounded-lg p-6 mb-6 shadow-lg">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Activity size={20} className="text-blue-400" />
                                    <h3 className="font-semibold">Vote Progress</h3>
                                </div>
                                <span className="text-sm font-mono bg-gray-900 px-3 py-1 rounded-lg">
                                    {voteProgress.votesCast} / {voteProgress.total} voted
                                </span>
                            </div>

                            <div className="relative w-full h-4 bg-gray-900 rounded-full overflow-hidden mb-2">
                                <motion.div
                                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${voteProgressPercent}%` }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>

                            {allVoted && (
                                <div className="flex items-center gap-2 text-green-400 text-sm font-semibold mt-2">
                                    <CheckCircle size={16} />
                                    <span>All jurors voted! Waiting for deadline to execute.</span>
                                </div>
                            )}

                            {!allVoted && canVote && (
                                <div className="flex items-center gap-2 text-yellow-400 text-sm font-semibold mt-2">
                                    <AlertCircle size={16} />
                                    <span>⚠️ You can only vote once - choose carefully!</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Voting Results */}
                    <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700 shadow-lg">
                        <h2 className="text-xl font-bold mb-4">Voting Results</h2>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4 hover:bg-green-500/10 transition-colors">
                                <div className="flex items-center gap-2 mb-2">
                                    <ThumbsUp size={20} className="text-green-500" />
                                    <span className="font-semibold">For</span>
                                </div>
                                <div className="text-3xl font-bold text-green-500">{proposal.forVotes}</div>
                            </div>
                            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 hover:bg-red-500/10 transition-colors">
                                <div className="flex items-center gap-2 mb-2">
                                    <ThumbsDown size={20} className="text-red-500" />
                                    <span className="font-semibold">Against</span>
                                </div>
                                <div className="text-3xl font-bold text-red-500">{proposal.againstVotes}</div>
                            </div>
                        </div>

                        {totalVotes > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm font-semibold">
                                    <span className="text-green-400">{forPercentage}% For</span>
                                    <span className="text-red-400">{100 - forPercentage}% Against</span>
                                </div>
                                <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                                        style={{ width: `${forPercentage}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Selected Jurors */}
                    <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700 shadow-lg">
                        <h2 className="text-xl font-bold mb-4">Selected Jurors ({jurors.length})</h2>
                        {jurors.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                                <p className="text-gray-400">
                                    ⏳ Waiting for Pyth Entropy to select jurors (30-60 seconds)...
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                {jurors.map((juror, index) => (
                                    <div
                                        key={index}
                                        className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                                            juror.toLowerCase() === account?.toLowerCase()
                                                ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20'
                                                : 'bg-gray-900 border-gray-700 hover:bg-gray-800'
                                        }`}
                                    >
                                        <Users size={16} className="text-gray-500" />
                                        <span className="font-mono text-sm">{formatAddress(juror)}</span>
                                        {juror.toLowerCase() === account?.toLowerCase() && (
                                            <span className="ml-auto text-xs bg-blue-600 px-2 py-1 rounded font-semibold">You</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Voting Actions */}
                    <div className="space-y-3">
                        {canVote && (
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => { setVoteChoice(true); setShowVoteModal(true) }}
                                    className="flex items-center justify-center gap-2 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg transition-all shadow-lg hover:shadow-xl"
                                >
                                    <ThumbsUp size={20} />
                                    Vote For
                                </button>
                                <button
                                    onClick={() => { setVoteChoice(false); setShowVoteModal(true) }}
                                    className="flex items-center justify-center gap-2 px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-lg transition-all shadow-lg hover:shadow-xl"
                                >
                                    <ThumbsDown size={20} />
                                    Vote Against
                                </button>
                            </div>
                        )}

                        {hasVoted && isActive && (
                            <div className="bg-green-500/10 border border-green-500/30 rounded-lg text-center py-6">
                                <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
                                <p className="font-bold text-green-400 text-lg">You've already voted!</p>
                                <p className="text-sm text-gray-400 mt-1">Waiting for other jurors or deadline...</p>
                            </div>
                        )}

                        {!isSelectedJuror && isActive && jurors.length > 0 && (
                            <div className="bg-gray-700/50 border border-gray-600 rounded-lg text-center py-6">
                                <AlertCircle size={32} className="mx-auto mb-2 text-gray-400" />
                                <p className="font-semibold text-gray-400">You are not a selected juror</p>
                                <p className="text-sm text-gray-500 mt-1">Only selected jurors can vote on this proposal</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Vote Modal */}
            <Modal isOpen={showVoteModal} onClose={() => setShowVoteModal(false)} title="Confirm Vote">
                <div className="text-center py-4">
                    <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
                        voteChoice ? 'bg-green-500/10 border-4 border-green-500/30' : 'bg-red-500/10 border-4 border-red-500/30'
                    }`}>
                        {voteChoice ? <ThumbsUp size={40} className="text-green-500" /> : <ThumbsDown size={40} className="text-red-500" />}
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Vote {voteChoice ? 'For' : 'Against'}?</h3>
                    <p className="text-gray-400 mb-4">This action cannot be undone</p>
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-6">
                        <p className="text-yellow-400 text-sm font-semibold">⚠️ You cannot change your vote after submission!</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowVoteModal(false)}
                            className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => handleVote(voteChoice)}
                            disabled={voting}
                            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {voting ? 'Voting...' : 'Confirm Vote'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

export default ProposalDetail
