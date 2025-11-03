import React from 'react'
import { Link } from 'react-router-dom'
import { Clock, Users, ThumbsUp, ThumbsDown, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { formatTimeLeft, formatProposalState } from '../utils/format'
import { STATE_COLORS } from '../utils/constants'

const ProposalCard = ({ proposal, index }) => {
    const stateConfig = STATE_COLORS[proposal.state] || STATE_COLORS[0]

    const votingProgress = () => {
        const total = proposal.forVotes + proposal.againstVotes
        if (total === 0) return 0
        return (proposal.forVotes / total) * 100
    }

    const isActive = proposal.state === 1

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
        >
            <Link to={`/proposal/${proposal.id}`}>
                <div className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all cursor-pointer h-full flex flex-col">
                    {/* Gradient Background on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 rounded-xl transition-all" />

                    {/* Content */}
                    <div className="relative flex-1 flex flex-col">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1 pr-2">
                                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors line-clamp-2">
                                    {proposal.title}
                                </h3>
                                <p className="text-gray-400 text-sm line-clamp-2">{proposal.description}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-lg text-xs font-medium border whitespace-nowrap ${stateConfig}`}>
                                {formatProposalState(proposal.state)}
                            </span>
                        </div>

                        {/* Voting Progress */}
                        {(proposal.forVotes > 0 || proposal.againstVotes > 0) && (
                            <div className="mb-4">
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <div className="flex items-center gap-2">
                                        <ThumbsUp className="w-4 h-4 text-green-400" />
                                        <span className="text-green-400 font-medium">{proposal.forVotes}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-red-400 font-medium">{proposal.againstVotes}</span>
                                        <ThumbsDown className="w-4 h-4 text-red-400" />
                                    </div>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all"
                                        style={{ width: `${votingProgress()}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                                <div className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    <span>{proposal.jurySize}</span>
                                </div>
                                {isActive && (
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        <span>{formatTimeLeft(proposal.deadline)}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-blue-400 group-hover:gap-3 transition-all">
                                <span className="text-sm font-medium">View</span>
                                <ArrowRight className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    )
}

export default ProposalCard
