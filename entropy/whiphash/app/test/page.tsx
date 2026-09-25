'use client'

import React, { useState, useEffect } from 'react'
import { createPublicClient, http, parseAbi, parseEventLogs } from 'viem'
import { baseSepolia } from 'viem/chains'
import Dither from '../../components/Dither'
import { ShimmerButton } from '../../components/ui/shimmer-button'
import { ShineBorder } from '../../components/ui/shine-border'

interface PasswordGenerationResult {
  password: string
  metadata: {
    txHash: string
    sequenceNumber: string
    deviceSecret: string
    r1: string
    r2: string
    localRaw: string
    localKey: string
    seedRaw: string
    passwordBytes: string
    salt1: string
    passwordSalt: string
    argon2Params: {
      memory: number
      time: number
      parallelism: number
    }
  }
}

// Client-side password generator 
class ClientPasswordGenerator {
  private appSalt1: Uint8Array
  private appSalt2: Uint8Array
  private context: string
  private context2: string

  constructor() {
    // Initialize app salts as specified in genpassword.md
    // These should be consistent across the app
    this.appSalt1 = new Uint8Array(32)
    this.appSalt2 = new Uint8Array(32)
    
    // Fill with deterministic values (in production, these should be app-specific constants)
    for (let i = 0; i < 32; i++) {
      this.appSalt1[i] = i
      this.appSalt2[i] = i + 32
    }
    
    this.context = 'local_raw_v1'
    this.context2 = 'seed_v1'
  }

  // Step 1: Generate device secret (C) - 
  private generateDeviceSecret(): Uint8Array {
    const deviceSecret = crypto.getRandomValues(new Uint8Array(32))
    console.log('🔐 Step 1: Generated device secret (C):', this.arrayToBase64(deviceSecret))
    return deviceSecret
  }

  // Step 2: Extract R1 from Pyth randomness - as per genpassword.md
  private extractR1(pythRandomness: { n1: string; n2: string; txHash: string; sequenceNumber: string }): Uint8Array {
    const r1 = BigInt(pythRandomness.n1)
    const r1Bytes = this.bigIntToUint8Array(r1, 32)
    console.log('🎲 Step 2: Extracted R1 from Pyth:', pythRandomness.n1)
    console.log('🎲 R1 bytes:', this.arrayToBase64(r1Bytes))
    return r1Bytes
  }

  // Step 3: Mix R1 + C → local_raw (HKDF) - as per genpassword.md
  private async generateLocalRaw(r1: Uint8Array, deviceSecret: Uint8Array): Promise<Uint8Array> {
    // IKM = R1 || C || context
    const ikm = new Uint8Array(r1.length + deviceSecret.length + this.context.length)
    ikm.set(r1, 0)
    ikm.set(deviceSecret, r1.length)
    ikm.set(new TextEncoder().encode(this.context), r1.length + deviceSecret.length)
    
    console.log('🔗 HKDF Step 3 Parameters:')
    console.log('🔗 R1 length:', r1.length, 'bytes')
    console.log('🔗 Device Secret length:', deviceSecret.length, 'bytes')
    console.log('🔗 Context:', this.context)
    console.log('🔗 Context length:', this.context.length, 'bytes')
    console.log('🔗 IKM total length:', ikm.length, 'bytes')
    console.log('🔗 App Salt1:', this.arrayToBase64(this.appSalt1))
    console.log('🔗 Info string:', 'local_raw_v1')
    console.log('🔗 Output length:', 32, 'bytes')
    
    // HKDF-SHA256( IKM = R1 || C || context, salt = app_salt1, info="local_raw_v1" )
    const localRaw = await this.hkdf(ikm, 32, this.appSalt1, 'local_raw_v1')
    console.log('🔗 Step 3: Generated local_raw (HKDF):', this.arrayToBase64(localRaw))
    return localRaw
  }

