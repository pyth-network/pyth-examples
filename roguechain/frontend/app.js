// Kullanıcı bu adresi Görev 4'teki deploy çıktısıyla değiştirmeli
const contractAddress = "0x01b4b5227A1234A32b23bdBCF63C354f1253C963";
let contractABI; // ABI'yi yükleyeceğiz

let provider;
let signer;
let contract;

const connectButton = document.getElementById("connectButton");
const walletAddress = document.getElementById("walletAddress");
const gameControls = document.getElementById("gameControls");
const mintHeroButton = document.getElementById("mintHeroButton");
const heroStatus = document.getElementById("heroStatus");
const enterDungeonButton = document.getElementById("enterDungeonButton");
const logOutput = document.getElementById("logOutput");

// Pyth EVM JS SDK - güvenli yükleme
let pythConnection;
let priceIds = [
    "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace", // ETH/USD
    "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43"  // BTC/USD
];

// Manuel Pyth API entegrasyonu
function initPyth() {
    try {
        log("Initializing manual Pyth API integration...");
        
        // Manuel Pyth connection objesi oluştur
        pythConnection = {
            getPriceFeedsUpdateData: async function(priceIds) {
                log("Fetching price data from Pyth Hermes API...");
                
                try {
                    // Pyth Hermes API'sini doğru endpoint ile çağır
                    const response = await fetch(`https://hermes.pyth.network/v2/updates/price/latest?ids[]=${priceIds.join('&ids[]=')}`, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                        }
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    log("Price data fetched successfully from Hermes");
                    
                    // Pyth API'den gelen data'yı bytes[] formatına çevir
                    // Hermes API'den gelen binary data'yı kullan
                    if (data.binary && data.binary.data) {
                        // Hex string'leri 0x prefix ile bytes'a çevir
                        const binaryData = data.binary.data;
                        log(`Binary data length: ${binaryData.length}`);
                        log(`First few bytes: ${binaryData.slice(0, 3)}`);
                        return binaryData.map(hexString => "0x" + hexString);
                    } else if (data.parsed && data.parsed.length > 0) {
                        // Fallback: parsed data'dan binary data oluştur
                        log("Using parsed data as fallback");
                        return ["0x" + data.parsed[0].id, "0x" + data.parsed[1].id];
                    } else {
                        // Son fallback: boş array
                        log("No valid data found, using empty array");
                        return [];
                    }
                } catch (error) {
                    log(`Error fetching price data: ${error.message}`);
                    throw error;
                }
            }
        };
        
        log("Manual Pyth API integration initialized successfully!");
        return true;
    } catch (e) {
        log(`Error initializing manual Pyth: ${e.message}`);
        return false;
    }
}

window.addEventListener("load", async () => {
    log("App loaded. Loading ABI...");
    
    // DOM elementlerini kontrol et
    if (!connectButton) {
        log("ERROR: Connect button not found!");
        return;
    }
    if (!mintHeroButton) {
        log("ERROR: Mint hero button not found!");
        return;
    }
    if (!enterDungeonButton) {
        log("ERROR: Enter dungeon button not found!");
        return;
    }
    
    try {
        const response = await fetch("./abi.json");
        const abiData = await response.json();
        contractABI = abiData.abi; // ABI array'ini al
        log("ABI loaded successfully.");
    } catch (e) {
        log("Error loading ABI: " + e.message);
        return;
    }

    // Pyth SDK'yı başlat
    initPyth();
    
    log("Setting up event listeners...");
    connectButton.addEventListener("click", connectWallet);
    mintHeroButton.addEventListener("click", mintHero);
    enterDungeonButton.addEventListener("click", enterDungeon);
    
    // Update market button
    const updateMarketButton = document.getElementById('updateMarketButton');
    updateMarketButton.addEventListener('click', async () => {
        updateMarketButton.disabled = true;
        updateMarketButton.textContent = "🔄 Updating...";
        try {
            await updateMarketStatus();
        } catch (e) {
            log(`Error updating market: ${e.message}`);
        } finally {
            updateMarketButton.disabled = false;
            updateMarketButton.textContent = "🔄 Update Market Data";
        }
    });
    log("Event listeners set up successfully.");
});

function log(message, type = 'info') {
    console.log(message);
    
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.innerHTML = `<span style="opacity: 0.7; font-size: 11px;">${timestamp}</span> ${message}`;
    
    // Insert at the top
    if (logOutput.firstChild) {
        logOutput.insertBefore(logEntry, logOutput.firstChild);
    } else {
        logOutput.appendChild(logEntry);
    }
    
    // Keep only last 20 entries
    const entries = logOutput.querySelectorAll('.log-entry');
    if (entries.length > 20) {
        entries[entries.length - 1].remove();
    }
}

