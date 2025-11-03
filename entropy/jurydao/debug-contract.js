import { ethers } from 'ethers'

const RPC_URL = 'https://sepolia.base.org'
const GOVERNOR_ADDRESS = '0xa33cD4a79d972c8acef82D21DB6cD258116A1038'

async function debug() {
    const provider = new ethers.JsonRpcProvider(RPC_URL)

    console.log('🔍 Debugging contract:', GOVERNOR_ADDRESS)

    // 1. Check if contract exists
    const code = await provider.getCode(GOVERNOR_ADDRESS)
    console.log('Contract code length:', code.length)

    if (code === '0x') {
        console.error('❌ NO CONTRACT DEPLOYED AT THIS ADDRESS!')
        return
    }

    console.log('✅ Contract exists')

    // 2. Try to call owner() with raw call
    try {
        // owner() function selector: 0x8da5cb5b
        const result = await provider.call({
            to: GOVERNOR_ADDRESS,
            data: '0x8da5cb5b'
        })

        console.log('Raw call result:', result)

        if (result === '0x') {
            console.error('❌ Function returned empty data - function might not exist!')
        } else {
            const owner = ethers.AbiCoder.defaultAbiCoder().decode(['address'], result)[0]
            console.log('✅ Owner address:', owner)
        }
    } catch (error) {
        console.error('❌ Call failed:', error.message)
    }

    // 3. Check contract balance
    const balance = await provider.getBalance(GOVERNOR_ADDRESS)
    console.log('💰 Contract balance:', ethers.formatEther(balance), 'ETH')
}

debug()