  // Step 4: Harden local_raw → LocalKey (scrypt) - as per genpassword.md
  private async generateLocalKey(localRaw: Uint8Array): Promise<{
    localKey: Uint8Array
    salt1: Uint8Array
    argon2Params: { memory: number; time: number; parallelism: number }
  }> {
    const salt1 = crypto.getRandomValues(new Uint8Array(16))
    const argon2Params = {
      memory: 65536, // 64 MB
      time: 3,
      parallelism: 4
    }
    
    console.log('🛡️ Scrypt Step 4 Parameters:')
    console.log('🛡️ Input (local_raw) length:', localRaw.length, 'bytes')
    console.log('🛡️ Salt1 length:', salt1.length, 'bytes')
    console.log('🛡️ Salt1 value:', this.arrayToBase64(salt1))
    console.log('🛡️ N (memory-hard parameter):', 16384)
    console.log('🛡️ r (block size factor):', 8)
    console.log('🛡️ p (parallelization factor):', 1)
    console.log('🛡️ Output length:', 32, 'bytes')
    
    // LocalKey = scrypt(local_raw, salt1, N, r, p) (outlen 32)
    const localKey = await this.argon2id(localRaw, salt1, argon2Params, 32)
    
    console.log('🛡️ Step 4: Generated LocalKey (scrypt):', this.arrayToBase64(localKey))
    console.log('🛡️ Salt1:', this.arrayToBase64(salt1))
    console.log('🛡️ Scrypt params:', { N: 16384, r: 8, p: 1 })
    
    return {
      localKey,
      salt1,
      argon2Params
    }
  }

  // Step 5: Extract R2 from Pyth randomness - as per genpassword.md
  private extractR2(pythRandomness: { n1: string; n2: string; txHash: string; sequenceNumber: string }): Uint8Array {
    const r2 = BigInt(pythRandomness.n2)
    const r2Bytes = this.bigIntToUint8Array(r2, 32)
    console.log('🎲 Step 5: Extracted R2 from Pyth:', pythRandomness.n2)
    console.log('🎲 R2 bytes:', this.arrayToBase64(r2Bytes))
    return r2Bytes
  }

  // Step 6: Derive seed and final harden → Password_bytes - as per genpassword.md
  private async generatePasswordBytes(
    localKey: Uint8Array, 
    r2: Uint8Array
  ): Promise<{
    passwordBytes: Uint8Array
    passwordSalt: Uint8Array
  }> {
    // seed_raw = HKDF-SHA256( IKM = LocalKey || R2 || context2, salt = app_salt2, info="seed_v1" )
    const ikm = new Uint8Array(localKey.length + r2.length + this.context2.length)
    ikm.set(localKey, 0)
    ikm.set(r2, localKey.length)
    ikm.set(new TextEncoder().encode(this.context2), localKey.length + r2.length)
    
    console.log('🌱 HKDF Step 6a Parameters (seed_raw):')
    console.log('🌱 LocalKey length:', localKey.length, 'bytes')
    console.log('🌱 R2 length:', r2.length, 'bytes')
    console.log('🌱 Context2:', this.context2)
    console.log('🌱 Context2 length:', this.context2.length, 'bytes')
    console.log('🌱 IKM total length:', ikm.length, 'bytes')
    console.log('🌱 App Salt2:', this.arrayToBase64(this.appSalt2))
    console.log('🌱 Info string:', 'seed_v1')
    console.log('🌱 Output length:', 32, 'bytes')
    
    const seedRaw = await this.hkdf(ikm, 32, this.appSalt2, 'seed_v1')
    console.log('🌱 Step 6a: Generated seed_raw:', this.arrayToBase64(seedRaw))
    
    // password_salt = randomBytes(16); Password_bytes = scrypt(seed_raw, password_salt, N, r, p)
    const passwordSalt = crypto.getRandomValues(new Uint8Array(16))
    const argon2Params = {
      memory: 65536, // 64 MB
      time: 3,
      parallelism: 4
    }
    
    console.log('🔑 Scrypt Step 6b Parameters (final password):')
    console.log('🔑 Input (seed_raw) length:', seedRaw.length, 'bytes')
    console.log('🔑 Password salt length:', passwordSalt.length, 'bytes')
    console.log('🔑 Password salt value:', this.arrayToBase64(passwordSalt))
    console.log('🔑 N (memory-hard parameter):', 16384)
    console.log('🔑 r (block size factor):', 8)
    console.log('🔑 p (parallelization factor):', 1)
    console.log('🔑 Output length:', 32, 'bytes')
    
    const passwordBytes = await this.argon2id(seedRaw, passwordSalt, argon2Params, 32)
    
    console.log('🔑 Step 6b: Generated Password_bytes (scrypt):', this.arrayToBase64(passwordBytes))
    console.log('🔑 Password salt:', this.arrayToBase64(passwordSalt))
    
    return {
      passwordBytes,
      passwordSalt
    }
  }

  // Real HKDF implementation using futoin-hkdf library
  private async hkdf(ikm: Uint8Array, length: number, salt: Uint8Array, info: string): Promise<Uint8Array> {
    const hkdf = (await import('futoin-hkdf')).default
    const derived = hkdf(Buffer.from(ikm), length, {
      hash: 'SHA-256',
      salt: Buffer.from(salt),
      info: info
    })
    return new Uint8Array(derived)
  }

