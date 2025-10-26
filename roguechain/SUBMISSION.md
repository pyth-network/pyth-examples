# 🚀 ETHGlobal Submission - RogueChain

## 📋 **Submission Checklist**

### ✅ **Working Code**
- [x] **Smart Contract**: Fully functional RogueChain.sol
- [x] **Frontend**: Complete web application
- [x] **Deployment**: Live on Optimism Sepolia
- [x] **Tests**: All tests passing
- [x] **Documentation**: Comprehensive README

### 🌐 **Live Demo**
**🔗 [https://rogue-chain.vercel.app/](https://rogue-chain.vercel.app/)**

### 📧 **Contract Details**
- **Address**: `0x01b4b5227A1234A32b23bdBCF63C354f1253C963`
- **Network**: Optimism Sepolia (Chain ID: 11155420)
- **ABI**: Available in `frontend/abi.json`

## 🎯 **Key Features Demonstrated**

### 1. **Real-Time Oracle Integration**
- Pyth Network price feeds (ETH/USD, BTC/USD)
- Market state detection based on live data
- Dynamic reward multipliers

### 2. **NFT Gaming Mechanics**
- ERC721 Hero NFTs with randomized stats
- Level progression system
- Dungeon battle mechanics

### 3. **Web3 Integration**
- MetaMask wallet connection
- Optimism Sepolia deployment
- Gas-optimized transactions

### 4. **Production-Ready Frontend**
- Modern, responsive UI
- Real-time updates
- Error handling and user feedback

## 🛠️ **Technical Stack**

### **Smart Contracts**
- Solidity 0.8.28
- OpenZeppelin Contracts
- Pyth Network SDK
- Hardhat Framework

### **Frontend**
- Vanilla JavaScript
- Ethers.js 5.7.2
- Modern CSS3
- Pyth Hermes API

### **Deployment**
- Optimism Sepolia
- Hardhat Ignition
- Vercel Hosting

## 📁 **Project Structure**

```
RogueChain/
├── contracts/
│   └── RogueChain.sol          # Main smart contract
├── frontend/
│   ├── index.html              # Main web interface
│   ├── app.js                  # JavaScript logic
│   └── abi.json                # Contract ABI
├── ignition/
│   └── modules/
│       └── RogueChain.ts       # Deployment module
├── hardhat.config.ts           # Hardhat configuration
├── package.json                # Dependencies
├── README.md                   # Comprehensive documentation
└── check-submission.js         # Submission validation script
```

## 🚀 **Quick Start**

### **For Users**
1. Visit [https://rogue-chain.vercel.app/](https://rogue-chain.vercel.app/)
2. Connect MetaMask wallet
3. Switch to Optimism Sepolia network
4. Mint a hero and start playing!

### **For Developers**
```bash
# Clone repository
git clone <repository-url>
cd RogueChain

# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Deploy to Optimism Sepolia
npx hardhat ignition deploy ignition/modules/RogueChain.ts --network optimismSepolia

# Serve frontend
cd frontend
python -m http.server 8000
```

## 🏆 **Why RogueChain Deserves to Win**

### **🎯 Innovation**
- **First-of-its-kind**: Real-time market integration in Web3 gaming
- **Oracle Mastery**: Advanced Pyth Network integration
- **Hybrid Architecture**: Combines multiple oracle types

### **💻 Technical Excellence**
- **Production-Ready**: Clean, documented, maintainable code
- **Security-First**: ReentrancyGuard, access controls, input validation
- **Gas Optimized**: Efficient smart contract design

### **🎨 User Experience**
- **Beautiful UI**: Modern, responsive design
- **Seamless Web3**: No complexity for end users
- **Real-Time Updates**: Live stat tracking and market status

### **📚 Educational Value**
- **Best Practices**: Demonstrates oracle integration
- **Complete Example**: Full-stack Web3 development
- **Open Source**: Community learning resource

## 🔗 **Important Links**

- **Live Demo**: [https://rogue-chain.vercel.app/](https://rogue-chain.vercel.app/)
- **Contract**: `0x01b4b5227A1234A32b23bdBCF63C354f1253C963`
- **Network**: Optimism Sepolia
- **Documentation**: See README.md for full details

## 📞 **Contact**

For questions about this submission, please refer to the comprehensive README.md file or check the live demo.

---

**⚔️ Ready to experience the future of Web3 gaming? [Play RogueChain Now!](https://rogue-chain.vercel.app/)**
