// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// OpenZeppelin Imports
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

// Pyth Imports
import { IEntropyV2 } from "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import { IEntropyConsumer } from "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";

/**
 * @title MockPTK
 * @dev This is your sample PTK token for deployment and testing.
 */
contract MockPTK is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor() ERC20("Mock Param Token", "mPTK") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}

/**
 * @title IMintablePTK
 * @dev The interface our main contract will use to talk to the token.
 */
interface IMintablePTK {
    function mint(address to, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}


/**
 * @title ParamProtocol
 * @dev This is your FINAL, UNIFIED contract.
 * It mints NFTs, gives a base reward, AND requests a Pyth bonus.
 */
contract ParamProtocol is ERC721URIStorage, Ownable, IEntropyConsumer {
    
    // --- State Variables ---
    IMintablePTK public ptkToken;
    IEntropyV2 private pyth;

    // NFT and Base Reward
    uint256 public tokenIdCounter;
    uint256 public baseRewardAmount = 10 * 10**18; // 10 PTK

    // Pyth Bonus Reward
    mapping(uint64 => address) public s_sequenceToContributor;
    mapping(uint64 => bool) public s_requestFulfilled;
    mapping(uint64 => uint256) public s_sequenceToBonusAmount;

    // --- THIS IS THE FIX ---
    // These constants were missing from the previous version
    uint256 public constant BONUS_REWARD_COMMON = 5 * 10**18;
    uint256 public constant BONUS_REWARD_RARE = 50 * 10**18;
    uint256 public constant BONUS_REWARD_LEGENDARY = 1000 * 10**18;
    // ------------------------

    // NFT Contributor Tracking
    mapping(uint256 => address) private _nftContributor;
    mapping(address => uint256[]) private _contributorNFTs;

    // --- Events ---
    event DataNFTMinted(address indexed contributor, uint256 tokenId, string cid);
    event BaseRewardMinted(address indexed contributor, uint256 amount);
    event RandomnessRequested(uint64 indexed sequenceNumber, address indexed contributor);
    event BonusRewardMinted(address indexed contributor, uint256 amount, uint64 indexed sequenceNumber);

    // --- Constructor ---
    constructor(
        address _ptkTokenAddress,
        address _pythAddress
    ) 
        ERC721("ParamProtocolDataNFT", "PPDNFT") 
        Ownable(msg.sender) 
    {
        ptkToken = IMintablePTK(_ptkTokenAddress);
        pyth = IEntropyV2(_pythAddress);
    }

    // ==========================================================
    // --- CORE LOGIC ---
    // ==========================================================

    function mintDataNFT(string calldata _cid, address _contributor) 
        external 
        payable 
        onlyOwner 
    {
        // 1. Check for Pyth Fee
        uint256 fee = pyth.getFeeV2();
        require(msg.value >= fee, "Not enough fee for Pyth");
        
        // 2. Mint NFT Logic
        require(_contributor != address(0), "Invalid contributor");
        uint256 newTokenId = tokenIdCounter + 1;
        _safeMint(_contributor, newTokenId);
        _setTokenURI(newTokenId, _cid);
        tokenIdCounter = newTokenId;
        _nftContributor[newTokenId] = _contributor;
        _contributorNFTs[_contributor].push(newTokenId);
        emit DataNFTMinted(_contributor, newTokenId, _cid);

        // 3. Mint BASE Reward (Instant)
        ptkToken.mint(_contributor, baseRewardAmount);
        emit BaseRewardMinted(_contributor, baseRewardAmount);

        // 4. Request BONUS Reward (Asynchronous)
        uint64 sequenceNumber = pyth.requestV2{value: msg.value}(); 
        s_sequenceToContributor[sequenceNumber] = _contributor;
        emit RandomnessRequested(sequenceNumber, _contributor);
    }

    /**
     * @notice The Pyth callback function for the bonus reward.
     */
    function entropyCallback(
        uint64 sequenceNumber,
        address provider,
        bytes32 randomNumber
    ) internal override {
        (provider); // Mark as used

        address contributor = s_sequenceToContributor[sequenceNumber];
        require(contributor != address(0), "Invalid sequence");
        require(!s_requestFulfilled[sequenceNumber], "Request already fulfilled");

        s_requestFulfilled[sequenceNumber] = true;

        uint256 bonusAmount = _calculateBonusReward(uint64(uint256(randomNumber)));
        
        s_sequenceToBonusAmount[sequenceNumber] = bonusAmount;
        
        if (bonusAmount > 0) {
            ptkToken.mint(contributor, bonusAmount);
            emit BonusRewardMinted(contributor, bonusAmount, sequenceNumber);
        }
    }

    /**
     * @notice Internal logic to determine bonus reward tier.
     */
    function _calculateBonusReward(uint64 _randomNumber) 
        internal pure returns (uint256) 
    {
        uint256 chance = _randomNumber % 100; // 0-99
        // These calls are now valid
        if (chance == 0) return BONUS_REWARD_LEGENDARY; // 1%
        if (chance < 10) return BONUS_REWARD_RARE;  // 9%
        if (chance < 30) return BONUS_REWARD_COMMON; // 20%
        return 0; // 70%
    }

    // ==========================================================
    // --- Admin & Getter Functions (All Included) ---
    // ==========================================================

    /**
     * @notice Required by IEntropyConsumer interface.
     */
    function getEntropy() internal view override returns (address) {
        return address(pyth);
    }

    function setBaseRewardAmount(uint256 _newAmount) external onlyOwner {
        baseRewardAmount = _newAmount;
    }

    function setPythAddress(address _newAddress) external onlyOwner {
        pyth = IEntropyV2(_newAddress);
    }

    function getPythFee() external view returns (uint256) {
        return pyth.getFeeV2();
    }

    function getPtkBalance(address _user) external view returns (uint256) {
        return ptkToken.balanceOf(_user);
    }

    function getBaseRewardAmount() external view returns (uint256) {
        return baseRewardAmount;
    }

    function getNFTOwner(uint256 tokenId) external view returns (address) {
        return ownerOf(tokenId);
    }

    function getContributor(uint256 tokenId) external view returns (address) {
        return _nftContributor[tokenId];
    }
    
    function getNFTsByContributor(address contributor) external view returns (uint256[] memory) {
        return _contributorNFTs[contributor];
    }

    function getCID(uint256 tokenId) external view returns (string memory) {
        return tokenURI(tokenId);
    }

    function getTotalNFTs() external view returns (uint256) {
        return tokenIdCounter;
    }
}
