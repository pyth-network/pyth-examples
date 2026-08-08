// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/* ---- Minimal Pyth Entropy interface ---- */
interface IEntropy {
    function getDefaultProvider() external view returns (address);
    function getFee(address provider) external view returns (uint128);
    function requestWithCallback(address provider, bytes32 userRandomNumber)
        external
        payable
        returns (uint64 assignedSequenceNumber);
}

contract PlinkoEntropy {
    // ======= CONFIG =======
    // Pyth Entropy on Base Sepolia (official address)
    address public constant ENTROPY = 0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c;

    IEntropy public immutable entropy;
    address public immutable provider;

    address public owner;
    uint256 public nonce;

    uint8 public constant ROWS = 12;
    // multiplier * 1e6 for bins 0..12
    uint256[13] public payoutX;

    struct Bet {
        address player;
        uint256 stakeWei;
        uint8 rows;
    }

    mapping(uint64 => Bet) public bets;

    event BetRequested(uint64 seq, address indexed player, uint256 stakeWei, uint8 rows);
    event BetSettled(uint64 seq, address indexed player, uint256 stakeWei, uint8 rows, uint256 bin, uint256 payout);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyEntropy() {
        require(msg.sender == ENTROPY, "only entropy");
        _;
    }

    constructor() {
        owner = msg.sender;
        entropy = IEntropy(ENTROPY);
        provider = entropy.getDefaultProvider();

        payoutX = [
            uint256(2000000),
            1300000,
            1100000,
            900000,
            800000,
            700000,
            600000,
            700000,
            800000,
            900000,
            1100000,
            1300000,
            2000000
        ];
    }

    receive() external payable {}

    function setOwner(address newOwner) external onlyOwner { owner = newOwner; }

    function getCurrentFee() public view returns (uint128) {
        return entropy.getFee(provider);
    }

    function play(uint8 rows) external payable returns (uint64 seq) {
        require(rows == ROWS, "unsupported rows");
        uint128 fee = entropy.getFee(provider);
        require(msg.value > fee, "value must cover fee+stake");

        uint256 stake = msg.value - fee;

        bytes32 userRandom = keccak256(abi.encodePacked(msg.sender, blockhash(block.number - 1), nonce++));
        seq = entropy.requestWithCallback{value: fee}(provider, userRandom);

        bets[seq] = Bet({player: msg.sender, stakeWei: stake, rows: rows});
        emit BetRequested(seq, msg.sender, stake, rows);
    }

    // === This is the function Pyth Entropy will call ===
    function entropyCallback(uint64 sequence, address /*providerAddr*/, bytes32 randomNumber) external onlyEntropy {
        Bet memory b = bets[sequence];
        require(b.player != address(0), "unknown seq");
        delete bets[sequence];

        uint256 r = uint256(randomNumber);
        uint256 ones;
        unchecked {
            for (uint8 i = 0; i < ROWS; i++) {
                ones += (r >> i) & 1;
            }
        }
        uint256 bin = ones; // 0..12

        uint256 mult = payoutX[bin]; // *1e6
        uint256 payout = (b.stakeWei * mult) / 1_000_000;

        if (payout > 0) {
            (bool ok, ) = b.player.call{value: payout}("");
            require(ok, "payout failed");
        }

        emit BetSettled(sequence, b.player, b.stakeWei, b.rows, bin, payout);
    }

    function setPayoutRow(uint8 idx, uint256 multX1e6) external onlyOwner {
        require(idx < payoutX.length, "idx");
        payoutX[idx] = multX1e6;
    }

    function withdraw(address to, uint256 amt) external onlyOwner {
        (bool ok, ) = to.call{value: amt}("");
        require(ok, "withdraw failed");
    }
}
