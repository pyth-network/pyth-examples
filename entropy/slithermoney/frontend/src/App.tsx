import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import { useReadContract, useWriteContract, useChainId, useWaitForTransactionReceipt, useBlockNumber, useAccount } from 'wagmi'
import { config as contractConfig } from '../config'
import { abi } from '../abi'
import { abi as entropyAbi } from '../entropyabi'
import { usdcAbi } from '../usdcabi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import confetti from 'canvas-confetti'

const GRID_SIZE = 20
const CELL_SIZE = 30
const INITIAL_SNAKE_1 = [{ x: 5, y: 10 }]
const INITIAL_SNAKE_2 = [{ x: 15, y: 10 }]
const INITIAL_DIRECTION_1 = { x: 0, y: 0 }
const INITIAL_DIRECTION_2 = { x: 0, y: 0 }
const GAME_SPEED = 150

type Position = { x: number; y: number }
type MoveLog = [number, string | null, string | null] // [tick, player1input, player2input]


  

// Convert direction to letter
const directionToLetter = (dir: Position): string | null => {
  if (dir.x === -1 && dir.y === 0) return 'L'
  if (dir.x === 1 && dir.y === 0) return 'R'
  if (dir.x === 0 && dir.y === -1) return 'U'
  if (dir.x === 0 && dir.y === 1) return 'D'
  return null
}

// Convert letter to direction
const letterToDirection = (letter: string | null): Position => {
  switch (letter) {
    case 'L': return { x: -1, y: 0 }
    case 'R': return { x: 1, y: 0 }
    case 'U': return { x: 0, y: -1 }
    case 'D': return { x: 0, y: 1 }
    default: return { x: 0, y: 0 }
  }
}

// Simple hash function
const hashMoves = (moves: MoveLog[]): string => {
  const str = moves.map(([tick, p1, p2]) => `${tick}:${p1 || '-'}:${p2 || '-'}`).join('|')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

// Seeded random number generator with uniform distribution
// Uses only the seed and index - deterministic across all computers
// Works with large bigint seeds by hashing them properly
const seededRandom = (seed: bigint, index: number): number => {
  // Create a deterministic hash from seed and index
  // This ensures uniform distribution across the board
  const seedStr = seed.toString()
  const indexStr = index.toString()
  
  // Combine seed and index, then hash multiple times for better distribution
  let hash = 0
  const combined = seedStr + '_' + indexStr
  
  // Hash function that provides good distribution
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i)
    hash = hash & hash // Convert to 32bit integer
  }
  
  // Apply additional mixing for uniform distribution
  hash = ((hash ^ (hash >>> 16)) * 0x85ebca6b) & 0x7fffffff
  hash = ((hash ^ (hash >>> 13)) * 0xc2b2ae35) & 0x7fffffff
  hash = (hash ^ (hash >>> 16)) & 0x7fffffff
  
  // Normalize to 0-1 range (using 2^31 as max for uniform distribution)
  return Math.abs(hash) / 0x7fffffff
}

// Balance Animation Component
type BalanceAnimationProps = {
  player: 1 | 2
  oldBalance: string
  newBalance: string
  isAnimating: boolean
}

