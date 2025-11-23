// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropy.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";

/**
 * @title HyperlinkgridEntropy
 * @notice A simplified example of using Pyth Entropy to select winners in a decentralized lottery-style mechanic.
 * This contract represents a grid of tiles that can be purchased. Once the grid is full, 
 * Pyth Entropy is used to generate a verifiable random number to select beneficiaries who split the pot.
 */
contract HyperlinkgridEntropy is ERC721, Ownable, IEntropyConsumer {
    // =============================================================
    //                           CONSTANTS
    // =============================================================

    uint256 public constant MAX_SUPPLY = 10; // Reduced for example purposes (original was 10000)
    uint256 public constant TILE_PRICE = 100 * 10**6; // 100 USDC
    uint256 public constant NUM_BENEFICIARIES = 2; // Reduced for example purposes

    // =============================================================
    //                            STATE
    // =============================================================

    uint256 public nextId = 1;
    IERC20 public usdc;
    
    // Pyth Entropy
    IEntropy public entropy;
    address public entropyProvider;

    struct Tile {
        string url;
        uint24 color;
    }
    mapping(uint256 => Tile) public tiles;

    // End Game State
    bool public endGameTriggered;
    bool public endGameCompleted;
    uint64 public endGameSequenceNumber;
    
    // Winners (Beneficiaries)
    uint256[] public beneficiaries;

    // =============================================================
    //                           EVENTS
    // =============================================================

    event TilePurchased(uint256 indexed id, address indexed owner, uint24 color, string url);
    event EndGameRequested(uint64 sequenceNumber);
    event EndGameCompleted(uint256[] beneficiaryIds);
    event PayoutDistributed(address beneficiary, uint256 amount);

    // =============================================================
    //                        CONSTRUCTOR
    // =============================================================

    constructor(
        address _usdcAddress, 
        address _entropyAddress,
        address _entropyProvider
    ) 
        ERC721("Hyperlinkgrid", "GRID") 
        Ownable(msg.sender)
    {
        usdc = IERC20(_usdcAddress);
        entropy = IEntropy(_entropyAddress);
        entropyProvider = _entropyProvider;
    }

    // =============================================================
    //                      CORE FUNCTIONS
    // =============================================================

    function buyNextTile(uint24 _color, string calldata _url) external {
        require(nextId <= MAX_SUPPLY, "Grid is full");
        uint256 tileId = nextId;

        // Transfer USDC to THIS contract (Holding for End Game)
        bool success = usdc.transferFrom(msg.sender, address(this), TILE_PRICE);
        require(success, "USDC transfer failed");

        _mint(msg.sender, tileId);
        tiles[tileId] = Tile({url: _url, color: _color});

        emit TilePurchased(tileId, msg.sender, _color, _url);
        nextId++;
    }

    // =============================================================
    //                      PYTH ENTROPY SDK
    // =============================================================

    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }

    // =============================================================
    //                      END GAME (PYTH)
    // =============================================================

    // Step 1: Trigger the random number request
    // Requires a small ETH fee for Pyth
    function triggerEndGame(bytes32 userRandomNumber) external payable {
        require(nextId > MAX_SUPPLY, "Grid not full yet");
        require(!endGameTriggered, "End game already triggered");

        uint256 fee = entropy.getFee(entropyProvider);
        require(msg.value >= fee, "Insufficient ETH for Pyth fee");

        uint64 seq = entropy.requestWithCallback{value: fee}(
            entropyProvider,
            userRandomNumber
        );

        endGameSequenceNumber = seq;
        endGameTriggered = true;
        emit EndGameRequested(seq);
    }

    // Step 2: Pyth calls this back with randomness
    function entropyCallback(
        uint64 sequenceNumber,
        address provider,
        bytes32 randomNumber
    ) internal override {
        require(sequenceNumber == endGameSequenceNumber, "Invalid sequence");
        require(provider == entropyProvider, "Invalid provider");
        require(!endGameCompleted, "Already completed");

        // Use randomness to pick unique winners
        // Simple shuffle-like selection
        uint256[] memory pool = new uint256[](MAX_SUPPLY);
        for(uint256 i=0; i<MAX_SUPPLY; i++) {
            pool[i] = i + 1; // IDs 1 to MAX_SUPPLY
        }

        // Fisher-Yates shuffle (partial) to pick NUM_BENEFICIARIES
        uint256 randomInt = uint256(randomNumber);
        
        for(uint256 i=0; i<NUM_BENEFICIARIES; i++) {
            // Re-hash for each step to get "fresh" randomness
            randomInt = uint256(keccak256(abi.encode(randomInt, i)));
            
            uint256 indexToPick = i + (randomInt % (MAX_SUPPLY - i));
            
            // Swap
            uint256 temp = pool[i];
            pool[i] = pool[indexToPick];
            pool[indexToPick] = temp;

            beneficiaries.push(pool[i]);
        }

        endGameCompleted = true;
        distributePot();
        emit EndGameCompleted(beneficiaries);
    }

    function distributePot() internal {
        uint256 totalBalance = usdc.balanceOf(address(this));
        if (NUM_BENEFICIARIES > 0 && totalBalance > 0) {
            uint256 payoutPerWinner = totalBalance / NUM_BENEFICIARIES;

            for(uint256 i=0; i<beneficiaries.length; i++) {
                address owner = ownerOf(beneficiaries[i]);
                if(owner != address(0)) {
                    usdc.transfer(owner, payoutPerWinner);
                    emit PayoutDistributed(owner, payoutPerWinner);
                }
            }
        }
    }

    // =============================================================
    //                         VIEW
    // =============================================================

    function getTile(uint256 _id) external view returns (Tile memory) {
        return tiles[_id];
    }

    function getBeneficiaries() external view returns (uint256[] memory) {
        return beneficiaries;
    }

    // Returns the Pyth fee needed to call triggerEndGame
    function getEntropyFee() external view returns (uint256) {
        return entropy.getFee(entropyProvider);
    }
}
