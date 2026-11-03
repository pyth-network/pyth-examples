# AleaArt - Blockchain-Powered Generative Art Platform

AleaArt is a decentralized platform that generates unique art parameters using on-chain randomness from Pyth Entropy, creates AI-generated images using Stable Diffusion, and enables NFT minting and trading. Each art piece is truly unique, verifiable on the blockchain, and tradeable as NFTs.

## 🎨 Key Features

- **On-Chain Randomness**: Uses Pyth Entropy V2 for verifiable, tamper-proof randomness
- **Generative Art Parameters**: Converts randomness into detailed art generation parameters
- **AI Image Generation**: Creates stunning images using Stable Diffusion models
- **NFT Minting**: Convert generated art into tradeable NFTs on Arbitrum Sepolia
- **Decentralized Marketplace**: Buy and sell NFTs directly peer-to-peer
- **Spotlight Feature**: Randomly select and feature NFT holders using Pyth Entropy
- **IPFS Storage**: Images stored on decentralized IPFS network via Pinata
- **User Authentication**: Secure login/signup with NextAuth.js
- **Wallet Integration**: MetaMask connection for blockchain interactions
- **Image Gallery**: Personal gallery to view and manage generated artwork
- **Real-time Generation**: Asynchronous image generation with status tracking

## 🔗 Smart Contracts

### EntropyArtParamsV2 Contract
**Address**: `0x420D121aE08007Ef0A66E67D5D7BfFdC98AbECF0`  
**Network**: Arbitrum Sepolia  
**Location**: `contracts/EntropyArtParamsV2.sol`

The core contract that leverages **Pyth Entropy V2** to generate deterministic art parameters:

- **Randomness Request**: Requests verifiable randomness from Pyth's decentralized network
- **Parameter Generation**: Converts randomness into art parameters:
  - Prompt templates (12 different styles)
  - Style modifiers (10 artistic styles)
  - Technical parameters (steps, CFG scale, aspect ratio)
  - Unique seeds for reproducibility
- **On-Chain Storage**: Stores parameters permanently for verification
- **Event Emission**: Emits events for frontend integration

### AleaArtNFT Contract
**Address**: `0x806019F8a33A01a4A3fea93320601cC77B6Dcb79`  
**Network**: Arbitrum Sepolia  
**Location**: `contracts/AleaArtNFT.sol`

The NFT marketplace contract enabling art trading:

- **NFT Minting**: Convert generated art into ERC721 NFTs
- **IPFS Integration**: Links NFTs to images stored on IPFS
- **Marketplace Functions**: Buy, sell, and trade NFTs
- **Price Management**: Set and update NFT prices
- **Ownership Tracking**: Tracks both creator and current owner
- **Direct Payments**: 100% of sale proceeds go to seller (no platform fees)
- **Sale Status**: Enable/disable NFTs for sale

### SpotlightSelector Contract
**Address**: `0xd596C7C17331013C85c791092247e33267d9291e`  
**Network**: Arbitrum Sepolia  
**Location**: `contracts/SpotlightSelector.sol`

The spotlight feature contract for random NFT selection:

- **Random Selection**: Uses Pyth Entropy to randomly select NFT holders
- **Spotlight Duration**: Features selected NFT for 24 hours (configurable)
- **Fee System**: Requires 0.001 ETH fee to request new spotlight
- **Automatic Expiry**: Spotlight automatically expires after duration
- **Fair Selection**: Truly random selection from all available NFTs
- **Event Tracking**: Emits events for spotlight requests and selections

### Contract Functions Overview

#### EntropyArtParamsV2:
- `requestArtParams()` - Request new art parameters (costs ~0.0004 ETH)
- `viewRenderParams(tokenId)` - View generated parameters
- `tokenSeed(tokenId)` - Get the random seed used
- `nextTokenId()` - Get next available token ID

#### AleaArtNFT:
- `mintNFT(to, ipfsHash, prompt, price)` - Mint new NFT
- `buyNFT(tokenId)` - Purchase NFT (sends ETH to seller)
- `setPrice(tokenId, newPrice)` - Update NFT price
- `setSaleStatus(tokenId, isForSale)` - Enable/disable for sale
- `getAllNFTs()` - Get all minted NFTs
- `getNFTsForSale()` - Get NFTs currently for sale

#### SpotlightSelector:
- `requestSpotlight()` - Request new spotlight selection (costs 0.001 ETH)
- `getCurrentSpotlight()` - Get current active spotlight
- `isSpotlightActive(spotlightId)` - Check if spotlight is active
- `getSpotlight(spotlightId)` - Get spotlight by ID
- `setSpotlightDuration(duration)` - Update spotlight duration (owner only)
- `setSpotlightFee(fee)` - Update spotlight fee (owner only)