function BalanceAnimation({ player, oldBalance, newBalance, isAnimating }: BalanceAnimationProps) {
  const [displayBalance, setDisplayBalance] = useState(oldBalance)
  const [isComplete, setIsComplete] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  useEffect(() => {
    if (isAnimating && !hasStarted) {
      setHasStarted(true)
      setIsComplete(false)
      setDisplayBalance(oldBalance)
      
      // Small delay before starting animation
      const startDelay = setTimeout(() => {
        const oldVal = parseFloat(oldBalance)
        const newVal = parseFloat(newBalance)
        const diff = newVal - oldVal
        const duration = 2500 // 2.5 seconds
        const steps = 120
        const stepTime = duration / steps
        let currentStep = 0

        const interval = setInterval(() => {
          currentStep++
          const progress = currentStep / steps
          // Ease out cubic for smooth animation
          const eased = 1 - Math.pow(1 - progress, 3)
          const currentVal = oldVal + (diff * eased)
          setDisplayBalance(currentVal.toFixed(2))

          if (currentStep >= steps) {
            setDisplayBalance(newBalance)
            setIsComplete(true)
            clearInterval(interval)
          }
        }, stepTime)

        return () => clearInterval(interval)
      }, 300)

      return () => clearTimeout(startDelay)
    }
  }, [isAnimating, oldBalance, newBalance, hasStarted])

  const diff = parseFloat(newBalance) - parseFloat(oldBalance)
  const isIncrease = diff > 0
  const showFinal = isComplete || !isAnimating

  return (
    <div className={`balance-animation-container ${player === 1 ? 'player1' : 'player2'}`}>
      <div className="balance-animation-label">Player {player} Balance</div>
      <div className={`balance-animation-numbers ${isAnimating && hasStarted ? 'animating' : ''} ${isComplete ? 'complete' : ''}`}>
        <div className="balance-old">
          <span className="balance-amount">{oldBalance}</span>
          <span className="balance-currency">USDC</span>
        </div>
        <div className="balance-arrow">→</div>
        {isAnimating && hasStarted && !showFinal ? (
          <div className={`balance-new ${isIncrease ? 'increase' : 'decrease'}`}>
            <span className="balance-amount">{displayBalance}</span>
            <span className="balance-currency">USDC</span>
          </div>
        ) : (
          <div className={`balance-new ${isIncrease ? 'increase' : 'decrease'} ${showFinal ? 'final' : ''}`}>
            <span className="balance-amount">{newBalance}</span>
            <span className="balance-currency">USDC</span>
            {showFinal && isIncrease && diff > 0 && (
              <span className="balance-bonus">+{diff.toFixed(2)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

type GooglyEyesProps = {
  direction: Position
  player: 1 | 2
}

function GooglyEyes({ direction, player }: GooglyEyesProps) {
  const [eyeOffset1, setEyeOffset1] = useState({ x: 0, y: 0 })
  const [eyeOffset2, setEyeOffset2] = useState({ x: 0, y: 0 })
  
  useEffect(() => {
    // Animate eyes looking around independently
    const interval1 = setInterval(() => {
      const angle = Math.random() * Math.PI * 2
      const distance = 1.5 + Math.random() * 1.5
      setEyeOffset1({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance
      })
    }, 800 + Math.random() * 1200)
    
    const interval2 = setInterval(() => {
      const angle = Math.random() * Math.PI * 2
      const distance = 1.5 + Math.random() * 1.5
      setEyeOffset2({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance
      })
    }, 800 + Math.random() * 1200)
    
    return () => {
      clearInterval(interval1)
      clearInterval(interval2)
    }
  }, [])
  
  // Base eye position based on direction - eyes at top front of head
  const getEyePosition = (isLeft: boolean, eyeOffset: { x: number; y: number }) => {
    // Default positions (when moving right) - more spaced apart
    let baseX = isLeft ? 28 : 72
    let baseY = 25
    
    // Adjust based on direction
    if (direction.x > 0) { // Right
      baseX = isLeft ? 28 : 72
      baseY = 25
    } else if (direction.x < 0) { // Left
      baseX = isLeft ? 72 : 28
      baseY = 25
    } else if (direction.y > 0) { // Down
      baseX = isLeft ? 28 : 72
      baseY = 30
    } else if (direction.y < 0) { // Up
      baseX = isLeft ? 28 : 72
      baseY = 20
    }
    
    return {
      left: `${baseX + eyeOffset.x}%`,
      top: `${baseY + eyeOffset.y}%`
    }
  }
  
  return (
    <div className="googly-eyes-container">
      <div 
        className="googly-eye"
        style={{
          ...getEyePosition(true, eyeOffset1)
        } as React.CSSProperties}
      >
        <div className="googly-pupil" />
      </div>
      <div 
        className="googly-eye"
        style={{
          ...getEyePosition(false, eyeOffset2)
        } as React.CSSProperties}
      >
        <div className="googly-pupil" />
      </div>
    </div>
  )
}

type MoveSelectorProps = {
  currentMove: string | null
  onSelect: (move: string | null) => void
  onClose: () => void
}

function MoveSelector({ currentMove, onSelect, onClose }: MoveSelectorProps) {
  const moves: (string | null)[] = ['U', 'L', 'D', 'R', null]
  
  return (
    <div className="move-selector-overlay" onClick={onClose}>
      <div className="move-selector" onClick={(e) => e.stopPropagation()}>
        <div className="move-selector-title">Select Move</div>
        <div className="move-selector-buttons">
          <div className="move-selector-buttons-row">
            <button
              className={`move-selector-btn ${'U' === currentMove ? 'selected' : ''}`}
              onClick={() => {
                onSelect('U')
                onClose()
              }}
            >
              U
            </button>
          </div>
          <div className="move-selector-buttons-row">
            <button
              className={`move-selector-btn ${'L' === currentMove ? 'selected' : ''}`}
              onClick={() => {
                onSelect('L')
                onClose()
              }}
            >
              L
            </button>
            <button
              className={`move-selector-btn ${null === currentMove ? 'selected' : ''}`}
              onClick={() => {
                onSelect(null)
                onClose()
              }}
            >
              —
            </button>
            <button
              className={`move-selector-btn ${'R' === currentMove ? 'selected' : ''}`}
              onClick={() => {
                onSelect('R')
                onClose()
              }}
            >
              R
            </button>
          </div>
          <div className="move-selector-buttons-row">
            <button
              className={`move-selector-btn ${'D' === currentMove ? 'selected' : ''}`}
              onClick={() => {
                onSelect('D')
                onClose()
              }}
            >
              D
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const MAX_MOVE_SLOTS = 200

function MoveVisualization({ 
  moves, 
  player, 
  gameOver, 
  modifiedMoves,
  onMoveClick,
  currentTick
}: { 
  moves: MoveLog[], 
  player: 1 | 2, 
  gameOver: boolean,
  modifiedMoves: Set<string>,
  onMoveClick: (tick: number, player: 1 | 2) => void,
  currentTick: number
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  
  // Create a map of moves by tick for quick lookup
  const movesByTick = new Map<number, MoveLog>()
  moves.forEach(move => {
    movesByTick.set(move[0], move)
  })
  
  const MOVES_PER_ROW = 5
  const numRows = Math.ceil(MAX_MOVE_SLOTS / MOVES_PER_ROW)
  
  // Scroll to keep current tick visible (center the row containing current tick)
  useEffect(() => {
    if (scrollContainerRef.current && !gameOver) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        if (scrollContainerRef.current) {
          const rowIndex = Math.floor(currentTick / MOVES_PER_ROW)
          const currentRow = rowRefs.current.get(rowIndex)
          if (currentRow) {
            const container = scrollContainerRef.current
            const rowOffset = currentRow.offsetTop
            const rowHeight = currentRow.offsetHeight
            const containerHeight = container.clientHeight
            
            // Center the current tick row in the viewport
            const targetScroll = rowOffset - (containerHeight / 2) + (rowHeight / 2)
            container.scrollTop = targetScroll
          }
        }
      }, 0)
    }
  }, [currentTick, gameOver, moves])
  
  return (
    <div className="move-visualization">
      <div className="move-visualization-title">Moves</div>
      <div className="move-grid-scrollable" ref={scrollContainerRef}>
        <div className="move-grid">
          <div className="tick-column-header">Tick</div>
          {Array.from({ length: MOVES_PER_ROW }, (_, colIdx) => (
            <div key={`header-${colIdx}`} className="move-grid-spacer"></div>
          ))}
          {Array.from({ length: numRows }, (_, rowIdx) => {
            const startTick = rowIdx * MOVES_PER_ROW
            return (
              <>
                <div 
                  key={`tick-${rowIdx}`} 
                  className="tick-number"
                  ref={(el) => {
                    if (el) rowRefs.current.set(rowIdx, el)
                  }}
                >
                  {startTick}
                </div>
                {Array.from({ length: MOVES_PER_ROW }, (_, colIdx) => {
                  const tick = startTick + colIdx
                  if (tick >= MAX_MOVE_SLOTS) return null
                  const moveEntry = movesByTick.get(tick)
                  const move = moveEntry ? (player === 1 ? moveEntry[1] : moveEntry[2]) : null
                  const isActive = move !== null
                  const moveKey = `${tick}-${player}`
                  const isModified = modifiedMoves.has(moveKey)
                  
                  return (
                    <div 
                      key={`box-${tick}`}
                      className={`move-box ${isActive ? `move-${move?.toLowerCase()}` : 'move-empty'} ${isModified ? 'move-modified' : ''}`}
                      onClick={() => onMoveClick(tick, player)}
                      style={{ cursor: 'pointer' }}
                    >
                      {move || ''}
                    </div>
                  )
                })}
              </>
            )
          })}
        </div>
      </div>
    </div>
  )
}

type GameState = {
  snake1: Position[]
  snake2: Position[]
  direction1: Position
  direction2: Position
  food: Position
  foodCounter: number // Tracks how many times food has been eaten (for deterministic generation)
  gameOver: boolean
  winner: 1 | 2 | null
}

function App() {
  const chainId = useChainId()
  const rawAddress = contractConfig[chainId as keyof typeof contractConfig]?.address
  const contractAddress = rawAddress && rawAddress !== '0x0000000000000000000000000000000000000000' 
    ? (rawAddress as `0x${string}`)
    : undefined
  
  // Read entropy address from Snake contract (only for chainId 84532)
  const { data: entropyAddress } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'entropy',
    query: {
      enabled: !!contractAddress && chainId === 84532,
    },
  })

  // Read feeV2 from entropy contract (only for chainId 84532)
  const { data: feeV2 } = useReadContract({
    address: entropyAddress as `0x${string}` | undefined,
    abi: entropyAbi,
    functionName: 'getFeeV2',
    query: {
      enabled: !!entropyAddress && chainId === 84532,
    },
  })

  // Read random seed from contract
  const { data: randomSeed, refetch: refetchRandomSeed } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'numberAsUint',
    query: {
      enabled: !!contractAddress,
    },
  })

  // Watch for new blocks
  const { data: blockNumber } = useBlockNumber({ watch: true })
  const { address: walletAddress } = useAccount()

  // Get USDC address and wager amount from config
  const usdcAddress = contractConfig[chainId as keyof typeof contractConfig]?.usdcAddress as `0x${string}` | undefined
  const wagerAmountStr = contractConfig[chainId as keyof typeof contractConfig]?.wagerAmount || "0.01"
  const wagerAmountWei = BigInt(Math.floor(parseFloat(wagerAmountStr) * 1e6)) // USDC has 6 decimals

  // Read wager amount from contract
  const { data: contractWagerAmount, refetch: refetchWagerAmount } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'wagerAmount',
    query: {
      enabled: !!contractAddress,
    },
  })

  // Read player ready states
  const { data: player1Ready, refetch: refetchPlayer1Ready } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'player1Ready',
    query: {
      enabled: !!contractAddress,
    },
  })

  const { data: player2Ready, refetch: refetchPlayer2Ready } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'player2Ready',
    query: {
      enabled: !!contractAddress,
    },
  })

  // Read USDC allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: usdcAddress,
    abi: usdcAbi as any,
    functionName: 'allowance',
    args: walletAddress && contractAddress ? [walletAddress, contractAddress] : undefined,
    query: {
      enabled: !!walletAddress && !!contractAddress && !!usdcAddress,
    },
  })

  // Read player balances from contract
  const { data: player1Balance, refetch: refetchPlayer1Balance } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'player1Balance',
    query: {
      enabled: !!contractAddress,
    },
  })

  const { data: player2Balance, refetch: refetchPlayer2Balance } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'player2Balance',
    query: {
      enabled: !!contractAddress,
    },
  })

  // Format player balances to 2 decimals (USDC has 6 decimals)
  const player1BalanceDisplay = player1Balance 
    ? (Number(player1Balance) / 1e6).toFixed(2)
    : '0.00'
  
  const player2BalanceDisplay = player2Balance 
    ? (Number(player2Balance) / 1e6).toFixed(2)
    : '0.00'

  // Refetch on every block
  useEffect(() => {
    if (blockNumber && contractAddress) {
      refetchRandomSeed()
      refetchWagerAmount()
      refetchPlayer1Ready()
      refetchPlayer2Ready()
      refetchPlayer1Balance()
      refetchPlayer2Balance()
      if (walletAddress) {
        refetchAllowance()
      }
    }
  }, [blockNumber, contractAddress, walletAddress, refetchRandomSeed, refetchWagerAmount, refetchPlayer1Ready, refetchPlayer2Ready, refetchPlayer1Balance, refetchPlayer2Balance, refetchAllowance])

  // Write contract hooks
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { writeContract: writeContractApprove, data: approveHash, isPending: isApproving } = useWriteContract()
  const { writeContract: writeContractWager, data: wagerHash, isPending: isWagering } = useWriteContract()
  const { writeContract: writeContractPayout, data: payoutTxHash, isPending: isPayingOut } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const { isLoading: isApprovingConfirming, isSuccess: isApproved } = useWaitForTransactionReceipt({
    hash: approveHash,
  })

  const { isLoading: isWagerConfirming, isSuccess: isWagered } = useWaitForTransactionReceipt({
    hash: wagerHash,
  })

  const { isLoading: isPayoutConfirming, isSuccess: isPayoutConfirmed } = useWaitForTransactionReceipt({
    hash: payoutTxHash,
  })

  // Refetch after transactions are confirmed
  useEffect(() => {
    if (isConfirmed) {
      refetchRandomSeed()
    }
  }, [isConfirmed, refetchRandomSeed])

  useEffect(() => {
    if (isApproved) {
      refetchAllowance()
    }
  }, [isApproved, refetchAllowance])

  useEffect(() => {
    if (isWagered) {
      refetchPlayer1Ready()
      refetchPlayer2Ready()
    }
  }, [isWagered, refetchPlayer1Ready, refetchPlayer2Ready])

  // Check if both players are ready
  const bothPlayersReady = player1Ready === true && player2Ready === true

  const [snake1, setSnake1] = useState<Position[]>(INITIAL_SNAKE_1)
  const [snake2, setSnake2] = useState<Position[]>(INITIAL_SNAKE_2)
  const [direction1, setDirection1] = useState<Position>(INITIAL_DIRECTION_1)
  const [direction2, setDirection2] = useState<Position>(INITIAL_DIRECTION_2)
  const [food, setFood] = useState<Position>({ x: 10, y: 10 })
  const [foodCounter, setFoodCounter] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [editedSeed, setEditedSeed] = useState<string>('')
  const [isEditingSeed, setIsEditingSeed] = useState(false)
  const seedTextareaRef = useRef<HTMLTextAreaElement>(null)
  const cursorPositionRef = useRef<number | null>(null)

  // Get the active seed (edited if available, otherwise on-chain)
  const activeSeed = editedSeed !== '' ? editedSeed : (randomSeed?.toString() || '')
  
  // Check if seed is edited (different from on-chain)
  const isSeedEdited = randomSeed !== undefined && editedSeed !== '' && editedSeed !== randomSeed.toString()
  
  // Format seed to split every 30 characters for display
  const formatSeedForDisplay = (seed: string): string => {
    if (!seed) return ''
    // Remove any existing newlines first
    const cleanSeed = seed.replace(/\n/g, '')
    // Split into chunks of 30 characters
    return cleanSeed.match(/.{1,30}/g)?.join('\n') || cleanSeed
  }
  
  // Get display seed (formatted with newlines every 30 chars)
  const displaySeed = formatSeedForDisplay(activeSeed)
  
  // Validate if seed is a valid BigInt
  const isValidSeed = (seed: string): boolean => {
    if (!seed || seed.trim() === '') return true // Empty seed is valid (uses on-chain)
    try {
      BigInt(seed.trim())
      return true
    } catch (e) {
      return false
    }
  }
  
  // Check if current seed is invalid
  const isSeedInvalid = editedSeed !== '' && !isValidSeed(editedSeed)
  
  // Restore cursor position after displaySeed updates
  useEffect(() => {
    if (cursorPositionRef.current !== null && seedTextareaRef.current) {
      const targetPos = Math.min(cursorPositionRef.current, displaySeed.length)
      seedTextareaRef.current.setSelectionRange(targetPos, targetPos)
      cursorPositionRef.current = null
    }
  }, [displaySeed])
  
  const handleSeedEdit = () => {
    // Initialize editedSeed with current active seed if not already set
    if (editedSeed === '') {
      setEditedSeed(activeSeed.replace(/\n/g, ''))
    }
    setIsEditingSeed(true)
    // Focus the textarea when edit is clicked
    setTimeout(() => {
      if (seedTextareaRef.current) {
        seedTextareaRef.current.focus()
      }
    }, 0)
  }
  
  const handleSeedSave = () => {
    // Remove newlines when storing
    const cleanSeed = editedSeed.replace(/\n/g, '').trim()
    setEditedSeed(cleanSeed)
    // Don't exit edit mode on blur - only revert does that
    // Don't auto-revert invalid seeds - let user see the error
  }
  
  const handleSeedRevert = () => {
    setEditedSeed('')
    setIsEditingSeed(false)
  }
  
  const handleSeedChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target
    const cursorPosition = textarea.selectionStart
    const currentValue = textarea.value
    
    // Remove newlines when storing (user can type freely, we format on display)
    const cleanValue = currentValue.replace(/\n/g, '')
    
    // Calculate cursor position in clean value (without newlines)
    // Count newlines before cursor in current formatted value
    const newlinesBeforeCursor = (currentValue.substring(0, cursorPosition).match(/\n/g) || []).length
    // The cursor position in the clean value (without newlines)
    const cleanCursorPos = cursorPosition - newlinesBeforeCursor
    
    // After formatting, calculate where cursor should be
    // Newlines are inserted every 30 characters, so:
    // cleanPos 0-29 → formattedPos 0-29 (no newline)
    // cleanPos 30 → formattedPos 31 (newline at 30)
    // cleanPos 31-59 → formattedPos 32-60 (one newline before)
    // Formula: formattedPos = cleanPos + floor(cleanPos / 30)
    const newCursorPosition = cleanCursorPos + Math.floor(cleanCursorPos / 30)
    
    // Store cursor position to restore after React updates
    cursorPositionRef.current = newCursorPosition
    
    setEditedSeed(cleanValue)
  }

  const [winner, setWinner] = useState<1 | 2 | null>(null)
  // Scores are derived from snake lengths - no separate state needed
  const [tick, setTick] = useState(0)
  const [player1MoveLog, setPlayer1MoveLog] = useState<MoveLog[]>([])
  const [player2MoveLog, setPlayer2MoveLog] = useState<MoveLog[]>([])
  const [originalMoveLog, setOriginalMoveLog] = useState<MoveLog[]>([])
  const [modifiedMoves, setModifiedMoves] = useState<Set<string>>(new Set())
  const [editingMove, setEditingMove] = useState<{ tick: number, player: 1 | 2 } | null>(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [explodingSnake1, setExplodingSnake1] = useState(false)
  const [explodingSnake2, setExplodingSnake2] = useState(false)
  const [showGameOverScreen, setShowGameOverScreen] = useState(false)
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const [payoutStep, setPayoutStep] = useState(0)
  const [payoutHash, setPayoutHash] = useState<string | null>(null)
  const [oldPlayer1Balance, setOldPlayer1Balance] = useState<string>('0.00')
  const [oldPlayer2Balance, setOldPlayer2Balance] = useState<string>('0.00')
  const [showBalanceAnimation, setShowBalanceAnimation] = useState(false)

  // Use refs to access current state in callbacks
  const snake1Ref = useRef(snake1)
  const snake2Ref = useRef(snake2)
  const direction1Ref = useRef(direction1)
  const direction2Ref = useRef(direction2)
  const foodRef = useRef(food)
  const gameOverRef = useRef(gameOver)
  const tickRef = useRef(tick)
  const randomSeedRef = useRef<bigint | undefined>(randomSeed as bigint | undefined)
  const editedSeedRef = useRef<string>('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const boomAudioRef = useRef<HTMLAudioElement | null>(null)
  const munchAudioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    snake1Ref.current = snake1
    snake2Ref.current = snake2
    direction1Ref.current = direction1
    direction2Ref.current = direction2
    foodRef.current = food
    gameOverRef.current = gameOver
    tickRef.current = tick
    randomSeedRef.current = randomSeed as bigint | undefined
    editedSeedRef.current = editedSeed
  }, [snake1, snake2, direction1, direction2, food, gameOver, tick, randomSeed, editedSeed])

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('/soundtrack.mp3')
    audioRef.current.loop = true
    audioRef.current.volume = 0.5
    
    boomAudioRef.current = new Audio('/boom.mp3')
    boomAudioRef.current.volume = 0.7
    
    munchAudioRef.current = new Audio('/munch.mp3')
    munchAudioRef.current.volume = 0.6
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (boomAudioRef.current) {
        boomAudioRef.current.pause()
        boomAudioRef.current = null
      }
      if (munchAudioRef.current) {
        munchAudioRef.current.pause()
        munchAudioRef.current = null
      }
    }
  }, [])

  // Play soundtrack when game starts
  useEffect(() => {
    if (gameStarted && !gameOver && audioRef.current) {
      audioRef.current.play().catch(err => {
        console.error('Error playing soundtrack:', err)
      })
    }
  }, [gameStarted, gameOver])

  // Stop soundtrack when end screen is shown
  useEffect(() => {
    if (showGameOverScreen && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [showGameOverScreen])

  const generateFood = useCallback((seed?: bigint, index: number = 0): Position => {
    let newFood: Position
    let attempts = 0
    do {
      // Use seeded random if available, otherwise fall back to Math.random
      const rand = seed !== undefined 
        ? seededRandom(seed, index * 2 + attempts)
        : Math.random()
      const rand2 = seed !== undefined
        ? seededRandom(seed, index * 2 + attempts + 1)
        : Math.random()
      newFood = {
        x: Math.floor(rand * GRID_SIZE),
        y: Math.floor(rand2 * GRID_SIZE)
      }
      attempts++
    } while (
      (snake1Ref.current.some(seg => seg.x === newFood.x && seg.y === newFood.y) ||
       snake2Ref.current.some(seg => seg.x === newFood.x && seg.y === newFood.y)) &&
      attempts < 100 // Safety limit to prevent infinite loops
    )
    return newFood
  }, [])

  const checkWallCollision = useCallback((head: Position): boolean => {
    return head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE
  }, [])

  const checkSelfCollision = useCallback((head: Position, body: Position[]): boolean => {
    return body.some(segment => segment.x === head.x && segment.y === head.y)
  }, [])

  const checkSnakeCollision = useCallback((head: Position, otherSnake: Position[]): boolean => {
    return otherSnake.some(segment => segment.x === head.x && segment.y === head.y)
  }, [])

  const checkHeadToHeadCollision = useCallback((head1: Position, head2: Position): boolean => {
    return head1.x === head2.x && head1.y === head2.y
  }, [])

  // Replayable game logic - applies a single move and returns new state
  const applyMove = useCallback((
    state: GameState,
    p1Move: string | null,
    p2Move: string | null,
    currentTick: number,
    randomSeed?: bigint
  ): GameState => {
    const dir1 = letterToDirection(p1Move)
    const dir2 = letterToDirection(p2Move)

    const head1 = state.snake1[0]
    const head2 = state.snake2[0]
    
    // Only move if direction is not zero (snake has started)
    const newHead1 = dir1.x === 0 && dir1.y === 0 
      ? head1 
      : {
          x: head1.x + dir1.x,
          y: head1.y + dir1.y
        }
    const newHead2 = dir2.x === 0 && dir2.y === 0
      ? head2
      : {
          x: head2.x + dir2.x,
          y: head2.y + dir2.y
        }
    
    // Skip everything if neither snake has started
    if (dir1.x === 0 && dir1.y === 0 && dir2.x === 0 && dir2.y === 0) {
      return state
    }

    // Check head-to-head collision (both die) - only if both are moving
    if ((dir1.x !== 0 || dir1.y !== 0) && (dir2.x !== 0 || dir2.y !== 0)) {
      if (checkHeadToHeadCollision(newHead1, newHead2)) {
        return {
          ...state,
          gameOver: true,
          winner: null
        }
      }
    }

    // Check if player 1 dies (only if moving)
    const p1Dead = (dir1.x !== 0 || dir1.y !== 0) && (
      checkWallCollision(newHead1) ||
      checkSelfCollision(newHead1, state.snake1) ||
      checkSnakeCollision(newHead1, state.snake2)
    )

    // Check if player 2 dies (only if moving)
    const p2Dead = (dir2.x !== 0 || dir2.y !== 0) && (
      checkWallCollision(newHead2) ||
      checkSelfCollision(newHead2, state.snake2) ||
      checkSnakeCollision(newHead2, state.snake1)
    )

    // Determine winner
    if (p1Dead && p2Dead) {
      return {
        ...state,
        gameOver: true,
        winner: null
      }
    } else if (p1Dead) {
      return {
        ...state,
        gameOver: true,
        winner: 2
      }
    } else if (p2Dead) {
      return {
        ...state,
        gameOver: true,
        winner: 1
      }
    }

    // Both alive - move snakes
    // Always create new arrays to avoid reference sharing
    let newSnake1 = dir1.x === 0 && dir1.y === 0 
      ? [...state.snake1] 
      : [newHead1, ...state.snake1]
    let newSnake2 = dir2.x === 0 && dir2.y === 0
      ? [...state.snake2]
      : [newHead2, ...state.snake2]
    
    let p1AteFood = false
    let p2AteFood = false
    let newFood = state.food
    let newFoodCounter = state.foodCounter

    // Check food for player 1 (only if moving)
    if (dir1.x !== 0 || dir1.y !== 0) {
      if (newHead1.x === state.food.x && newHead1.y === state.food.y) {
        p1AteFood = true
      }
    }

    // Check food for player 2 (only if moving, and player 1 didn't eat it)
    if (!p1AteFood && (dir2.x !== 0 || dir2.y !== 0)) {
      if (newHead2.x === state.food.x && newHead2.y === state.food.y) {
        p2AteFood = true
      }
    }

    // Generate new food if eaten by either player
    if (p1AteFood || p2AteFood) {
      // Use food counter for deterministic generation
      newFoodCounter = state.foodCounter + 1
      let attempts = 0
      let newFoodPos: Position
      
      // Generate food deterministically - if position is invalid, try next counter value
      do {
        if (randomSeed !== undefined) {
          const rand = seededRandom(randomSeed, newFoodCounter * 2 + attempts)
          const rand2 = seededRandom(randomSeed, newFoodCounter * 2 + attempts + 1)
          newFoodPos = {
            x: Math.floor(rand * GRID_SIZE),
            y: Math.floor(rand2 * GRID_SIZE)
          }
        } else {
          // Fallback to random if no seed
          newFoodPos = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
          }
        }
        attempts++
      } while (
        (newSnake1.some(seg => seg.x === newFoodPos.x && seg.y === newFoodPos.y) ||
         newSnake2.some(seg => seg.x === newFoodPos.x && seg.y === newFoodPos.y)) &&
        attempts < 1000 // Safety limit
      )
      newFood = newFoodPos
    }

    // Each snake's tail removal is completely independent
    // Snake 1: remove tail if it moved AND didn't eat food
    if ((dir1.x !== 0 || dir1.y !== 0) && !p1AteFood) {
      newSnake1.pop()
    }
    
    // Snake 2: remove tail if it moved AND didn't eat food
    if ((dir2.x !== 0 || dir2.y !== 0) && !p2AteFood) {
      newSnake2.pop()
    }

    // Check win condition: first to length 5 wins
    if (newSnake1.length >= 5 && newSnake2.length >= 5) {
      // Both reached 5 at the same time - player 1 wins (first check)
      return {
        snake1: newSnake1,
        snake2: newSnake2,
        direction1: dir1,
        direction2: dir2,
        food: newFood,
        foodCounter: newFoodCounter,
        gameOver: true,
        winner: 1
      }
    } else if (newSnake1.length >= 5) {
      // Player 1 wins
      return {
        snake1: newSnake1,
        snake2: newSnake2,
        direction1: dir1,
        direction2: dir2,
        food: newFood,
        foodCounter: newFoodCounter,
        gameOver: true,
        winner: 1
      }
    } else if (newSnake2.length >= 5) {
      // Player 2 wins
      return {
        snake1: newSnake1,
        snake2: newSnake2,
        direction1: dir1,
        direction2: dir2,
        food: newFood,
        foodCounter: newFoodCounter,
        gameOver: true,
        winner: 2
      }
    }

    return {
      snake1: newSnake1,
      snake2: newSnake2,
      direction1: dir1,
      direction2: dir2,
      food: newFood,
      foodCounter: newFoodCounter,
      gameOver: state.gameOver,
      winner: state.winner
    }
  }, [checkWallCollision, checkSelfCollision, checkSnakeCollision, checkHeadToHeadCollision])


  const moveSnakes = useCallback(() => {
    if (gameOverRef.current) return
    
    // Prevent game from running if seed is invalid
    const cleanSeed = editedSeedRef.current.replace(/\n/g, '').trim()
    if (cleanSeed !== '') {
      try {
        BigInt(cleanSeed)
      } catch (e) {
        return // Invalid seed, stop game
      }
    }

    const dir1 = direction1Ref.current
    const dir2 = direction2Ref.current
    const currentTick = tickRef.current

    // Skip if neither player has moved (game hasn't started)
    if (dir1.x === 0 && dir1.y === 0 && dir2.x === 0 && dir2.y === 0) {
      return
    }

    // Log moves for this tick
    const p1Move = directionToLetter(dir1)
    const p2Move = directionToLetter(dir2)
    
    // Apply the move immediately for live gameplay
    // Create new arrays to avoid reference sharing
    const currentState: GameState = {
      snake1: [...snake1Ref.current],
      snake2: [...snake2Ref.current],
      direction1: dir1,
      direction2: dir2,
      food: { ...foodRef.current },
      foodCounter: foodCounter,
      gameOver: false,
      winner: null
    }
    // Use edited seed if available, otherwise use on-chain seed
    let seedToUse: bigint | undefined = randomSeedRef.current
    if (editedSeedRef.current !== '') {
      try {
        seedToUse = BigInt(editedSeedRef.current)
      } catch (e) {
        // Invalid seed, fall back to on-chain seed
        seedToUse = randomSeedRef.current
      }
    }
    const newState = applyMove(currentState, p1Move, p2Move, currentTick, seedToUse)
    
    // Check if food was eaten (snake length increased or food position changed)
    const p1LengthIncreased = newState.snake1.length > currentState.snake1.length
    const p2LengthIncreased = newState.snake2.length > currentState.snake2.length
    const foodWasEaten = p1LengthIncreased || p2LengthIncreased || 
                        (newState.food.x !== currentState.food.x || newState.food.y !== currentState.food.y)
    
    if (foodWasEaten && munchAudioRef.current) {
      munchAudioRef.current.currentTime = 0
      munchAudioRef.current.play().catch(err => {
        console.error('Error playing munch sound:', err)
      })
    }
    
    const newMove: MoveLog = [currentTick, p1Move, p2Move]
    // Update both player move logs with the same move (consensus - both see the same moves)
    setPlayer1MoveLog(prev => [...prev, newMove])
    setPlayer2MoveLog(prev => [...prev, newMove])
    // Also update original move log if this is a new move (not a replay)
    setOriginalMoveLog(prevOriginal => {
      // Only add if this tick doesn't exist in original (i.e., it's a new move, not a replay)
      if (!prevOriginal.find(([t]) => t === currentTick)) {
        return [...prevOriginal, newMove]
      }
      return prevOriginal
    })
      
      // Update state - scores are derived from snake lengths
      setSnake1(newState.snake1)
      setSnake2(newState.snake2)
      setDirection1(newState.direction1)
      setDirection2(newState.direction2)
      setFood(newState.food)
      setFoodCounter(newState.foodCounter)
      if (newState.gameOver) {
        setGameOver(true)
        setWinner(newState.winner)
        // Play boom sound when player dies
        if (boomAudioRef.current) {
          boomAudioRef.current.currentTime = 0
          boomAudioRef.current.play().catch(err => {
            console.error('Error playing boom sound:', err)
          })
        }
        // Trigger explosion animation for losing snake(s)
        if (newState.winner === 1) {
          setExplodingSnake2(true) // Player 2 loses
        } else if (newState.winner === 2) {
          setExplodingSnake1(true) // Player 1 loses
        } else {
          // Both died (tie) - explode both
          setExplodingSnake1(true)
          setExplodingSnake2(true)
        }
        // Show game over screen after explosion animation (2 seconds)
        setTimeout(() => {
          setShowGameOverScreen(true)
        }, 2000)
      }
    
    setTick(prev => prev + 1)
  }, [applyMove, foodCounter])

  useEffect(() => {
    if (gameOver || !gameStarted) return
    // Prevent game from running if seed is invalid
    const cleanSeed = editedSeed.replace(/\n/g, '').trim()
    let seedInvalid = false
    if (cleanSeed !== '') {
      try {
        BigInt(cleanSeed)
      } catch (e) {
        seedInvalid = true
      }
    }
    if (seedInvalid) return

    const gameInterval = setInterval(moveSnakes, GAME_SPEED)
    return () => clearInterval(gameInterval)
  }, [moveSnakes, gameOver, gameStarted, editedSeed])

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (gameOver) return
    
    // Check if seed is invalid using ref to avoid dependency issues
    const cleanSeed = editedSeedRef.current.replace(/\n/g, '').trim()
    let seedInvalid = false
    if (cleanSeed !== '') {
      try {
        BigInt(cleanSeed)
      } catch (e) {
        seedInvalid = true
      }
    }
    if (seedInvalid) return // Prevent game from starting with invalid seed

    let moved = false

    // Player 1 controls (WASD)
    switch (e.key.toLowerCase()) {
      case 'w':
        if (direction1.y === 0) {
          setDirection1({ x: 0, y: -1 })
          moved = true
        }
        break
      case 's':
        if (direction1.y === 0) {
          setDirection1({ x: 0, y: 1 })
          moved = true
        }
        break
      case 'a':
        if (direction1.x === 0) {
          setDirection1({ x: -1, y: 0 })
          moved = true
        }
        break
      case 'd':
        if (direction1.x === 0) {
          setDirection1({ x: 1, y: 0 })
          moved = true
        }
        break
    }

    // Player 2 controls (Arrow keys)
    if (!moved) {
      switch (e.key) {
        case 'ArrowUp':
          if (direction2.y === 0) {
            setDirection2({ x: 0, y: -1 })
            moved = true
          }
          break
        case 'ArrowDown':
          if (direction2.y === 0) {
            setDirection2({ x: 0, y: 1 })
            moved = true
          }
          break
        case 'ArrowLeft':
          if (direction2.x === 0) {
            setDirection2({ x: -1, y: 0 })
            moved = true
          }
          break
        case 'ArrowRight':
          if (direction2.x === 0) {
            setDirection2({ x: 1, y: 0 })
            moved = true
          }
          break
      }
    }

    // Start the game and increment tick when first move is made
    if (moved && !gameStarted) {
      setGameStarted(true)
      setTick(0) // Start at tick 0
    }
  }, [direction1, direction2, gameOver, gameStarted])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleKeyPress])

  const resetGame = () => {
    setSnake1(INITIAL_SNAKE_1)
    setSnake2(INITIAL_SNAKE_2)
    setDirection1(INITIAL_DIRECTION_1)
    setDirection2(INITIAL_DIRECTION_2)
    setFood({ x: 10, y: 10 })
    setFoodCounter(0)
    setGameOver(false)
    setWinner(null)
    setTick(0)
    setPlayer1MoveLog([])
    setPlayer2MoveLog([])
    setOriginalMoveLog([])
    setModifiedMoves(new Set())
    setEditingMove(null)
    setGameStarted(false)
    setExplodingSnake1(false)
    setExplodingSnake2(false)
    setShowGameOverScreen(false)
    setShowPayoutModal(false)
    setPayoutStep(0)
    setPayoutHash(null)
    // Stop soundtrack
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  // Calculate consensus outcome (matches contract logic)
  const calculateConsensus = () => {
    if (!winner) return null
    
    const p1winner = winner === 1
    const p2winner = winner === 2
    const serverwinner = winner === 1 // Server votes for actual winner
    
    // Count votes for player 1
    let votesForP1 = 0
    if (p1winner) votesForP1++
    if (p2winner) votesForP1++
    if (serverwinner) votesForP1++
    
    const p1Wins = votesForP1 >= 2
    const winningPlayer = p1Wins ? 1 : 2
    
    // Check which hashes match server (truth)
    const p1MatchesServer = player1GameHash === serverHash
    const p2MatchesServer = player2GameHash === serverHash
    
    // Check if player hashes match each other
    const playerHashesMatch = player1GameHash === player2GameHash
    
    // Collect hashes from voters who voted for the winner
    const winnerHashes: string[] = []
    if (p1Wins) {
      if (p1winner) winnerHashes.push(player1GameHash)
      if (p2winner) winnerHashes.push(player2GameHash)
      if (serverwinner) winnerHashes.push(serverHash)
    } else {
      if (!p1winner) winnerHashes.push(player1GameHash)
      if (!p2winner) winnerHashes.push(player2GameHash)
      if (!serverwinner) winnerHashes.push(serverHash)
    }
    
    // Check if all winner hashes match
    const winnerHashesMatch = winnerHashes.length > 0 && winnerHashes.every(h => h === winnerHashes[0])
    
    if (winnerHashesMatch) {
      // Hashes match among voters - consensus achieved
      return { type: 'consensus', winner: winningPlayer, reason: 'hashes_verified' }
    } else {
      // Hashes don't match - need server arbitration
      if (p1MatchesServer && !p2MatchesServer) {
        return { type: 'server_arbitration', winner: 1, reason: 'p1_matches_server' }
      } else if (p2MatchesServer && !p1MatchesServer) {
        return { type: 'server_arbitration', winner: 2, reason: 'p2_matches_server' }
      } else if (!p1MatchesServer && !p2MatchesServer) {
        // Both edited
        return { type: 'no_consensus', winner: null, reason: 'both_edited' }
      } else {
        // Edge case - both match server but hashes don't match each other
        // Server will pick the one that matches
        return { type: 'server_arbitration', winner: p1MatchesServer ? 1 : 2, reason: p1MatchesServer ? 'p1_matches_server' : 'p2_matches_server' }
      }
    }
  }

  const handleMoveClick = useCallback((tick: number, player: 1 | 2) => {
    setEditingMove({ tick, player })
  }, [])

  const handleMoveSelect = useCallback((move: string | null) => {
    if (!editingMove) return

    const { tick, player } = editingMove
    // Find original move from originalMoveLog
    const originalMove = originalMoveLog.find(([t]) => t === tick)
    const originalPlayerMove = originalMove 
      ? (player === 1 ? originalMove[1] : originalMove[2])
      : null
    
    // Check if move is actually different from original
    const moveKey = `${tick}-${player}`
    setModifiedMoves(prevModified => {
      const newSet = new Set(prevModified)
      if (move !== originalPlayerMove) {
        newSet.add(moveKey)
      } else {
        newSet.delete(moveKey)
      }
      return newSet
    })

    // Only update the move log for the player who is editing (consensus simulation)
    if (player === 1) {
      setPlayer1MoveLog(prev => prev.map(([t, p1, p2]) => {
        if (t === tick) {
          return [t, move, p2] as MoveLog
        }
        return [t, p1, p2] as MoveLog
      }))
    } else {
      setPlayer2MoveLog(prev => prev.map(([t, p1, p2]) => {
        if (t === tick) {
          return [t, p1, move] as MoveLog
        }
        return [t, p1, p2] as MoveLog
      }))
    }
    setEditingMove(null)
  }, [editingMove, originalMoveLog])

  // Calculate separate game hashes for each player (consensus simulation)
  const player1GameHash = hashMoves(player1MoveLog)
  const player2GameHash = hashMoves(player2MoveLog)
  // Server hash is the unmodified truth (from originalMoveLog)
  const serverHash = hashMoves(originalMoveLog)

  const currentEditingMove = editingMove 
    ? (editingMove.player === 1 
        ? (player1MoveLog.find(([t]) => t === editingMove.tick)?.[1] ?? null)
        : (player2MoveLog.find(([t]) => t === editingMove.tick)?.[2] ?? null))
    : null

  // Wager screen handlers
  const handleApprove = () => {
    if (!usdcAddress || !contractAddress) return
    // Approve a large amount (max uint256) to avoid repeated approvals
    const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
    // @ts-expect-error - wagmi types are strict but this works at runtime
    writeContractApprove({
      address: usdcAddress,
      abi: usdcAbi as any,
      functionName: 'approve',
      args: [contractAddress, maxApproval] as const,
    })
  }

  const handleWagerPlayer1 = () => {
    if (!contractAddress) return
    // Only require feeV2 for chainId 84532
    if (chainId === 84532 && !feeV2) return
    // @ts-expect-error - wagmi types are strict but this works at runtime
    writeContractWager({
      address: contractAddress,
      abi: abi as any,
      functionName: 'wagerPlayer1',
      args: [],
      value: chainId === 84532 ? feeV2 : 0n,
    })
  }

  const handleWagerPlayer2 = () => {
    if (!contractAddress) return
    // Only require feeV2 for chainId 84532
    if (chainId === 84532 && !feeV2) return
    // @ts-expect-error - wagmi types are strict but this works at runtime
    writeContractWager({
      address: contractAddress,
      abi: abi as any,
      functionName: 'wagerPlayer2',
      args: [],
      value: chainId === 84532 ? feeV2 : 0n,
    })
  }

  // Check if allowance is sufficient
  const allowanceAmount = allowance ? BigInt(allowance.toString()) : 0n
  const wagerAmountNeeded = contractWagerAmount ? BigInt(contractWagerAmount.toString()) : wagerAmountWei
  const hasEnoughAllowance = allowanceAmount >= wagerAmountNeeded

  // Format wager amount for display
  const wagerDisplay = contractWagerAmount 
    ? (Number(contractWagerAmount) / 1e6).toFixed(2)
    : wagerAmountStr
  
  // Calculate prize amount (wager * 2)
  const prizeAmount = contractWagerAmount 
    ? (Number(contractWagerAmount) * 2 / 1e6).toFixed(2)
    : (parseFloat(wagerAmountStr) * 2).toFixed(2)

  // Calculate new balances based on consensus outcome
  const calculateNewBalances = () => {
    const consensus = calculateConsensus()
    if (!consensus) return { p1: oldPlayer1Balance, p2: oldPlayer2Balance }
    
    const oldP1 = parseFloat(oldPlayer1Balance)
    const oldP2 = parseFloat(oldPlayer2Balance)
    const prize = parseFloat(prizeAmount)
    const wager = parseFloat(wagerDisplay)
    
    if (consensus.type === 'consensus' || consensus.type === 'server_arbitration') {
      // Winner gets the full pot
      if (consensus.winner === 1) {
        return { p1: (oldP1 + prize).toFixed(2), p2: oldPlayer2Balance }
      } else {
        return { p1: oldPlayer1Balance, p2: (oldP2 + prize).toFixed(2) }
      }
    } else if (consensus.type === 'no_consensus') {
      // Both get their wager back
      return { 
        p1: (oldP1 + wager).toFixed(2), 
        p2: (oldP2 + wager).toFixed(2) 
      }
    }
    
    return { p1: oldPlayer1Balance, p2: oldPlayer2Balance }
  }

  // Convert hashes to bytes32 format
  const hashToBytes32 = (hash: string): `0x${string}` => {
    // Hash is hex string without 0x, pad to 64 chars (32 bytes) and add 0x
    const padded = hash.padStart(64, '0')
    return `0x${padded}` as `0x${string}`
  }

  // Handle claim prize
  const handleClaimPrize = () => {
    if (!contractAddress || !winner) return
    
    // Store old balances before payout
    setOldPlayer1Balance(player1BalanceDisplay)
    setOldPlayer2Balance(player2BalanceDisplay)
    
    // Determine winner votes
    const p1winner = winner === 1
    const p2winner = winner === 2
    const serverwinner = winner === 1 // Server always votes for actual winner
    
    // Convert hashes to bytes32
    const p1hashBytes = hashToBytes32(player1GameHash)
    const p2hashBytes = hashToBytes32(player2GameHash)
    const serverhashBytes = hashToBytes32(serverHash)
    
    setShowPayoutModal(true)
    setPayoutStep(0)
    setPayoutHash(null)
    setShowBalanceAnimation(false)
    
    // @ts-expect-error - wagmi types are strict but this works at runtime
    writeContractPayout({
      address: contractAddress,
      abi: abi as any,
      functionName: 'chooseWinner',
      args: [p1hashBytes, p2hashBytes, serverhashBytes, p1winner, p2winner, serverwinner],
    })
  }

  // Trigger confetti on win
  useEffect(() => {
    if (gameOver && winner && showGameOverScreen) {
      const duration = 3000
      const animationEnd = Date.now() + duration
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min
      }

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now()

        if (timeLeft <= 0) {
          return clearInterval(interval)
        }

        const particleCount = 50 * (timeLeft / duration)
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.9), y: Math.random() - 0.2 }
        })
      }, 250)
    }
  }, [gameOver, winner, showGameOverScreen])

  // Handle payout transaction confirmation and step progression
  useEffect(() => {
    if (payoutTxHash) {
      setPayoutHash(payoutTxHash)
      // Move to step 1 after transaction is submitted
      setTimeout(() => setPayoutStep(1), 500)
    }
  }, [payoutTxHash])

  useEffect(() => {
    if (payoutHash && payoutStep === 1) {
      // Show hashes, then move to consensus check
      setTimeout(() => setPayoutStep(2), 1500)
    }
  }, [payoutHash, payoutStep])

  useEffect(() => {
    if (payoutStep === 2) {
      const consensus = calculateConsensus()
      if (consensus?.type === 'server_arbitration') {
        // Show server arbitration step, then move to waiting
        setTimeout(() => setPayoutStep(3), 2000)
      } else {
        // Move to waiting for confirmation
        setTimeout(() => setPayoutStep(3), 2000)
      }
    }
  }, [payoutStep])

  useEffect(() => {
    if (isPayoutConfirmed && showPayoutModal) {
      // Wait a bit then show final step
      setTimeout(() => {
        setPayoutStep(4)
      }, 500)
    }
  }, [isPayoutConfirmed, showPayoutModal])

  // Show wager screen if both players are not ready (but not if payout modal is open)
  if (!bothPlayersReady && contractAddress && !showPayoutModal) {
    return (
      <div className="game-container">
        <header className="app-header">
          <div className="app-header-logo">
            SlitherMoney
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flex: 1,
            gap: '8px'
          }}>
          </div>
          <div>
            <ConnectButton />
          </div>
        </header>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          gap: '20px',
          padding: '40px'
        }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', color: '#fff' }}>Place Your Wager</h1>
          
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: '30px',
            borderRadius: '12px',
            border: '2px solid #4CAF50',
            minWidth: '400px',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '20px', color: '#fff' }}>
              <p style={{ fontSize: '18px', marginBottom: '10px' }}>Wager Amount:</p>
              <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#4CAF50' }}>${wagerDisplay} USDC</p>
            </div>

            {!walletAddress ? (
              <div style={{ color: '#888', marginTop: '20px' }}>
                <p>Please connect your wallet to continue</p>
              </div>
            ) : !hasEnoughAllowance ? (
              <div>
                <p style={{ color: '#ff9800', marginBottom: '20px' }}>
                  Insufficient USDC allowance. Please approve first.
                </p>
                <button
                  onClick={handleApprove}
                  disabled={isApproving || isApprovingConfirming}
                  style={{
                    padding: '15px 30px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    backgroundColor: isApproving || isApprovingConfirming ? '#666' : '#4CAF50',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isApproving || isApprovingConfirming ? 'not-allowed' : 'pointer',
                    minWidth: '200px'
                  }}
                >
                  {isApproving || isApprovingConfirming ? 'Approving...' : 'Approve USDC'}
                </button>
                {isApproved && (
                  <p style={{ color: '#4CAF50', marginTop: '10px' }}>Approval confirmed!</p>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <button
                  onClick={handleWagerPlayer1}
                  disabled={player1Ready === true || isWagering || isWagerConfirming}
                  style={{
                    padding: '15px 30px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    backgroundColor: player1Ready === true || isWagering || isWagerConfirming ? '#666' : '#2196F3',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: player1Ready === true || isWagering || isWagerConfirming ? 'not-allowed' : 'pointer'
                  }}
                >
                  {player1Ready === true 
                    ? 'Player 1 Ready ✓' 
                    : isWagering || isWagerConfirming 
                    ? 'Wagering...' 
                    : 'Wager as Player 1'}
                </button>
                <button
                  onClick={handleWagerPlayer2}
                  disabled={player2Ready === true || isWagering || isWagerConfirming}
                  style={{
                    padding: '15px 30px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    backgroundColor: player2Ready === true || isWagering || isWagerConfirming ? '#666' : '#FF9800',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: player2Ready === true || isWagering || isWagerConfirming ? 'not-allowed' : 'pointer'
                  }}
                >
                  {player2Ready === true 
                    ? 'Player 2 Ready ✓' 
                    : isWagering || isWagerConfirming 
                    ? 'Wagering...' 
                    : 'Wager as Player 2'}
                </button>
                {isWagered && (
                  <p style={{ color: '#4CAF50', marginTop: '10px' }}>Wager confirmed!</p>
                )}
              </div>
            )}

            <div style={{ marginTop: '30px', color: '#888', fontSize: '14px' }}>
              <p>Player 1 Status: {player1Ready === true ? '✓ Ready' : '⏳ Waiting'}</p>
              <p>Player 2 Status: {player2Ready === true ? '✓ Ready' : '⏳ Waiting'}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="game-container">
      <header className="app-header">
        <div className="app-header-logo">
          SlitherMoney
        </div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flex: 1,
          gap: '8px'
        }}>
          <div style={{ fontFamily: 'monospace', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{(chainId === 84532 || chainId === 8453) ? 'pyth seed:' : 'flare seed:'}</span>
            <textarea
              ref={seedTextareaRef}
              value={displaySeed}
              onChange={handleSeedChange}
              onBlur={handleSeedSave}
              readOnly={!isEditingSeed}
              onKeyDown={(e) => {
                if (e.key === 'Escape') handleSeedRevert()
              }}
              style={{
                fontFamily: 'monospace',
                fontSize: '12px',
                padding: '0',
                border: 'none',
                borderBottom: '1px solid #666',
                borderRadius: '0',
                width: '240px', // Shorter width for better display
                height: `${Math.ceil((activeSeed.replace(/\n/g, '').length || 1) / 30) * 14.4}px`, // 14.4px per line (12px font * 1.2 line-height)
                backgroundColor: 'transparent',
                color: isSeedEdited ? '#ff4444' : '#888',
                outline: 'none',
                caretColor: '#666',
                resize: 'none',
                overflow: 'hidden',
                whiteSpace: 'pre',
                lineHeight: '1.2',
                overflowWrap: 'normal',
                wordBreak: 'normal',
                verticalAlign: 'top',
                cursor: isEditingSeed ? 'text' : 'default'
              }}
              wrap="off"
            />
          </div>
          {!isEditingSeed ? (
            <button
              onClick={handleSeedEdit}
              style={{
                fontFamily: 'monospace',
                fontSize: '11px',
                padding: '4px 8px',
                border: '1px solid #666',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                color: '#666',
                cursor: 'pointer',
                minWidth: '60px'
              }}
            >
              edit
            </button>
          ) : (
            <button
              onClick={handleSeedRevert}
              style={{
                fontFamily: 'monospace',
                fontSize: '11px',
                padding: '4px 8px',
                border: '1px solid #ff4444',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                color: '#ff4444',
                cursor: 'pointer',
                minWidth: '60px'
              }}
            >
              revert
            </button>
          )}
        </div>
        <div>
          <ConnectButton />
        </div>
      </header>
      {editingMove && (
        <MoveSelector
          currentMove={currentEditingMove}
          onSelect={handleMoveSelect}
          onClose={() => setEditingMove(null)}
        />
      )}

      <div className="game-layout">
        {/* Left: Player 1 Moves */}
        <div className="move-panel">
          <div className="game-board-header">
            <div className="board-header-left">Player 1</div>
            <div className="board-header-center" style={{ fontSize: '14px', color: '#888' }}>
              {player1BalanceDisplay} USDC
            </div>
            <div className="board-header-right">Length: {snake1.length}</div>
          </div>
          <div className="game-hash-container">
            <div className="game-hash-label">Game Hash = {player1GameHash}</div>
            <MoveVisualization 
              moves={player1MoveLog} 
              player={1} 
              gameOver={gameOver}
              modifiedMoves={modifiedMoves}
              onMoveClick={handleMoveClick}
              currentTick={tick}
            />
          </div>
        </div>

        {/* Center: Game Board */}
        <div className="game-center">
          <div className="game-board-title">First to 5 Wins</div>
          <div className={`game-board-wrapper ${showGameOverScreen || (!gameOver && isSeedInvalid) ? 'game-over-blur' : ''}`}>
            <div className="game-board">
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
                const x = index % GRID_SIZE
                const y = Math.floor(index / GRID_SIZE)
                const isSnake1 = snake1.some(segment => segment.x === x && segment.y === y)
                const isSnake2 = snake2.some(segment => segment.x === x && segment.y === y)
                const head1Index = snake1.findIndex(segment => segment.x === x && segment.y === y)
                const head2Index = snake2.findIndex(segment => segment.x === x && segment.y === y)
                const isHead1 = head1Index === 0
                const isHead2 = head2Index === 0
                const isTail1 = head1Index === snake1.length - 1 && snake1.length > 1
                const isTail2 = head2Index === snake2.length - 1 && snake2.length > 1
                const isFood = food.x === x && food.y === y
                const isExploding1 = explodingSnake1 && isSnake1
                const isExploding2 = explodingSnake2 && isSnake2
                
                // Get direction for head/tail styling
                // For head: use movement direction (curve the front)
                // For tail: use direction from body to tail (curve the back)
                const head1Dir = isHead1 ? direction1 : null
                const head2Dir = isHead2 ? direction2 : null
                const tail1Dir = isTail1 && snake1.length > 1
                  ? { x: snake1[snake1.length - 1].x - snake1[snake1.length - 2].x, y: snake1[snake1.length - 1].y - snake1[snake1.length - 2].y }
                  : null
                const tail2Dir = isTail2 && snake2.length > 1
                  ? { x: snake2[snake2.length - 1].x - snake2[snake2.length - 2].x, y: snake2[snake2.length - 1].y - snake2[snake2.length - 2].y }
                  : null

                // Helper to get border radius based on direction
                const getHeadBorderRadius = (dir: Position | null) => {
                  if (!dir || (dir.x === 0 && dir.y === 0)) return undefined
                  if (dir.x > 0) return '0 50% 50% 0' // Moving right - curve right
                  if (dir.x < 0) return '50% 0 0 50%' // Moving left - curve left
                  if (dir.y > 0) return '0 0 50% 50%' // Moving down - curve bottom
                  if (dir.y < 0) return '50% 50% 0 0' // Moving up - curve top
                  return undefined
                }

                const getTailBorderRadius = (dir: Position | null) => {
                  if (!dir || (dir.x === 0 && dir.y === 0)) return undefined
                  // Curve the end of the tail (the side pointing away from body), keep connection square
                  if (dir.x > 0) return '0 50% 50% 0' // Tail pointing right - curve right (end)
                  if (dir.x < 0) return '50% 0 0 50%' // Tail pointing left - curve left (end)
                  if (dir.y > 0) return '0 0 50% 50%' // Tail pointing down - curve bottom (end)
                  if (dir.y < 0) return '50% 50% 0 0' // Tail pointing up - curve top (end)
                  return undefined
                }

                // Generate random particle directions for explosion
                const particleAngle1 = isExploding1 || isExploding2 ? Math.random() * Math.PI * 2 : 0
                const particleAngle2 = isExploding1 || isExploding2 ? Math.random() * Math.PI * 2 : 0
                const particleDistance = 30 + Math.random() * 20
                
                return (
                <div
                  key={index}
                  className={`cell ${isHead1 ? 'head1' : ''} ${isHead2 ? 'head2' : ''} ${isSnake1 ? 'snake1' : ''} ${isSnake2 ? 'snake2' : ''} ${isTail1 ? 'tail1' : ''} ${isTail2 ? 'tail2' : ''} ${isFood ? 'food' : ''} ${isExploding1 ? 'exploding' : ''} ${isExploding2 ? 'exploding' : ''}`}
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    ...(isHead1 && head1Dir ? { borderRadius: getHeadBorderRadius(head1Dir) } : {}),
                    ...(isHead2 && head2Dir ? { borderRadius: getHeadBorderRadius(head2Dir) } : {}),
                    ...(isTail1 && tail1Dir ? { borderRadius: getTailBorderRadius(tail1Dir) } : {}),
                    ...(isTail2 && tail2Dir ? { borderRadius: getTailBorderRadius(tail2Dir) } : {}),
                    ...(isExploding1 || isExploding2 ? {
                      '--particle-x-1': `${Math.cos(particleAngle1) * particleDistance}px`,
                      '--particle-y-1': `${Math.sin(particleAngle1) * particleDistance}px`,
                      '--particle-x-2': `${Math.cos(particleAngle2) * particleDistance}px`,
                      '--particle-y-2': `${Math.sin(particleAngle2) * particleDistance}px`
                    } : {})
                  } as React.CSSProperties}
                >
                  {isHead1 && (
                    <GooglyEyes direction={direction1} player={1} />
                  )}
                  {isHead2 && (
                    <GooglyEyes direction={direction2} player={2} />
                  )}
                </div>
                )
              })}
            </div>
            {gameOver && showGameOverScreen && !showPayoutModal && (
              <div className="game-over-overlay-board">
                <div className="game-over-content">
                  {winner === null ? (
                    <h2>It's a Tie!</h2>
                  ) : (
                    <h2>Player {winner} Wins!</h2>
                  )}
                  {winner && (
                    <button onClick={handleClaimPrize} disabled={isPayingOut || isPayoutConfirming}>
                      {isPayingOut || isPayoutConfirming ? 'Processing...' : `Claim Prize: ${prizeAmount} USDC`}
                    </button>
                  )}
                </div>
              </div>
            )}
            {!gameOver && isSeedInvalid && (
              <div className="game-over-overlay-board">
                <div className="game-over-content">
                  <h2>Invalid Seed</h2>
                  <p style={{ margin: '10px 0 20px 0', color: '#888' }}>The seed must be a valid number</p>
                  <button onClick={handleSeedRevert}>Revert</button>
                </div>
              </div>
            )}
          </div>

          <div className="instructions">
            <p><strong>Player 1:</strong> WASD keys | <strong>Player 2:</strong> Arrow keys</p>
            <p>Press a key to start moving! Last snake standing wins!</p>
          </div>
        </div>

        {/* Right: Player 2 Moves */}
        <div className="move-panel">
          <div className="game-board-header">
            <div className="board-header-left">Player 2</div>
            <div className="board-header-center" style={{ fontSize: '14px', color: '#888' }}>
              {player2BalanceDisplay} USDC
            </div>
            <div className="board-header-right">Length: {snake2.length}</div>
          </div>
          <div className="game-hash-container">
            <div className="game-hash-label">Game Hash = {player2GameHash}</div>
            <MoveVisualization 
              moves={player2MoveLog} 
              player={2} 
              gameOver={gameOver}
              modifiedMoves={modifiedMoves}
              onMoveClick={handleMoveClick}
              currentTick={tick}
            />
          </div>
        </div>
      </div>

      {/* Payout Modal */}
      {showPayoutModal && gameOver && winner && (() => {
        const newBalances = calculateNewBalances()
        const finalP1Balance = player1BalanceDisplay || newBalances.p1
        const finalP2Balance = player2BalanceDisplay || newBalances.p2
        const shouldAnimate = payoutStep >= 4 && isPayoutConfirmed
        
        // Only show balance for the consensus winning player (not for no_consensus)
        const consensus = calculateConsensus()
        const winningPlayer = consensus && consensus.type !== 'no_consensus' ? consensus.winner : null
        
        return (
          <div className="payout-modal-overlay">
            {/* Floating Balance Animation - Only for winning player */}
            {winningPlayer === 1 && (
              <div className="floating-balance-left">
                <BalanceAnimation
                  player={1}
                  oldBalance={oldPlayer1Balance}
                  newBalance={finalP1Balance}
                  isAnimating={shouldAnimate}
                />
              </div>
            )}
            {winningPlayer === 2 && (
              <div className="floating-balance-right">
                <BalanceAnimation
                  player={2}
                  oldBalance={oldPlayer2Balance}
                  newBalance={finalP2Balance}
                  isAnimating={shouldAnimate}
                />
              </div>
            )}
            
            <div className="payout-modal">
              <h2 style={{ marginBottom: '30px', color: '#4CAF50' }}>Consensus Verification</h2>
              
              {(() => {
              const consensus = calculateConsensus()
              const steps = []
              
              // Step 0: Submitting transaction
              if (payoutStep === 0) {
                steps.push(
                  <div key="step0" className="payout-step">
                    <div className="spinner"></div>
                    <p>Submitting transaction to blockchain...</p>
                    {payoutHash && (
                      <p style={{ fontSize: '12px', color: '#888', marginTop: '10px' }}>
                        Hash: {payoutHash.slice(0, 10)}...
                      </p>
                    )}
                  </div>
                )
              }
              
              // Step 1: Show hashes
              if (payoutStep >= 1) {
                steps.push(
                  <div key="step1" className="payout-step">
                    <h3>Game State Hashes ({(chainId === 84532 || chainId === 8453) ? 'Pyth' : 'Flare'} Seed + Player Input Log)</h3>
                    <div className="hash-list">
                      <div className="hash-item">
                        <span className="hash-label">Player 1 Hash:</span>
                        <span className="hash-value">{player1GameHash}</span>
                        {player1GameHash !== serverHash && (
                          <span className="hash-warning">⚠ Modified</span>
                        )}
                      </div>
                      <div className="hash-item">
                        <span className="hash-label">Player 2 Hash:</span>
                        <span className="hash-value">{player2GameHash}</span>
                        {player2GameHash !== serverHash && (
                          <span className="hash-warning">⚠ Modified</span>
                        )}
                      </div>
                      <div className="hash-item">
                        <span className="hash-label">Server Hash (Truth):</span>
                        <span className="hash-value">{serverHash}</span>
                        <span className="hash-verified">✓ Unmodified</span>
                      </div>
                    </div>
                  </div>
                )
              }
              
              // Step 2: Check consensus
              if (payoutStep >= 2 && consensus) {
                if (consensus.type === 'consensus' && consensus.reason === 'hashes_verified') {
                  steps.push(
                    <div key="step2" className="payout-step success">
                      <div className="checkmark">✓</div>
                      <h3>Hashes Verified</h3>
                      <p>Player 1 and Player 2 hashes match and align with server.</p>
                      <p style={{ marginTop: '15px', fontSize: '18px', fontWeight: 'bold', color: '#4CAF50' }}>
                        Paying out {prizeAmount} USDC to Player {consensus.winner}
                      </p>
                    </div>
                  )
                } else if (consensus.type === 'server_arbitration') {
                  steps.push(
                    <div key="step2" className="payout-step warning">
                      <div className="warning-icon">⚠</div>
                      <h3>Hash Mismatch</h3>
                      <p>Player hashes don't match. Consulting server...</p>
                    </div>
                  )
                  
                  if (payoutStep >= 3) {
                    steps.push(
                      <div key="step3" className="payout-step success">
                        <div className="checkmark">✓</div>
                        <h3>Server Arbitration</h3>
                        <p>
                          Server matches with Player {consensus.reason === 'p1_matches_server' ? '1' : '2'} (unmodified hash)
                        </p>
                        <p style={{ marginTop: '15px', fontSize: '18px', fontWeight: 'bold', color: '#4CAF50' }}>
                          Paying out {prizeAmount} USDC to Player {consensus.winner}
                        </p>
                      </div>
                    )
                  }
                } else if (consensus.type === 'no_consensus') {
                  steps.push(
                    <div key="step2" className="payout-step error">
                      <div className="error-icon">✗</div>
                      <h3>No Consensus</h3>
                      <p>Both players have modified their hashes. No consensus possible.</p>
                      <p style={{ marginTop: '15px', fontSize: '18px', fontWeight: 'bold', color: '#ff9800' }}>
                        Returning wager amounts to both players
                      </p>
                    </div>
                  )
                }
              }
              
              // Step 3: Waiting for confirmation (after consensus result shown)
              if (payoutStep === 3 && !isPayoutConfirmed) {
                const consensus = calculateConsensus()
                // Only show waiting if we've already shown the consensus result
                if (consensus && (consensus.type === 'consensus' || consensus.type === 'no_consensus' || consensus.type === 'server_arbitration')) {
                  // If server arbitration, we already showed it, now show waiting
                  if (consensus.type === 'server_arbitration') {
                    // Server arbitration was shown, now waiting
                    steps.push(
                      <div key="step3-wait" className="payout-step">
                        <div className="spinner"></div>
                        <p>Waiting for transaction confirmation...</p>
                      </div>
                    )
                  } else {
                    // Consensus or no consensus - show waiting
                    steps.push(
                      <div key="step3-wait" className="payout-step">
                        <div className="spinner"></div>
                        <p>Waiting for transaction confirmation...</p>
                      </div>
                    )
                  }
                }
              }
              
              // Step 4: Transaction confirmed
              if (payoutStep >= 4 && isPayoutConfirmed) {
                steps.push(
                  <div key="step4" className="payout-step success">
                    <div className="checkmark">✓</div>
                    <h3>Transaction Confirmed</h3>
                    <p>Payout has been processed on-chain.</p>
                    <p style={{ marginTop: '15px', fontSize: '14px', color: '#888' }}>
                      Check the balance changes on the sides!
                    </p>
                    
                    <button 
                      onClick={() => {
                        resetGame()
                      }}
                      style={{
                        marginTop: '30px',
                        padding: '12px 30px',
                        fontSize: '1.1rem',
                        backgroundColor: '#4CAF50',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      Play Another Game
                    </button>
                  </div>
                )
              }
              
              return <div className="payout-steps">{steps}</div>
            })()}
          </div>
        </div>
        )
      })()}
    </div>
  )
}

export default App
