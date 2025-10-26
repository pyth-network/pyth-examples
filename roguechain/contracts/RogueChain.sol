// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";

// Custom Pyth Entropy callback interface
interface IPythEntropyCallback {
    function fulfillRandomness(bytes32 requestId, uint64 randomNumber) external;
}

contract RogueChain is ERC721, ERC721Enumerable, Ownable, ReentrancyGuard, IPythEntropyCallback {
    
    // Events
    event HeroMinted(uint256 indexed heroId, address indexed owner, uint256 level);
    event HeroLeveledUp(uint256 indexed heroId, uint256 newLevel);
    event RandomnessRequested(bytes32 indexed requestId, address indexed requester);
    event RandomnessFulfilled(bytes32 indexed requestId, uint64 randomNumber);
    event DungeonVictory(uint256 indexed heroId, uint256 victoryChance, uint8 marketState);
    event DungeonDefeat(uint256 indexed heroId, uint256 victoryChance, uint8 marketState);
    event RewardEarned(uint256 indexed heroId, uint256 amount, string marketName);
    event MarketEventTriggered(string eventName, string description);
    
    // Enums
    enum MarketState {
        BEAR,      // ETH < $2000
        NORMAL,    // ETH $2000-3000
        BULL,      // ETH $3000-4000
        EXTREME    // ETH > $4000
    }
    
    // Structs
    struct Hero {
        uint256 id;
        address owner;
        uint256 level;
        uint256 experience;
        uint256 strength;
        uint256 agility;
        uint256 intelligence;
        uint256 vitality;
        uint256 luck;
    }
    
    struct GameSession {
        uint256 heroId;
        uint256 startTime;
        bool isActive;
        uint256 currentFloor;
        uint256 monstersDefeated;
    }
    
    struct PendingRequest {
        uint256 heroId;
        uint256 timestamp;
    }
    
    // State variables
    mapping(uint256 => Hero) public heroes;
    mapping(address => uint256[]) public userHeroes;
    mapping(bytes32 => address) public randomnessRequests;
    mapping(uint256 => GameSession) public gameSessions;
    
    IPyth public pyth;
    address public pythEntropy;
    bytes32 public ethPriceId;
    bytes32 public btcPriceId;
    
    uint256 private _nextTokenId;
    uint256 public constant MAX_LEVEL = 100;
    uint256 public constant BASE_EXPERIENCE = 100;
    
    mapping(bytes32 => PendingRequest) public pendingRequests;
    
    // Modifiers
    modifier onlyHeroOwner(uint256 heroId) {
        require(ownerOf(heroId) == msg.sender, "Not the owner of this hero");
        _;
    }
    
    modifier validHeroId(uint256 heroId) {
        require(_ownerOf(heroId) != address(0), "Hero does not exist");
        _;
    }
    
    // Constructor
    constructor(
        address _pyth,
        address _pythEntropy,
        bytes32 _ethPriceId,
        bytes32 _btcPriceId
    ) ERC721("RogueChain Heroes", "RCH") Ownable(msg.sender) {
        pyth = IPyth(_pyth);
        pythEntropy = _pythEntropy;
        ethPriceId = _ethPriceId;
        btcPriceId = _btcPriceId;
    }
    
    // Core functions
    function mintHero() external {
        uint256 heroId = _nextTokenId++;
        _safeMint(msg.sender, heroId);
        
        // Initialize hero with random stats
        heroes[heroId] = Hero({
            id: heroId,
            owner: msg.sender,
            level: 1,
            experience: 0,
            strength: _generateRandomStat(10, 20),
            agility: _generateRandomStat(10, 20),
            intelligence: _generateRandomStat(10, 20),
            vitality: _generateRandomStat(10, 20),
            luck: _generateRandomStat(5, 15)
        });
        
        userHeroes[msg.sender].push(heroId);
        emit HeroMinted(heroId, msg.sender, 1);
    }
    
    function startGameSession(uint256 heroId) external onlyHeroOwner(heroId) validHeroId(heroId) {
        require(!gameSessions[heroId].isActive, "Game session already active");
        
        gameSessions[heroId] = GameSession({
            heroId: heroId,
            startTime: block.timestamp,
            isActive: true,
            currentFloor: 1,
            monstersDefeated: 0
        });
    }
    
    function endGameSession(uint256 heroId) external onlyHeroOwner(heroId) validHeroId(heroId) {
        require(gameSessions[heroId].isActive, "No active game session");
        
        GameSession storage session = gameSessions[heroId];
        session.isActive = false;
        
        // Award experience based on monsters defeated
        uint256 experienceGained = session.monstersDefeated * 10;
        heroes[heroId].experience += experienceGained;
        
        // Check for level up
        _checkLevelUp(heroId);
    }
    
    function requestRandomness() external payable {
        require(msg.value >= 0.001 ether, "Insufficient payment for randomness");
        
        // For now, we'll use block-based randomness
        // In production, this would integrate with Pyth's randomness service
        uint256 randomNumber = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender)));
        
        emit RandomnessRequested(bytes32(randomNumber), msg.sender);
        
        // Process randomness immediately
        _processRandomness(msg.sender, uint64(randomNumber));
    }
    
    // Internal functions
    function _checkLevelUp(uint256 heroId) internal {
        Hero storage hero = heroes[heroId];
        uint256 requiredExp = hero.level * BASE_EXPERIENCE;
        
        if (hero.experience >= requiredExp && hero.level < MAX_LEVEL) {
            hero.level++;
            hero.strength += _generateRandomStat(1, 3);
            hero.agility += _generateRandomStat(1, 3);
            hero.intelligence += _generateRandomStat(1, 3);
            hero.vitality += _generateRandomStat(1, 3);
            hero.luck += _generateRandomStat(0, 2);
            
            emit HeroLeveledUp(heroId, hero.level);
        }
    }
    
    function _generateRandomStat(uint256 min, uint256 max) internal view returns (uint256) {
        uint256 random = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender)));
        return min + (random % (max - min + 1));
    }
    
    function _processRandomness(address requester, uint64 randomNumber) internal {
        // Implement game mechanics using randomness
        // This could be for combat, loot generation, etc.
    }
    
    // View functions
    function getHero(uint256 heroId) external view validHeroId(heroId) returns (Hero memory) {
        return heroes[heroId];
    }
    
    function getUserHeroes(address user) external view returns (uint256[] memory) {
        return userHeroes[user];
    }
    
    function getGameSession(uint256 heroId) external view validHeroId(heroId) returns (GameSession memory) {
        return gameSessions[heroId];
    }
    
    function getHeroStats(uint256 heroId) external view validHeroId(heroId) returns (
        uint256 level,
        uint256 experience,
        uint256 strength,
        uint256 agility,
        uint256 intelligence,
        uint256 vitality,
        uint256 luck
    ) {
        Hero memory hero = heroes[heroId];
        return (
            hero.level,
            hero.experience,
            hero.strength,
            hero.agility,
            hero.intelligence,
            hero.vitality,
            hero.luck
        );
    }
    
    // Game functions
    // Market state detection - simplified approach
    function getMarketState() public view returns (MarketState) {
        // For now, return NORMAL market state
        // This will be updated after successful dungeon entries
        return MarketState.NORMAL;
    }
    
    // Update price feeds and get market state
    function updatePriceFeedsAndGetMarketState(bytes[] memory priceUpdateData) external payable returns (MarketState) {
        // Validate input data
        require(priceUpdateData.length > 0, "No price update data provided");
        
        // Update price feeds first with the provided fee
        try pyth.updatePriceFeeds{value: msg.value}(priceUpdateData) {
            // Price feeds updated successfully
        } catch Error(string memory reason) {
            revert(string(abi.encodePacked("Pyth update failed: ", reason)));
        } catch {
            revert("Pyth update failed with unknown error");
        }
        
        // Now get market state
        return getMarketState();
    }
    
    // Market influence calculation
    function getMarketInfluence(MarketState market) internal pure returns (int256) {
        if (market == MarketState.BEAR) return -25;      // -25% (kolay)
        else if (market == MarketState.NORMAL) return 0;  // 0% (normal)
        else if (market == MarketState.BULL) return 25;    // +25% (zor)
        else return 40;                                    // +40% (çok zor)
    }
    
    // Victory chance calculation
    function calculateVictoryChance(uint256 heroId, uint64 randomNumber) public view returns (uint256) {
        MarketState market = getMarketState();
        Hero memory hero = heroes[heroId];
        
        // Base chance: 40%
        uint256 baseChance = 40;
        
        // Market influence: ±25%
        int256 marketInfluence = getMarketInfluence(market);
        
        // Hero level bonus: +3% per level (max +30%)
        uint256 levelBonus = hero.level * 3;
        if (levelBonus > 30) levelBonus = 30;
        
        // Hero stats bonus: +1% per stat point (max +20%)
        uint256 statsBonus = (hero.strength + hero.agility + hero.intelligence + hero.vitality + hero.luck) / 5;
        if (statsBonus > 20) statsBonus = 20;
        
        // Randomness influence: ±15%
        int256 randomInfluence = int256(uint256(randomNumber % 31)) - 15;
        
        // Final calculation
        int256 totalChance = int256(baseChance) + marketInfluence + int256(levelBonus) + int256(statsBonus) + randomInfluence;
        
        // Clamp between 5% and 95%
        if (totalChance < 5) totalChance = 5;
        if (totalChance > 95) totalChance = 95;
        
        return uint256(totalChance);
    }
    
    function enterDungeon(uint256 heroId, bytes[] memory priceUpdateData) external payable onlyHeroOwner(heroId) nonReentrant {
        require(heroes[heroId].level > 0, "Hero does not exist");
        require(msg.value >= 0.001 ether, "Insufficient fee");
        
        // Update Pyth price feeds with fee
        pyth.updatePriceFeeds{value: msg.value}(priceUpdateData);
        
        // Request randomness from Pyth Entropy
        bytes32 requestId = keccak256(abi.encodePacked(block.timestamp, block.prevrandao, heroId, msg.sender));
        pendingRequests[requestId] = PendingRequest(heroId, block.timestamp);
        
        emit RandomnessRequested(requestId, msg.sender);
        
        // For now, use simple randomness (will be replaced by Pyth Entropy callback)
        uint256 randomResult = _generateRandomStat(1, 100);
        bool victory = (randomResult % 2) == 0; // %50 şans
        
        if (victory) {
            // Hero level up
            heroes[heroId].level += 1;
            heroes[heroId].experience += 100;
            emit HeroLeveledUp(heroId, heroes[heroId].level);
        }
        
        // Kalan ETH'i geri gönder
        if (msg.value > 0.001 ether) {
            payable(msg.sender).transfer(msg.value - 0.001 ether);
        }
    }
    
    // Pyth Entropy callback
    function fulfillRandomness(bytes32 requestId, uint64 randomNumber) external override {
        require(msg.sender == pythEntropy, "Only PythEntropy can call");
        
        PendingRequest memory request = pendingRequests[requestId];
        require(request.heroId > 0, "Invalid request");
        
        // Process dungeon result with real randomness
        processDungeonResult(request.heroId, randomNumber);
        
        delete pendingRequests[requestId];
        emit RandomnessFulfilled(requestId, randomNumber);
    }
    
    // Process dungeon result
    function processDungeonResult(uint256 heroId, uint64 randomNumber) internal {
        uint256 victoryChance = calculateVictoryChance(heroId, randomNumber);
        MarketState market = getMarketState();
        
        // Roll for victory
        bool victory = (randomNumber % 100) < victoryChance;
        
        if (victory) {
            // Calculate and apply rewards
            calculateRewards(heroId, true, market);
            emit DungeonVictory(heroId, victoryChance, uint8(market));
        } else {
            emit DungeonDefeat(heroId, victoryChance, uint8(market));
        }
    }
    
    // Calculate rewards based on market state
    function calculateRewards(uint256 heroId, bool victory, MarketState market) internal {
        if (victory) {
            uint256 baseXP = 100;
            uint256 marketMultiplier = getMarketMultiplier(market);
            uint256 finalXP = baseXP * marketMultiplier / 100;
            
            // Update hero
            heroes[heroId].experience += finalXP;
            heroes[heroId].level = calculateLevel(heroes[heroId].experience);
            
            // Emit events
            emit HeroLeveledUp(heroId, heroes[heroId].level);
            emit RewardEarned(heroId, finalXP, getMarketName(market));
        }
    }
    
    // Market multipliers
    function getMarketMultiplier(MarketState market) internal pure returns (uint256) {
        if (market == MarketState.BEAR) return 50;      // 0.5x reward
        else if (market == MarketState.NORMAL) return 100; // 1x reward
        else if (market == MarketState.BULL) return 200;   // 2x reward
        else return 300;                                  // 3x reward
    }
    
    // Market names
    function getMarketName(MarketState market) internal pure returns (string memory) {
        if (market == MarketState.BEAR) return "Bear Market";
        else if (market == MarketState.NORMAL) return "Normal Market";
        else if (market == MarketState.BULL) return "Bull Market";
        else return "Extreme Market";
    }
    
    // Calculate level from experience
    function calculateLevel(uint256 experience) internal pure returns (uint256) {
        return (experience / 100) + 1; // 100 XP per level
    }
    
    // Admin functions
    function setPyth(address _pyth) external onlyOwner {
        pyth = IPyth(_pyth);
    }
    
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    // Override functions
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        address from = _ownerOf(tokenId);
        
        if (from != address(0)) {
            // Remove from old owner's heroes list
            uint256[] storage fromHeroes = userHeroes[from];
            for (uint256 i = 0; i < fromHeroes.length; i++) {
                if (fromHeroes[i] == tokenId) {
                    fromHeroes[i] = fromHeroes[fromHeroes.length - 1];
                    fromHeroes.pop();
                    break;
                }
            }
        }
        
        if (to != address(0)) {
            // Add to new owner's heroes list
            userHeroes[to].push(tokenId);
        }
        
        return super._update(to, tokenId, auth);
    }
    
    // ERC721Enumerable override functions
    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}