## 📁 Project Structure

```
AleaArt/
├── contracts/                      # Smart Contracts (Solidity)
│   ├── AleaArtNFT.sol             # NFT marketplace and trading
│   ├── EntropyArtParamsV2.sol     # Pyth Entropy integration for art parameters
│   └── SpotlightSelector.sol      # Random NFT selection for spotlight
│
├── frontend-aleart/                # Frontend Application (Next.js)
│   ├── src/
│   │   ├── app/                    # Next.js app router pages
│   │   │   ├── page.tsx           # Landing page
│   │   │   ├── create/            # Art generation page
│   │   │   ├── marketplace/       # NFT marketplace page
│   │   │   ├── gallery/           # User gallery page
│   │   │   └── api/               # API routes
│   │   │       ├── buy-nft/       # NFT purchase endpoint
│   │   │       ├── marketplace/   # Market data endpoint
│   │   │       ├── spotlight/     # Spotlight feature endpoint
│   │   │       └── ...
│   │   ├── components/            # React components
│   │   ├── lib/                   # Utilities (auth, db)
│   │   ├── models/                # MongoDB models
│   │   └── types/                 # TypeScript types
│   ├── public/                    # Static assets
│   └── package.json               # Node.js dependencies
│
├── python_backend.py              # Flask backend for Stable Diffusion
├── python_backend_macos.py        # macOS-specific backend
├── python_backend_simple.py       # Simplified backend version
├── test_async_api.py              # Async API testing
│
├── scripts/                       # Deployment scripts
│   ├── deploy-artParams.ts        # Deploy art params contract
│   ├── deploy-nft-arbitrum.ts    # Deploy NFT contract
│   └── deploy-spotlight-arbitrum.ts # Deploy spotlight contract
│
├── generated_images/               # Generated artwork storage (local)
├── artifacts/                     # Compiled contract artifacts
├── cache/                         # Build cache
├── hardhat.config.ts              # Hardhat configuration
│
├── requirements.txt               # Python dependencies
├── requirements_macos.txt         # macOS Python dependencies
├── package.json                   # Root node.js dependencies
└── README.md                       # This file
```

### Directory Overview

- **`contracts/`** - Solidity smart contracts that handle on-chain logic, NFT minting, trading, and randomness
- **`frontend-aleart/`** - Next.js frontend application with TypeScript, Tailwind CSS, and React components
- **`python_backend*.py`** - Python Flask servers that run Stable Diffusion models to generate AI images
- **`scripts/`** - Hardhat deployment scripts for deploying contracts to Arbitrum Sepolia
- **`generated_images/`** - Local storage for generated artwork before IPFS upload
- **`artifacts/`** - Compiled contract artifacts and build information

## 🏗️ Architecture

- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Backend**: Python Flask with Stable Diffusion integration
- **Database**: MongoDB for user data and generated images metadata
- **Blockchain**: Arbitrum Sepolia testnet
- **Authentication**: NextAuth.js with JWT tokens
- **Image Storage**: IPFS via Pinata (decentralized)
- **NFT Standard**: ERC721 compliant
- **Payment**: Direct ETH transfers (no platform fees)

## 🚀 Technology Stack

- **Blockchain**: Solidity, Hardhat, Ethers.js, OpenZeppelin
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Python, Flask, Stable Diffusion, PyTorch
- **Database**: MongoDB, Mongoose
- **Authentication**: NextAuth.js
- **Randomness**: Pyth Entropy V2 SDK
- **Storage**: IPFS, Pinata API
- **NFT**: ERC721 standard

## 🎯 User Journey

1. **Connect Wallet**: Link MetaMask to Arbitrum Sepolia
2. **Generate Parameters**: Request art parameters using Pyth Entropy (~0.0004 ETH)
3. **Create Art**: AI generates unique image using Stable Diffusion
4. **Mint NFT**: Convert art to tradeable NFT with custom price
5. **Trade**: Buy/sell NFTs in the decentralized marketplace
6. **Spotlight**: Request spotlight to randomly feature NFT holders (0.001 ETH)
7. **Own**: Full ownership and control of your digital art

## Screenshots

<img width="1000" height="2000" alt="screencapture-aleart-taupe-vercel-app-dashboard-2025-10-26-00_24_24" src="https://github.com/user-attachments/assets/e6273108-14e2-4017-89e1-4cbe3e105cfe" />

<img width="1000" height="2000" alt="screencapture-aleart-taupe-vercel-app-marketplace-2025-10-26-00_24_51" src="https://github.com/user-attachments/assets/e104f59d-6c0c-435f-b348-2c96691143a6" />

