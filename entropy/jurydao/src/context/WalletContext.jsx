import React, { createContext, useContext, useState, useEffect } from 'react'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'

const WalletContext = createContext()

export const useWallet = () => {
    const context = useContext(WalletContext)
    if (!context) {
        throw new Error('useWallet must be used within WalletProvider')
    }
    return context
}

export const WalletProvider = ({ children }) => {
    const [account, setAccount] = useState(null)
    const [provider, setProvider] = useState(null)
    const [signer, setSigner] = useState(null)
    const [chainId, setChainId] = useState(null)
    const [isConnected, setIsConnected] = useState(false)

    // Initialize provider immediately (for read-only operations)
    useEffect(() => {
        const initProvider = async () => {
            try {
                // Create a fallback provider for read-only operations
                const fallbackProvider = new ethers.JsonRpcProvider('https://sepolia.base.org')
                setProvider(fallbackProvider)
                console.log('✅ Fallback provider initialized')
            } catch (error) {
                console.error('❌ Failed to initialize provider:', error)
            }
        }

        initProvider()
    }, [])

    const connectWallet = async () => {
        try {
            if (!window.ethereum) {
                toast.error('Please install MetaMask!')
                return
            }

            console.log('🔌 Connecting wallet...')

            // Request account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            })

            console.log('Accounts:', accounts)

            if (accounts.length === 0) {
                toast.error('No accounts found')
                return
            }

            // Create provider and signer from MetaMask
            const web3Provider = new ethers.BrowserProvider(window.ethereum)
            const web3Signer = await web3Provider.getSigner()
            const network = await web3Provider.getNetwork()

            console.log('Network:', network.chainId)

            // Check if on correct network (Base Sepolia = 84532)
            if (Number(network.chainId) !== 84532) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x14a34' }] // 84532 in hex
                    })

                    // Re-fetch after network switch
                    const newProvider = new ethers.BrowserProvider(window.ethereum)
                    const newSigner = await newProvider.getSigner()
                    const newNetwork = await newProvider.getNetwork()

                    setProvider(newProvider)
                    setSigner(newSigner)
                    setChainId(Number(newNetwork.chainId))
                } catch (switchError) {
                    if (switchError.code === 4902) {
                        // Chain not added, add it
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x14a34',
                                chainName: 'Base Sepolia',
                                nativeCurrency: {
                                    name: 'ETH',
                                    symbol: 'ETH',
                                    decimals: 18
                                },
                                rpcUrls: ['https://sepolia.base.org'],
                                blockExplorerUrls: ['https://sepolia.basescan.org']
                            }]
                        })

                        // Re-fetch after adding network
                        const newProvider = new ethers.BrowserProvider(window.ethereum)
                        const newSigner = await newProvider.getSigner()
                        const newNetwork = await newProvider.getNetwork()

                        setProvider(newProvider)
                        setSigner(newSigner)
                        setChainId(Number(newNetwork.chainId))
                    } else {
                        toast.error('Please switch to Base Sepolia network')
                        return
                    }
                }
            } else {
                setProvider(web3Provider)
                setSigner(web3Signer)
                setChainId(Number(network.chainId))
            }

            setAccount(accounts[0])
            setIsConnected(true)

            console.log('✅ Wallet connected:', accounts[0])
            toast.success('Wallet connected!')

        } catch (error) {
            console.error('❌ Error connecting wallet:', error)
            toast.error('Failed to connect wallet')
        }
    }

    const disconnectWallet = () => {
        setAccount(null)
        setSigner(null)
        setIsConnected(false)

        // Keep fallback provider for read-only operations
        const fallbackProvider = new ethers.JsonRpcProvider('https://sepolia.base.org')
        setProvider(fallbackProvider)

        toast.success('Wallet disconnected')
    }

    // Listen for account changes
    useEffect(() => {
        if (!window.ethereum) return

        const handleAccountsChanged = (accounts) => {
            console.log('👤 Accounts changed:', accounts)
            if (accounts.length === 0) {
                disconnectWallet()
            } else {
                setAccount(accounts[0])
                // Reconnect to update provider/signer
                connectWallet()
            }
        }

        const handleChainChanged = () => {
            console.log('🔗 Chain changed, reloading...')
            window.location.reload()
        }

        window.ethereum.on('accountsChanged', handleAccountsChanged)
        window.ethereum.on('chainChanged', handleChainChanged)

        return () => {
            if (window.ethereum.removeListener) {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
                window.ethereum.removeListener('chainChanged', handleChainChanged)
            }
        }
    }, [])

    const value = {
        account,
        provider,
        signer,
        chainId,
        isConnected,
        connectWallet,
        disconnectWallet
    }

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    )
}
