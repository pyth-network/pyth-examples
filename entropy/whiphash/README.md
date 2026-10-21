# WhipHash - Secure Password Generator

**Built with Pure High Pyth Entropy**

A decentralized password generator that creates cryptographically secure passwords using high-entropy randomness from the Pyth Network, combined with advanced client-side encryption and secure storage in NilDB.

## 🔗 Contract Explorer & Transaction Details

**📊 Transaction Explorer**: [View on BaseScan](https://sepolia.basescan.org/address/0xE861DC68Eb976da0661035bBf132d6F3a3288B71)

**💰 Pyth Network Fee**: **0.00000015 ETH** (constant throughout the project)
- **Cost Efficiency**: Ultra-low fees for high-entropy randomness

## 📋 Deployed Contracts

### Base Sepolia Testnet

| Contract | Address | Purpose |
|----------|---------|---------|
| **RandomnessGen** | `0xE861DC68Eb976da0661035bBf132d6F3a3288B71` | Generates random number pairs using Pyth Network entropy |
| **Entropy** | `0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c` | Pyth Network entropy provider contract |

### Contract Details
- **Network**: Base Sepolia Testnet (Chain ID: 84532)
- **Deployment Hash**: `0x39a943edca709c3337e2b01e6b58cf9db16af0b6403acb48448f7094b9354bb1`
- **Block**: 32774035
- **Gas Used**: 1,857,888 gas
- **Cost**: 0.000001858038488928 ETH
- **Status**: ✅ Verified on Sourcify

## 🏗️ Architecture Overview

### Client-Side Password Generation
- **Pure Client-Side**: All password generation happens in the browser using Web Crypto API
- **No Server Dependency**: Passwords are never transmitted to servers in plaintext
- **Device Secrets**: Generated locally using `crypto.getRandomValues()`

### Server-Side Storage
- **Encrypted Storage**: Passwords are encrypted before being sent to NilDB
- **NilDB Integration**: Decentralized database for secure password storage
- **Metadata Preservation**: Transaction hashes and sequence numbers stored for verification

## 🔒 Encryption & Security Implementation

### Multi-Layer Cryptographic Process

#### 1. **Device Secret Generation (C)**
```javascript
// Generate 32-byte device secret locally
const deviceSecret = crypto.getRandomValues(new Uint8Array(32))
```
- **Purpose**: Local entropy source that never leaves the device
- **Storage**: Kept in memory only, never transmitted

#### 2. **On-Chain Randomness (R1, R2)**
```solidity
// Pyth Network provides two random numbers
uint256 n1; // First random number (R1)
uint256 n2; // Second random number (R2)
```
- **Source**: Pyth Network's high-entropy randomness
- **Verification**: Blockchain transaction provides cryptographic proof
- **Advantage**: Unpredictable, verifiable, and tamper-proof

#### 3. **HKDF Key Derivation**
```javascript
// Mix R1 + C → local_raw using HKDF-SHA256
const localRaw = await hkdf(ikm, 32, appSalt1, 'local_raw_v1')
```
- **Algorithm**: HKDF-SHA256 (RFC 5869)
- **Purpose**: Combines on-chain and device entropy
- **Security**: Normalizes inputs and provides uniform seed

#### 4. **Memory-Hard Key Derivation**
```javascript
// Harden local_raw → LocalKey using Argon2id/scrypt
const localKey = await argon2id(localRaw, salt1, params, 32)
```
- **Algorithm**: Argon2id/scrypt (memory-hard)
- **Parameters**: 64MB memory, 3 iterations, 4 parallelism
- **Purpose**: Defends against offline brute force attacks

#### 5. **Final Password Derivation**
```javascript
// Derive final password using LocalKey + R2
const passwordBytes = await argon2id(seedRaw, passwordSalt, params, 32)
```
- **Process**: HKDF + Argon2id for final hardening
- **Output**: 32-byte password material
- **Character Set**: Letters, numbers, symbols (94 characters)

### Security Advantages

#### **Pyth Network Entropy Benefits:**
1. **True Randomness**: Pyth provides cryptographically secure random numbers
2. **Verifiable**: Blockchain transactions provide proof of randomness
3. **Tamper-Proof**: Immutable blockchain prevents manipulation
4. **High Entropy**: Superior to pseudo-random number generators
5. **Decentralized**: No single point of failure or control

#### **Multi-Layer Protection:**
- **Device Secret**: Local entropy prevents server-side attacks
- **On-Chain Proof**: Blockchain provides verifiable randomness
- **Memory Hardening**: Argon2id prevents GPU/ASIC attacks
- **HKDF Mixing**: Combines multiple entropy sources securely

## 🚀 How to Run the Project

### Prerequisites
- Node.js 18+ 
- npm or yarn
- MetaMask wallet (for blockchain interaction)
- Git

### 1. Clone the Repository
```bash
git clone <repository-url>
cd whiphash
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
```bash
cp .env.example .env.local
```

#### Required Environment Variables
```env
# NilDB Configuration
NILLION_API_KEY=your-nillion-api-key
NILLION_COLLECTION_ID=your-collection-id

# Alternative NilDB Configuration (if using different setup)
NILCHAIN_URL=http://rpc.testnet.nilchain-rpc-proxy.nilogy.xyz
NILAUTH_URL=https://nilauth.sandbox.app-cluster.sandbox.nilogy.xyz
NILDB_NODES=https://nildb-stg-n1.nillion.network,https://nildb-stg-n2.nillion.network,https://nildb-stg-n3.nillion.network
BUILDER_PRIVATE_KEY=your-builder-private-key
```

### 4. Start the Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 5. Browser Extension (Optional)

#### Install the Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `demo-extension` folder
5. Pin the extension for easy access

#### Extension Features
- **🖼️ Embedded Mode**: View app within extension popup
- **⛶ Fullscreen Mode**: Open app in new tab
- **🔗 Wallet Mode**: Optimized for wallet interactions

### 6. Usage Instructions

#### Generate a Password
1. **Connect Wallet**: Click "Connect Wallet" and approve MetaMask
2. **Request Randomness**: Click "Generate Secure Password"
3. **Wait for Pyth**: System fetches randomness from Pyth Network
4. **Password Generated**: Secure password appears with copy option
5. **Store Password**: Enter socials and save to NilDB

#### View Saved Passwords
1. Navigate to `/view` or click "View Saved Passwords →"
2. See all stored passwords with metadata
3. Click to show/hide passwords
4. Copy passwords to clipboard

## 🛠️ Development

### Project Structure
```
whiphash/
├── app/                  # App router pages
│   ├── page.tsx         # Landing page
│   ├── test/page.tsx    # Password generation
│   ├── view/page.tsx    # Password viewing
│   └── api/nildb/       # NilDB API routes
├── components/          # React components
├── lib/                 # Utility functions
└── demo-extension/      # Browser extension
```

### Key Technologies
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Blockchain**: Viem, Ethers.js, Base Sepolia
- **Randomness**: Pyth Network, Entropy Protocol
- **Storage**: NilDB (Nillion Network)
- **Crypto**: Web Crypto API, HKDF, Argon2id/scrypt
- **UI**: Three.js, GSAP, Custom animations

### API Endpoints
- `POST /api/nildb/store-password` - Store encrypted password
- `GET /api/nildb/read-collection` - Retrieve stored passwords
- `GET /api/nildb/test-config` - Test NilDB configuration

## 🔐 Security Considerations

### What's Encrypted
- ✅ Passwords (client-side generation)
- ✅ Device secrets (never transmitted)
- ✅ Storage in NilDB (encrypted at rest)
- ✅ All sensitive data (socials, metadata)

### What's Public
- ✅ Transaction hashes (for verification)
- ✅ Sequence numbers (for randomness proof)
- ✅ Blockchain randomness (verifiable on-chain)

### Best Practices
- **Never share device secrets**
- **Verify transaction hashes**
- **Use strong master passwords**
- **Regular security audits**

## 📊 Performance

### Password Generation Time
- **Device Secret**: ~1ms (local generation)
- **Blockchain Call**: ~2-5s (Pyth Network)
- **HKDF Processing**: ~10ms
- **Argon2id**: ~100-500ms (memory-hard)
- **Total**: ~3-6 seconds per password

### Storage Efficiency
- **Password**: 16-32 characters
- **Metadata**: ~1KB per entry
- **NilDB**: Decentralized, redundant storage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Pyth Network** for providing high-entropy randomness
- **Nillion Network** for decentralized storage
- **Base Network** for fast, low-cost transactions
- **MetaMask** for wallet integration
- **Next.js** for the React framework

## 🔗 Links

- **Live Demo**: [ETHGlobal Showcase](https://ethglobal.com/showcase/whiphash-9u5xj)
- **GitHub Repository**: [dumprahul/whiphash](https://github.com/dumprahul/whiphash)
- **Contract Explorer**: [BaseScan](https://sepolia.basescan.org/address/0xE861DC68Eb976da0661035bBf132d6F3a3288B71)

---

**Built with ❤️ and pure high Pyth entropy**