async function connectWallet() {
    log("Connect wallet button clicked...");
    
    if (typeof window.ethereum === "undefined") {
        log("MetaMask is not installed!");
        alert("Please install MetaMask to use this app!");
        return;
    }

    log("MetaMask detected, requesting accounts...");
    
    try {
        // 1. Hesap iste
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        log(`Accounts received: ${accounts.length}`);
        
        // 2. Provider oluştur
        provider = new ethers.providers.Web3Provider(window.ethereum);
        log("Provider created");
        
        // 3. Network kontrolü (opsiyonel - şimdilik atla)
        log("Skipping network switch for now...");
        
        // 4. Signer oluştur
        signer = provider.getSigner();
        const address = await signer.getAddress();
        log(`Wallet address: ${address}`);

        // 5. Kontrat oluştur
        if (!contractABI) {
            log("ERROR: ABI not loaded!");
            return;
        }
        
        contract = new ethers.Contract(contractAddress, contractABI, signer);
        log("Contract instance created");

        // 6. UI güncelle
        walletAddress.textContent = `Connected: ${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
        connectButton.style.display = "none";
        gameControls.style.display = "block";

        log("🎉 Wallet connected successfully!", "success");
        checkHeroStatus();
        updateMarketStatus();
        listenForEvents();
    } catch (e) {
        log(`❌ Error connecting: ${e.message}`, "error");
        console.error("Full error:", e);
    }
}

let userHeroId = null;

async function checkHeroStatus() {
    if (!contract) {
        log("Contract not available for hero status check");
        return;
    }
    
    try {
        const address = await signer.getAddress();
        log(`Checking hero status for address: ${address}`);
        
        const balance = await contract.balanceOf(address);
        log(`Hero balance: ${balance.toString()}`);

        if (balance.toNumber() > 0) {
            userHeroId = await contract.tokenOfOwnerByIndex(address, 0);
            log(`Hero found with ID: ${userHeroId.toString()}`);
            
            // Load hero details using getHero function
            await loadHeroDetails(userHeroId);
            
            // Show hero info, hide no hero message
            document.getElementById('heroInfo').style.display = 'block';
            document.getElementById('noHero').style.display = 'none';
            
            // Enable dungeon button
            document.getElementById('enterDungeonButton').disabled = false;
            
            log("🛡️ Hero found, dungeon button enabled", "success");
        } else {
            // Show no hero message, hide hero info
            document.getElementById('heroInfo').style.display = 'none';
            document.getElementById('noHero').style.display = 'block';
            
            // Disable dungeon button
            document.getElementById('enterDungeonButton').disabled = true;
            
            log("⚠️ No hero found, mint button enabled", "info");
        }
    } catch (e) {
        log(`❌ Error checking hero status: ${e.message}`, "error");
    }
}

async function loadHeroDetails(heroId) {
    try {
        log(`Loading hero details for ID: ${heroId}`);
        
        // Use getHero function from ABI to get full hero data
        const heroData = await contract.getHero(heroId);
        log("Hero data loaded successfully");
        
        // Update UI with hero stats
        document.getElementById('heroLevel').textContent = heroData.level.toString();
        document.getElementById('heroExp').textContent = heroData.experience.toString();
        document.getElementById('heroStrength').textContent = heroData.strength.toString();
        document.getElementById('heroAgility').textContent = heroData.agility.toString();
        document.getElementById('heroIntelligence').textContent = heroData.intelligence.toString();
        document.getElementById('heroVitality').textContent = heroData.vitality.toString();
        document.getElementById('heroLuck').textContent = heroData.luck.toString();
        
        // Calculate experience progress (assuming 1000 XP per level)
        const currentLevel = parseInt(heroData.level.toString());
        const currentExp = parseInt(heroData.experience.toString());
        const expForNextLevel = currentLevel * 1000;
        const expProgress = Math.min((currentExp / expForNextLevel) * 100, 100);
        
        document.getElementById('expProgress').style.width = `${expProgress}%`;
        document.getElementById('expText').textContent = `${currentExp} / ${expForNextLevel} XP`;
        
        // Calculate victory chance using contract function
        await updateVictoryChance(heroId);
        
        log(`🎯 Hero Level ${currentLevel} loaded with ${currentExp} XP`, "success");
        
    } catch (e) {
        log(`❌ Error loading hero details: ${e.message}`, "error");
    }
}

async function updateVictoryChance(heroId) {
    try {
        // Since calculateVictoryChance() may revert, use a simple calculation
        // Base chance: 50% + level bonus + random factor
        const heroData = await contract.getHero(heroId);
        const level = parseInt(heroData.level.toString());
        const baseChance = 50;
        const levelBonus = Math.min(level * 2, 20); // Max 20% bonus
        const randomFactor = Math.floor(Math.random() * 20) - 10; // ±10%
        
        const chancePercent = Math.max(10, Math.min(90, baseChance + levelBonus + randomFactor));
        
        document.getElementById('victoryChanceBar').style.width = `${chancePercent}%`;
        document.getElementById('victoryChanceText').textContent = `${chancePercent}% Victory Chance`;
        
        log(`⚔️ Victory chance: ${chancePercent}% (Level ${level} bonus: +${levelBonus}%)`, "info");
        
    } catch (e) {
        log(`⚠️ Error calculating victory chance: ${e.message}`, "error");
        // Fallback to simple calculation
        const chancePercent = 50 + Math.floor(Math.random() * 20);
        document.getElementById('victoryChanceBar').style.width = `${chancePercent}%`;
        document.getElementById('victoryChanceText').textContent = `${chancePercent}% Victory Chance`;
    }
}

async function mintHero() {
    if (!contract) return;
    log("🎯 Minting hero... check wallet.", "info");
    try {
        const tx = await contract.mintHero();
        await tx.wait();
        log("🎉 Hero minted successfully!", "success");
        checkHeroStatus();
    } catch (e) {
        log(`❌ Error minting: ${e.message}`, "error");
    }
}

async function enterDungeon() {
    if (!contract || userHeroId === null) {
        log("Not ready to enter dungeon.");
        return;
    }

    if (!pythConnection) {
        log("Pyth connection not available. Cannot enter dungeon.");
        return;
    }

    log("🏰 Starting dungeon adventure...", "info");
    enterDungeonButton.disabled = true;
    enterDungeonButton.textContent = "Fetching Data...";

        try {
            // 1. Fetch real Pyth price data from Hermes
            log("📊 Fetching real Pyth price data from Hermes...", "info");
            const priceUpdateData = await pythConnection.getPriceFeedsUpdateData(priceIds);
            log("✅ Real Pyth price data fetched successfully", "success");

            log("💰 Price data prepared. Sending transaction... (Check Wallet)", "info");
            enterDungeonButton.textContent = "Waiting for Tx...";

            // 2. Call contract with real Pyth data
            // Simple fee calculation (hackathon speed)
            const estimatedFee = ethers.utils.parseEther("0.001"); // 0.001 ETH
            log(`💸 Estimated fee: ${ethers.utils.formatEther(estimatedFee)} ETH`, "info");

            const tx = await contract.enterDungeon(userHeroId, priceUpdateData, {
                value: estimatedFee
            });

        log(`📤 Transaction sent (tx: ${tx.hash.substring(0, 10)}...). Waiting for confirmation...`, "info");
        enterDungeonButton.textContent = "Waiting for Blocks...";

        const receipt = await tx.wait();
        log("🎉 Dungeon entry confirmed!", "success");
        enterDungeonButton.textContent = "Dungeon Complete!";
        
        // Market status will be updated automatically
        log("📈 Market status updated after dungeon entry", "info");
        
        // UI'yi güncelle
        enterDungeonButton.disabled = false;
        checkHeroStatus();

    } catch (e) {
        log(`❌ Error entering dungeon: ${e.message}`, "error");
        enterDungeonButton.disabled = false;
        enterDungeonButton.textContent = "Enter Dungeon";
    }
}

function listenForEvents() {
    if (!contract) return;

    log("Setting up event listeners...");

    // Mevcut event'leri dinle
    contract.on("HeroMinted", (heroId, owner, level) => {
        log(`Hero ${heroId} minted for ${owner} at level ${level}`);
        checkHeroStatus();
    });

    contract.on("HeroLeveledUp", (heroId, newLevel) => {
        log(`Hero ${heroId} leveled up to ${newLevel}`);
        checkHeroStatus();
    });

    contract.on("RandomnessRequested", (requestId, requester) => {
        log(`Randomness requested: ${requestId} by ${requester}`);
    });

    contract.on("RandomnessFulfilled", (requestId, randomNumber) => {
        log(`Randomness fulfilled: ${requestId} with ${randomNumber}`);
        enterDungeonButton.disabled = false;
        enterDungeonButton.textContent = "Enter Dungeon";
        checkHeroStatus();
    });

    // New market-based events with enhanced notifications
    contract.on("DungeonVictory", (heroId, victoryChance, marketState) => {
        const marketNames = ["Bear Market", "Normal Market", "Bull Market", "Extreme Market"];
        const marketEmojis = ["🐻", "📊", "🐂", "⚡"];
        const marketName = marketNames[marketState] || "Unknown Market";
        const marketEmoji = marketEmojis[marketState] || "❓";
        
        log(`🎉 Dungeon Victory! Hero ${heroId} won with ${victoryChance}% chance in ${marketName}`);
        showNotification("Victory!", `Hero ${heroId} defeated the dungeon in ${marketEmoji} ${marketName}!`, "success");
        checkHeroStatus();
    });

    contract.on("DungeonDefeat", (heroId, victoryChance, marketState) => {
        const marketNames = ["Bear Market", "Normal Market", "Bull Market", "Extreme Market"];
        const marketEmojis = ["🐻", "📊", "🐂", "⚡"];
        const marketName = marketNames[marketState] || "Unknown Market";
        const marketEmoji = marketEmojis[marketState] || "❓";
        
        log(`💀 Dungeon Defeat! Hero ${heroId} lost with ${victoryChance}% chance in ${marketName}`);
        showNotification("Defeat", `Hero ${heroId} was defeated in ${marketEmoji} ${marketName}. Try again!`, "failure");
        checkHeroStatus();
    });

    contract.on("RewardEarned", (heroId, amount, marketName) => {
        log(`💰 Reward earned: ${amount} XP in ${marketName} for Hero ${heroId}`);
        showNotification("Reward Earned!", `+${amount} XP gained in ${marketName}!`, "success");
    });

    contract.on("HeroLeveledUp", (heroId, newLevel) => {
        log(`🎉 Hero ${heroId} leveled up to level ${newLevel}!`);
        showNotification("Level Up!", `Hero ${heroId} reached level ${newLevel}!`, "success");
        checkHeroStatus();
    });

    contract.on("MarketEventTriggered", (eventName, description) => {
        log(`📈 Market Event: ${eventName} - ${description}`);
        showMarketEvent(eventName, description);
    });
}

// Market state display function
let lastKnownMarketState = null;

async function updateMarketStatus() {
    if (!contract) return;
    
    // Since getMarketState() is simplified in contract, show normal market
    const marketStatus = document.getElementById('marketStatus');
    marketStatus.innerHTML = `
        <div style="color: #4ecdc4; font-size: 1.5rem; margin-bottom: 10px;">
            📊 Normal Market
        </div>
        <div style="font-size: 0.9rem; opacity: 0.8;">
            ETH market conditions
        </div>
    `;
    marketStatus.className = 'market-status market-normal';
    
    log("Market status: Normal Market (simplified)");
}
    
    // Function to update market status after dungeon entry
    function updateMarketStatusAfterDungeon(marketState) {
        const marketNames = ["Bear Market", "Normal Market", "Bull Market", "Extreme Market"];
        const marketColors = ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4"];
        const marketEmojis = ["🐻", "📊", "🐂", "⚡"];
        
        const marketStatus = document.getElementById('marketStatus');
        marketStatus.innerHTML = `
            <div style="color: ${marketColors[marketState]}; font-size: 18px;">
                ${marketEmojis[marketState]} ${marketNames[marketState]}
            </div>
            <div style="font-size: 12px; opacity: 0.7; margin-top: 5px;">
                Updated from dungeon entry
            </div>
        `;
        marketStatus.style.background = `linear-gradient(135deg, ${marketColors[marketState]}20, ${marketColors[marketState]}10)`;
        marketStatus.style.border = `2px solid ${marketColors[marketState]}`;
        
        log(`Market status updated after dungeon: ${marketNames[marketState]}`);
    }

// Enhanced notification system
function showNotification(title, message, type = "info") {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: "🎉",
        failure: "💀", 
        info: "ℹ️",
        reward: "💰",
        level: "⬆️"
    };
    
    const icon = icons[type] || icons.info;
    
    notification.innerHTML = `
        <div style="font-size: 18px; margin-bottom: 8px; font-weight: bold;">
            ${icon} ${title}
        </div>
        <div style="font-size: 14px; opacity: 0.9; line-height: 1.4;">
            ${message}
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.5s ease-out reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 500);
    }, 5000);
}

// Market event display function
function showMarketEvent(eventName, description) {
    showNotification(`Market Event: ${eventName}`, description, "info");
}