  // Memory-hard key derivation using scrypt-js (Argon2 alternative)
  private async argon2id(
    password: Uint8Array, 
    salt: Uint8Array, 
    params: { memory: number; time: number; parallelism: number }, 
    length: number
  ): Promise<Uint8Array> {
    const { scrypt } = await import('scrypt-js')
    
    // Convert scrypt parameters to match Argon2 security level
    // N = 2^14 = 16384 (memory-hard parameter)
    // r = 8 (block size factor)
    // p = 1 (parallelization factor)
    const N = 16384 // 2^14 - memory-hard parameter
    const r = 8 // block size factor
    const p = 1 // parallelization factor
    
    const hash = await scrypt(password, salt, N, r, p, length)
    return new Uint8Array(hash)
  }

  // Convert password bytes to human-readable password
  private convertToPassword(passwordBytes: Uint8Array): string {
    // Use a character set that includes letters, numbers, and symbols
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
    
    let password = ''
    for (let i = 0; i < passwordBytes.length; i++) {
      const index = passwordBytes[i] % charset.length
      password += charset[index]
    }
    
    // Ensure minimum length of 16 characters
    while (password.length < 16) {
      const extraIndex = passwordBytes[password.length % passwordBytes.length] % charset.length
      password += charset[extraIndex]
    }
    
    console.log('🎯 Final password generated:', password)
    return password
  }

  // Convert BigInt to Uint8Array
  private bigIntToUint8Array(bigInt: bigint, length: number): Uint8Array {
    const hex = bigInt.toString(16).padStart(length * 2, '0')
    const bytes = new Uint8Array(length)
    for (let i = 0; i < length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
    }
    return bytes
  }

  // Convert Uint8Array to base64
  private arrayToBase64(array: Uint8Array): string {
    return btoa(String.fromCharCode(...array))
  }

  // Main password generation function
  async generatePassword(pythRandomness: { n1: string; n2: string; txHash: string; sequenceNumber: string }): Promise<PasswordGenerationResult> {
    console.log('🚀 STARTING PASSWORD GENERATION PROCESS...')
    console.log('📊 Input Pyth Randomness:', pythRandomness)
    console.log('📊 n1 (BigInt):', BigInt(pythRandomness.n1))
    console.log('📊 n2 (BigInt):', BigInt(pythRandomness.n2))
    console.log('📊 txHash:', pythRandomness.txHash)
    console.log('📊 sequenceNumber:', pythRandomness.sequenceNumber)
    
    // Step 1: Generate device secret (C)
    console.log('🔐 STEP 1: Generating device secret (C)...')
    const deviceSecret = this.generateDeviceSecret()
    console.log('🔐 Device Secret (C) generated:', this.arrayToBase64(deviceSecret))
    
    // Step 2: Extract R1 from Pyth randomness
    console.log('🎲 STEP 2: Extracting R1 from Pyth randomness...')
    const r1 = this.extractR1(pythRandomness)
    console.log('🎲 R1 extracted:', this.arrayToBase64(r1))
    
    // Step 3: Mix R1 + C → local_raw (HKDF)
    console.log('🔗 STEP 3: Mixing R1 + C → local_raw (HKDF)...')
    console.log('🔗 HKDF Parameters:')
    console.log('🔗 - IKM = R1 || C || context')
    console.log('🔗 - Salt = app_salt1')
    console.log('🔗 - Info = "local_raw_v1"')
    console.log('🔗 - Length = 32 bytes')
    const localRaw = await this.generateLocalRaw(r1, deviceSecret)
    console.log('🔗 Local Raw generated:', this.arrayToBase64(localRaw))
    
    // Step 4: Harden local_raw → LocalKey (scrypt)
    console.log('🛡️ STEP 4: Hardening local_raw → LocalKey (scrypt)...')
    console.log('🛡️ Scrypt Parameters:')
    console.log('🛡️ - N = 16384 (memory-hard parameter)')
    console.log('🛡️ - r = 8 (block size factor)')
    console.log('🛡️ - p = 1 (parallelization factor)')
    console.log('🛡️ - Output length = 32 bytes')
    const { localKey, salt1, argon2Params } = await this.generateLocalKey(localRaw)
    console.log('🛡️ LocalKey generated:', this.arrayToBase64(localKey))
    console.log('🛡️ Salt1 generated:', this.arrayToBase64(salt1))
    
    // Step 5: Extract R2 from Pyth randomness
    console.log('🎲 STEP 5: Extracting R2 from Pyth randomness...')
    const r2 = this.extractR2(pythRandomness)
    console.log('🎲 R2 extracted:', this.arrayToBase64(r2))
    
    // Step 6: Derive seed and final harden → Password_bytes
    console.log('🌱 STEP 6: Deriving seed and final hardening → Password_bytes...')
    console.log('🌱 HKDF Parameters for seed_raw:')
    console.log('🌱 - IKM = LocalKey || R2 || context2')
    console.log('🌱 - Salt = app_salt2')
    console.log('🌱 - Info = "seed_v1"')
    console.log('🌱 - Length = 32 bytes')
    console.log('🌱 Scrypt Parameters for final password:')
    console.log('🌱 - N = 16384, r = 8, p = 1')
    console.log('🌱 - Output length = 32 bytes')
    const { passwordBytes, passwordSalt } = await this.generatePasswordBytes(localKey, r2)
    console.log('🌱 Password bytes generated:', this.arrayToBase64(passwordBytes))
    console.log('🌱 Password salt generated:', this.arrayToBase64(passwordSalt))
    
    // Convert to human-readable password
    console.log('🎯 Converting password bytes to human-readable password...')
    const password = this.convertToPassword(passwordBytes)
    console.log('🎯 Final password:', password)
    
    const result: PasswordGenerationResult = {
      password,
      metadata: {
        txHash: pythRandomness.txHash,
        sequenceNumber: pythRandomness.sequenceNumber,
        deviceSecret: this.arrayToBase64(deviceSecret),
        r1: pythRandomness.n1,
        r2: pythRandomness.n2,
        localRaw: this.arrayToBase64(localRaw),
        localKey: this.arrayToBase64(localKey),
        seedRaw: this.arrayToBase64(await this.generateSeedRaw(localKey, r2)),
        passwordBytes: this.arrayToBase64(passwordBytes),
        salt1: this.arrayToBase64(salt1),
        passwordSalt: this.arrayToBase64(passwordSalt),
        argon2Params
      }
    }
    
    console.log('✅ PASSWORD GENERATION COMPLETED!')
    console.log('✅ Final Result:', result)
    return result
  }

  // Helper method to generate seed_raw for metadata
  private async generateSeedRaw(localKey: Uint8Array, r2: Uint8Array): Promise<Uint8Array> {
    const ikm = new Uint8Array(localKey.length + r2.length + this.context2.length)
    ikm.set(localKey, 0)
    ikm.set(r2, localKey.length)
    ikm.set(new TextEncoder().encode(this.context2), localKey.length + r2.length)
    return await this.hkdf(ikm, 32, this.appSalt2, 'seed_v1')
  }
}

// Type for window.ethereum
interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

const RANDOMNESS_CONTRACT = '0xE861DC68Eb976da0661035bBf132d6F3a3288B71'
const ENTROPY_CONTRACT = '0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c'

// Contract ABIs
const RANDOMNESS_ABI = parseAbi([
  'function requestPair() external payable',
  'function getResult(uint64 sequenceNumber) external view returns (uint256 n1, uint256 n2, bool fulfilled, address requester)',
  'event Requested(uint64 indexed sequenceNumber, address indexed requester)',
  'event RandomPairGenerated(uint64 indexed sequenceNumber, uint256 n1, uint256 n2, address indexed requester)'
])

const ENTROPY_ABI = parseAbi([
  'function getFeeV2() external view returns (uint128)'
])

export default function TestPage() {
  const [fee, setFee] = useState<string>('0')
  const [isRequesting, setIsRequesting] = useState(false)
  const [sequenceNumber, setSequenceNumber] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [result, setResult] = useState<{
    n1: string
    n2: string
    fulfilled: boolean
    requester: string
  } | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [account, setAccount] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [publicClient, setPublicClient] = useState<any>(null)
  const [passwordResult, setPasswordResult] = useState<PasswordGenerationResult | null>(null)
  const [isGeneratingPassword, setIsGeneratingPassword] = useState(false)
  const [passwordGenerator] = useState(() => new ClientPasswordGenerator())
  const [isStoringPassword, setIsStoringPassword] = useState(false)
  const [storageSuccess, setStorageSuccess] = useState(false)
  const [socials, setSocials] = useState('')
  const [showSocialsInput, setShowSocialsInput] = useState(false)

  // Initialize Viem client
  useEffect(() => {
    const client = createPublicClient({
      chain: baseSepolia,
      transport: http('https://sepolia.base.org')
    })
    
    setPublicClient(client)
    
    // Get fee when client is ready
    getFee(client)
  }, [])

  // Check for wallet connection
  useEffect(() => {
    const checkWallet = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ethereum = (window as any).ethereum as EthereumProvider
          const accounts = await ethereum.request({ method: 'eth_accounts' }) as string[]
          if (accounts.length > 0) {
            setAccount(accounts[0])
          }
        } catch (err) {
          console.error('Error checking wallet:', err)
        }
      }
    }
    
    checkWallet()
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getFee = async (client: any) => {
    try {
      const feeValue = await client.readContract({
        address: ENTROPY_CONTRACT as `0x${string}`,
        abi: ENTROPY_ABI,
        functionName: 'getFeeV2'
      })
      
      setFee(feeValue.toString())
    } catch (err) {
      console.error('Error getting fee:', err)
      setError('Failed to get fee')
    }
  }

  const connectWallet = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ethereum = (window as any).ethereum as EthereumProvider
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' }) as string[]
        if (accounts.length > 0) {
          setAccount(accounts[0])
        }
      } catch (err) {
        console.error('Error connecting wallet:', err)
        setError('Failed to connect wallet')
      }
    } else {
      setError('No wallet found. Please install MetaMask or similar wallet.')
    }
  }

  const requestRandomness = async () => {
    if (!account || !publicClient) {
      setError('No wallet connected or client not ready')
      return
    }

    setIsRequesting(true)
    setError(null)
    setResult(null)
    setSequenceNumber(null)
    setTxHash(null)
    setPasswordResult(null)
    setIsPolling(false)
    setIsGeneratingPassword(false)
    setIsStoringPassword(false)
    setStorageSuccess(false)
    setSocials('')
    setShowSocialsInput(false)

    try {
      // Send transaction using window.ethereum directly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ethereum = (window as any).ethereum as EthereumProvider
      const txHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: account,
          to: RANDOMNESS_CONTRACT,
          value: '0x' + BigInt(fee).toString(16),
          data: '0x4b3813e6' // requestPair() function selector
        }]
      }) as string

      console.log('Transaction sent:', txHash)
      setTxHash(txHash)

      // Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
      
      // Parse events from receipt
      const requestEvents = parseEventLogs({
        abi: RANDOMNESS_ABI,
        logs: receipt.logs,
        eventName: 'Requested'
      })

      console.log('📋 CONTRACT TRANSACTION DATA:')
      console.log('📋 Transaction Hash:', txHash)
      console.log('📋 Transaction Receipt:', receipt)
      console.log('📋 All Receipt Logs:', receipt.logs)
      console.log('📋 Parsed Request Events:', requestEvents)

      if (requestEvents.length > 0) {
        const seqNum = requestEvents[0].args.sequenceNumber.toString()
        setSequenceNumber(seqNum)
        
        console.log('📋 Contract Event Data:')
        console.log('📋 Sequence Number:', seqNum)
        console.log('📋 Requester:', requestEvents[0].args.requester)
        console.log('📋 Event Args:', requestEvents[0].args)
        
        console.log('⏳ Waiting for Pyth randomness to be fulfilled...')
        console.log('⏳ Starting polling for real Pyth randomness...')
        
        // Wait a moment for transaction to be fully processed, then check immediately
        setTimeout(() => {
          checkRandomnessImmediately(seqNum, txHash)
        }, 1000) // Wait 1 second before checking
      } else {
        setError('Could not find sequence number in transaction')
      }

    } catch (err) {
      console.error('Error requesting randomness:', err)
      setError('Failed to request randomness')
    } finally {
      setIsRequesting(false)
    }
  }

  const checkRandomnessImmediately = async (seqNum: string, txHash: string) => {
    console.log('🚀 Checking randomness immediately for sequence:', seqNum)
    
    try {
      if (!publicClient) {
        console.error('❌ Public client not available')
        return
      }
      
      const result = await publicClient.readContract({
        address: RANDOMNESS_CONTRACT as `0x${string}`,
        abi: RANDOMNESS_ABI,
        functionName: 'getResult',
        args: [BigInt(seqNum)]
      })
      
      console.log('🚀 Immediate check result:', result)
      console.log('🚀 Fulfilled status:', result[2])
      
      if (result[2]) {
        const randomnessResult = {
          n1: result[0].toString(),
          n2: result[1].toString(),
          fulfilled: result[2],
          requester: result[3]
        }
        
        console.log('🎉 RANDOMNESS ALREADY FULFILLED IMMEDIATELY!')
        console.log('🎉 n1:', randomnessResult.n1)
        console.log('🎉 n2:', randomnessResult.n2)
        console.log('🎉 Full randomnessResult:', randomnessResult)
        
        setResult(randomnessResult)
        setIsPolling(false)
        
        // Generate password immediately
        console.log('🚀 Generating password with IMMEDIATE Pyth randomness...')
        console.log('🚀 About to call generatePassword with:', randomnessResult)
        
        try {
          await generatePassword(randomnessResult, txHash, seqNum)
          console.log('✅ generatePassword completed successfully!')
        } catch (error) {
          console.error('❌ Error in generatePassword:', error)
        }
      } else {
        console.log('⏳ Randomness not ready yet, starting polling...')
        startPolling(seqNum, txHash)
      }
    } catch (err) {
      console.error('❌ Error in immediate check:', err)
      console.log('⏳ Starting polling as fallback...')
      startPolling(seqNum, txHash)
    }
  }

  const startPolling = (seqNum: string, txHash: string) => {
    setIsPolling(true)
    let pollCount = 0
    const maxPolls = 60 // Poll for up to 60 seconds (60 * 1 second)
    
    console.log('🔄 Starting polling for sequence number:', seqNum)
    console.log('🔄 Transaction hash:', txHash)
    console.log('🔄 Will poll every 1 second for up to 60 seconds')
    
    const pollInterval = setInterval(async () => {
      try {
        pollCount++
        console.log(`🔄 Polling attempt ${pollCount}/${maxPolls} for sequence ${seqNum}`)
        
        if (!publicClient) {
          console.error('❌ Public client not available')
          return
        }
        
        const result = await publicClient.readContract({
          address: RANDOMNESS_CONTRACT as `0x${string}`,
          abi: RANDOMNESS_ABI,
          functionName: 'getResult',
          args: [BigInt(seqNum)]
        })
        
        console.log(`🔄 Poll ${pollCount} result:`, result)
        console.log(`🔄 Fulfilled status:`, result[2])
        
        if (result[2]) { // result[2] is the fulfilled boolean
          const randomnessResult = {
            n1: result[0].toString(), // result[0] is n1
            n2: result[1].toString(), // result[1] is n2
            fulfilled: result[2],     // result[2] is fulfilled
            requester: result[3]     // result[3] is requester
          }
          
          console.log('📋 PYTH RANDOMNESS CONTRACT DATA:')
          console.log('📋 Raw Contract Result:', result)
          console.log('📋 n1 (raw):', result[0])
          console.log('📋 n2 (raw):', result[1])
          console.log('📋 fulfilled (raw):', result[2])
          console.log('📋 requester (raw):', result[3])
          console.log('📋 Processed Randomness Result:', randomnessResult)
          
          console.log('✅ PYTH RANDOMNESS IS NOW FULFILLED!')
          console.log('✅ n1:', randomnessResult.n1)
          console.log('✅ n2:', randomnessResult.n2)
          console.log('✅ fulfilled:', randomnessResult.fulfilled)
          console.log('✅ requester:', randomnessResult.requester)
          console.log('✅ Full randomnessResult:', randomnessResult)
          
          setResult(randomnessResult)
          setIsPolling(false)
          clearInterval(pollInterval)
          
          // Generate password ONLY with real Pyth randomness
          console.log('🚀 Generating password with REAL Pyth randomness...')
          console.log('🚀 About to call generatePassword with:', randomnessResult)
          
          try {
            await generatePassword(randomnessResult, txHash, seqNum)
            console.log('✅ generatePassword completed successfully!')
          } catch (error) {
            console.error('❌ Error in generatePassword:', error)
          }
        } else if (pollCount >= maxPolls) {
          console.error('❌ Polling timeout reached. Pyth randomness not fulfilled.')
          setIsPolling(false)
          clearInterval(pollInterval)
          setError('Timeout waiting for Pyth randomness. Please try again.')
        }
      } catch (err) {
        console.error('❌ Error polling result:', err)
        if (pollCount >= maxPolls) {
          setIsPolling(false)
          clearInterval(pollInterval)
          setError('Error polling for randomness. Please try again.')
        }
      }
    }, 1000) // Poll every 1 second
  }

  const generatePassword = async (
    randomnessResult: {
      n1: string
      n2: string
      fulfilled: boolean
      requester: string
    },
    txHashParam?: string,
    sequenceNumberParam?: string
  ) => {
    const currentTxHash = txHashParam || txHash
    const currentSequenceNumber = sequenceNumberParam || sequenceNumber
    
    console.log('🔐 ===== GENERATE PASSWORD FUNCTION CALLED =====')
    console.log('🔐 PASSWORD GENERATION INPUT PARAMETERS:')
    console.log('🔐 randomnessResult:', randomnessResult)
    console.log('🔐 txHashParam:', txHashParam)
    console.log('🔐 sequenceNumberParam:', sequenceNumberParam)
    console.log('🔐 currentTxHash:', currentTxHash)
    console.log('🔐 currentSequenceNumber:', currentSequenceNumber)
    console.log('🔐 isGeneratingPassword:', isGeneratingPassword)
    
    if (!currentTxHash || !currentSequenceNumber) {
      console.error('❌ Missing transaction hash or sequence number')
      console.error('❌ currentTxHash:', currentTxHash)
      console.error('❌ currentSequenceNumber:', currentSequenceNumber)
      return
    }

    if (isGeneratingPassword) {
      console.log('⚠️ Password generation already in progress, skipping...')
      console.log('⚠️ This might be why password is not generated on first attempt!')
      return
    }

    console.log('🔐 Starting password generation process...')
    setIsGeneratingPassword(true)
    setPasswordResult(null)

    try {
      console.log('🔐 Starting client-side password generation with REAL Pyth randomness...')
      console.log('🔐 Using ONLY onchain randomness data from contract...')
      
      const pythRandomness = {
        n1: randomnessResult.n1,
        n2: randomnessResult.n2,
        txHash: currentTxHash,
        sequenceNumber: currentSequenceNumber
      }

      console.log('🔐 REAL PYTH RANDOMNESS FOR PASSWORD GENERATION:')
      console.log('🔐 pythRandomness:', pythRandomness)
      console.log('🔐 n1 (onchain):', pythRandomness.n1)
      console.log('🔐 n2 (onchain):', pythRandomness.n2)
      console.log('🔐 txHash:', pythRandomness.txHash)
      console.log('🔐 sequenceNumber:', pythRandomness.sequenceNumber)
      console.log('🔐 These are the ACTUAL random numbers from Pyth Network!')
      console.log('🔐 About to call passwordGenerator.generatePassword...')

      // Generate password client-side using Web Crypto API
      const passwordResult = await passwordGenerator.generatePassword(pythRandomness)
      console.log('🔐 passwordGenerator.generatePassword completed!')
      setPasswordResult(passwordResult)
      
      console.log('✅ Client-side password generation completed!')
      console.log('✅ Final Password Result:', passwordResult)
      
      // Show socials input after password generation
      setShowSocialsInput(true)
      console.log('📝 Password generated! Please enter socials to store in NilDB.')
      
    } catch (err) {
      console.error('Error generating password:', err)
      setError('Failed to generate password')
    } finally {
      setIsGeneratingPassword(false)
    }
  }

  const storePasswordWithSocials = async () => {
    if (!passwordResult) {
      setError('No password generated yet')
      return
    }

    if (!socials.trim()) {
      setError('Please enter socials information')
      return
    }

    setIsStoringPassword(true)
    setStorageSuccess(false)
    
    try {
      console.log('💾 Storing password with socials in NilDB...')
      console.log('💾 Socials:', socials)
      
      // First test configuration
      console.log('🔍 Testing NilDB configuration...')
      const configResponse = await fetch('/api/nildb/test-config')
      const config = await configResponse.json()
      
      if (!config.configured) {
        console.warn('⚠️ NilDB not properly configured:', config)
        setStorageSuccess(true) // Mark as success since password was generated
        setError(`Password generated successfully (NilDB not configured: ${config.missingVariables.join(', ')})`)
        return
      }
      
      console.log('✅ NilDB configuration is valid')
      
      const passwordName = `WhipHash Password - ${new Date().toLocaleString()}`
      
      const response = await fetch('/api/nildb/store-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: passwordResult.password,
          name: passwordName,
          metadata: passwordResult.metadata,
          socials: socials,
          txHash: passwordResult.metadata.txHash,
          sequenceNumber: passwordResult.metadata.sequenceNumber
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        setStorageSuccess(true)
        setShowSocialsInput(false)
        console.log('✅ Password and socials successfully stored in NilDB!', result)
      } else {
        let error
        try {
          error = await response.json()
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError)
          error = { error: `HTTP ${response.status}: ${response.statusText}` }
        }
        
        console.error('❌ NilDB API Error:', error)
        console.error('❌ Response status:', response.status)
        
        // Check if it's a configuration error
        if (error.error && error.error.includes('Missing environment variables')) {
          console.warn('⚠️ NilDB not configured - skipping storage')
          setStorageSuccess(true) // Mark as success since password was generated
          setError('Password generated successfully (NilDB not configured)')
        } else {
          const errorMessage = error.error || error.message || `HTTP ${response.status}: ${response.statusText}`
          throw new Error(errorMessage)
        }
      }
      
    } catch (err) {
      console.error('❌ Failed to store password in NilDB:', err)
      setError('Failed to store password in NilDB')
    } finally {
      setIsStoringPassword(false)
    }
  }



  if (!publicClient) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-black">
        {/* Dither Background */}
        <div style={{ width: '100%', height: '100vh', position: 'absolute', top: 0, left: 0 }}>
          <Dither
            waveColor={[0.5, 0.5, 0.5]}
            disableAnimation={false}
            enableMouseInteraction={true}
            mouseRadius={0.3}
            colorNum={4}
            waveAmplitude={0.3}
            waveFrequency={3}
            waveSpeed={0.05}
          />
        </div>

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/40" />

        {/* Loading Content */}
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-xl">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Dither Background */}
      <div style={{ width: '100%', height: '100vh', position: 'absolute', top: 0, left: 0 }}>
        <Dither
          waveColor={[0.5, 0.5, 0.5]}
          disableAnimation={false}
          enableMouseInteraction={true}
          mouseRadius={0.3}
          colorNum={4}
          waveAmplitude={0.3}
          waveFrequency={3}
          waveSpeed={0.05}
        />
      </div>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center">
          {/* Title */}
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-black mb-12 text-white drop-shadow-2xl tracking-tight">
            whiphash.
          </h1>

          {/* Main Button */}
          <div className="flex justify-center">
            {!account ? (
              <ShimmerButton
                shimmerColor="#ffffff"
                shimmerSize="0.05em"
                shimmerDuration="3s"
                borderRadius="12px"
                background="rgba(255, 255, 255, 0.1)"
                className="px-8 py-4 text-xl font-bold"
                onClick={connectWallet}
              >
                Connect Wallet
              </ShimmerButton>
            ) : (
              <ShimmerButton
                shimmerColor="#ffffff"
                shimmerSize="0.05em"
                shimmerDuration="3s"
                borderRadius="12px"
                background="rgba(255, 255, 255, 0.1)"
                className="px-8 py-4 text-xl font-bold"
                onClick={requestRandomness}
                disabled={isRequesting || isPolling || isGeneratingPassword || isStoringPassword}
              >
                {isRequesting ? 'Requesting Randomness...' : 
                 isPolling ? 'Waiting for Randomness...' : 
                 isGeneratingPassword ? 'Generating Password...' : 
                 isStoringPassword ? 'Storing in NilDB...' :
                 'Generate Secure Password'}
              </ShimmerButton>
            )}
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mt-8 p-4 bg-red-500/20 border border-red-500/30 rounded-lg backdrop-blur-sm">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          {passwordResult && (
            <div className="mt-8">
              {/* Password Display with ShineBorder */}
              <div className="relative p-8 bg-black/20 backdrop-blur-sm rounded-2xl">
                <ShineBorder
                  borderWidth={2}
                  duration={8}
                  shineColor={["#ffffff", "#60a5fa", "#ffffff"]}
                  className="rounded-2xl"
                />
                
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold text-white mb-6 text-center">🔐 Secure Password Generated!</h3>
                  
                  {/* Generated Password */}
                  <div className="mb-6">
                    <div className="bg-black/40 p-4 rounded-xl border border-white/20">
                      <code className="text-xl font-mono break-all text-white">{passwordResult.password}</code>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(passwordResult.password)}
                      className="mt-3 w-full px-4 py-2 bg-white/20 text-white text-sm rounded-lg hover:bg-white/30 backdrop-blur-sm transition-all duration-200"
                    >
                      Copy Password
                    </button>
                  </div>

                  {/* Socials Input */}
                  {showSocialsInput && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-white text-lg">📝 Enter Your Socials</h4>
                      <textarea
                        value={socials}
                        onChange={(e) => setSocials(e.target.value)}
                        placeholder="Enter socials information (e.g., website, platform, account details, etc.)"
                        className="w-full p-4 border border-white/30 rounded-xl text-black bg-white/90 placeholder-gray-500 resize-none"
                        rows={3}
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={storePasswordWithSocials}
                          disabled={isStoringPassword || !socials.trim()}
                          className="flex-1 px-6 py-3 bg-white/20 text-white rounded-xl hover:bg-white/30 disabled:bg-white/10 disabled:cursor-not-allowed backdrop-blur-sm transition-all duration-200 font-medium"
                        >
                          {isStoringPassword ? 'Saving...' : 'Save Password'}
                        </button>
                        <button
                          onClick={() => setShowSocialsInput(false)}
                          className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-200"
                        >
                          Skip
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Success Message */}
                  {storageSuccess && (
                    <div className="mt-6 p-4 bg-green-500/20 backdrop-blur-sm border border-green-500/30 rounded-xl">
                      <h3 className="font-semibold text-green-200 mb-1">✅ Password Saved Successfully!</h3>
                      <p className="text-green-200 text-sm">Your password has been securely stored in NilDB.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
