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

contract EntropyArcadeV1 {
    /* ========= CONFIG ========= */
    // Pyth Entropy on Base Sepolia (same as your Plinko)
    address public constant ENTROPY = 0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c;

    IEntropy public immutable entropy;
    address public immutable provider;

    address public owner;
    uint256 public nonce;

    /* ========= ADMIN ========= */
    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }
    modifier onlyEntropy() { require(msg.sender == ENTROPY, "only entropy"); _; }

    constructor() {
        owner = msg.sender;
        entropy = IEntropy(ENTROPY);
        provider = entropy.getDefaultProvider();
    }

    function setOwner(address nw) external onlyOwner { owner = nw; }

    /* ========= FEE ========= */
    function getCurrentFee() public view returns (uint128) {
        return entropy.getFee(provider);
    }

    /* ========= REENTRANCY GUARD ========= */
    bool private locked;
    modifier nonReentrant() {
        require(!locked, "reentrancy");
        locked = true;
        _;
        locked = false;
    }

    /* ========= GAMES ========= */
    enum Game { None, Wheel, Mines, DeckSeed }

    struct Bet {
        address player;
        uint128 stakeWei;  // stake (fee is paid to entropy directly)
        uint64  p1;        // game-specific packed params
        uint64  p2;        // game-specific packed params
        Game    game;
    }

    mapping(uint64 => Bet) public bets; // seq => Bet

    /* ========= WHEEL =========
       risk: 0=low, 1=medium, 2=high
       segments: one of {10,20,30,40,50}
    */
    event WheelRequested(uint64 indexed seq, address indexed player, uint256 stakeWei, uint8 risk, uint8 segments);
    event WheelSettled(uint64 indexed seq, address indexed player, uint8 risk, uint8 segments, uint256 index, uint256 multX1e6, uint256 payout);

    function spinWheel(uint8 risk, uint8 segments) external payable returns (uint64 seq) {
        require(risk <= 2, "bad risk");
        require(_validSegments(segments), "bad segments");
        uint128 fee = entropy.getFee(provider);
        require(msg.value > fee, "value must cover fee+stake");
        uint256 stake = msg.value - fee;

        bytes32 userRandom = keccak256(abi.encodePacked(msg.sender, blockhash(block.number - 1), nonce++));
        seq = entropy.requestWithCallback{value: fee}(provider, userRandom);

        bets[seq] = Bet({
            player: msg.sender,
            stakeWei: uint128(stake),
            p1: uint64(risk),
            p2: uint64(segments),
            game: Game.Wheel
        });

        emit WheelRequested(seq, msg.sender, stake, risk, segments);
    }

    /* ========= MINES =========
       Flow:
       1) startMines(m) pays fee+stake, requests entropy. seq is the session id.
       2) entropyCallback fixes the hidden board (mineMask) and marks "ready".
       3) cashoutMines(seq, revealMask) -> verifies revealMask ∩ mineMask.
          If hit any mine => payout=0. Else payout = stake * combiMultiplier * houseEdge.
    */
    event MinesStarted(uint64 indexed seq, address indexed player, uint256 stakeWei, uint8 mineCount);
    event MinesReady(uint64 indexed seq, address indexed player, uint8 mineCount); // board fixed (after callback)
    event MinesSettled(uint64 indexed seq, address indexed player, uint8 mineCount, uint32 revealMask, bool hitMine, uint256 safeReveals, uint256 payout, uint32 mineMask);

    struct MinesSession {
        address player;
        uint128 stakeWei;
        uint8   mineCount;    // 1..24
        bool    ready;        // true after callback fixes mineMask
        bool    settled;
        uint32  mineMask;     // 25-bit mine positions
    }
    mapping(uint64 => MinesSession) public mines; // seq => session

    uint32 public minesHouseEdgeX1e6 = 990000; // 0.99 by default (same feel as your UI)

    function setMinesHouseEdge(uint32 x1e6) external onlyOwner {
        require(x1e6 <= 1_000_000, "edge>1");
        minesHouseEdgeX1e6 = x1e6;
    }

    function startMines(uint8 mineCount) external payable returns (uint64 seq) {
        require(mineCount >= 1 && mineCount <= 24, "bad mineCount");
        uint128 fee = entropy.getFee(provider);
        require(msg.value > fee, "value must cover fee+stake");
        uint256 stake = msg.value - fee;

        bytes32 userRandom = keccak256(abi.encodePacked(msg.sender, blockhash(block.number - 1), nonce++));
        seq = entropy.requestWithCallback{value: fee}(provider, userRandom);

        mines[seq] = MinesSession({
            player: msg.sender,
            stakeWei: uint128(stake),
            mineCount: mineCount,
            ready: false,
            settled: false,
            mineMask: 0
        });

        // Also put into bets so callback knows to route into Mines
        bets[seq] = Bet({
            player: msg.sender,
            stakeWei: uint128(stake),
            p1: uint64(mineCount),
            p2: 0,
            game: Game.Mines
        });

        emit MinesStarted(seq, msg.sender, stake, mineCount);
    }

    function cashoutMines(uint64 seq, uint32 revealMask25) external nonReentrant {
        MinesSession storage s = mines[seq];
        require(s.player == msg.sender, "not your session");
        require(s.ready, "not ready");
        require(!s.settled, "already settled");

        uint32 mask = revealMask25 & 0x1FFFFFF; // only 25 bits
        bool hit = (mask & s.mineMask) != 0;

        uint256 payout = 0;
        uint256 safeReveals = 0;

        if (!hit) {
            safeReveals = _popcount(mask);
            require(safeReveals >= 1, "need >=1 reveal");

            // multiplier = Π_{i=0..g-1} (25 - i) / (25 - m - i) * houseEdge
            // Do it with 1e6 fixed-point
            uint256 multX1e6 = 1_000_000;
            unchecked {
                for (uint256 i = 0; i < safeReveals; i++) {
                    // multiply first then divide to preserve precision
                    multX1e6 = (multX1e6 * (25 - i)) / (25 - s.mineCount - i);
                }
            }
            multX1e6 = (multX1e6 * minesHouseEdgeX1e6) / 1_000_000;

            payout = (uint256(s.stakeWei) * multX1e6) / 1_000_000;
        } else {
            payout = 0;
        }

        s.settled = true;

        if (payout > 0) {
            (bool ok, ) = s.player.call{value: payout}("");
            require(ok, "payout failed");
        }

        emit MinesSettled(seq, s.player, s.mineCount, mask, hit, safeReveals, payout, s.mineMask);
    }

    /* ========= POKER DECK SEED =========
       Fee-only request; emits the random number so the client can provably shuffle.
    */
    event DeckSeedRequested(uint64 indexed seq, address indexed player);
    event DeckSeedIssued(uint64 indexed seq, address indexed player, bytes32 seed);

    function requestDeckSeed() external payable returns (uint64 seq) {
        uint128 fee = entropy.getFee(provider);
        require(msg.value == fee, "exact fee required");

        bytes32 userRandom = keccak256(abi.encodePacked(msg.sender, blockhash(block.number - 1), nonce++));
        seq = entropy.requestWithCallback{value: fee}(provider, userRandom);

        bets[seq] = Bet({
            player: msg.sender,
            stakeWei: 0,
            p1: 0,
            p2: 0,
            game: Game.DeckSeed
        });

        emit DeckSeedRequested(seq, msg.sender);
    }

    /* ========= CALLBACK ========= */
    function entropyCallback(uint64 sequence, address /*providerAddr*/, bytes32 randomNumber) external onlyEntropy {
        Bet memory b = bets[sequence];
        require(b.player != address(0), "unknown seq");
        delete bets[sequence];

        if (b.game == Game.Wheel) {
            uint8 risk = uint8(b.p1);
            uint8 segments = uint8(b.p2);
            uint256 idx = uint256(randomNumber) % segments;
            uint256 multX1e6 = _wheelMultiplierX1e6(risk, segments, idx);

            uint256 payout = (uint256(b.stakeWei) * multX1e6) / 1_000_000;
            if (payout > 0) {
                (bool ok, ) = b.player.call{value: payout}("");
                require(ok, "payout failed");
            }
            emit WheelSettled(sequence, b.player, risk, segments, idx, multX1e6, payout);
        }
        else if (b.game == Game.Mines) {
            // fix the board for this session
            MinesSession storage s = mines[sequence];
            require(s.player == b.player && !s.ready, "mines ready");
            // derive a 25-bit mine set uniformly by Fisher–Yates
            uint32 mask = _minesMaskFromRandom(randomNumber, s.mineCount);
            s.mineMask = mask;
            s.ready = true;
            emit MinesReady(sequence, s.player, s.mineCount);
        }
        else if (b.game == Game.DeckSeed) {
            emit DeckSeedIssued(sequence, b.player, randomNumber);
        }
        else {
            revert("bad game");
        }
    }

    /* ========= OWNER ========= */
    function withdraw(address to, uint256 amt) external onlyOwner {
        (bool ok, ) = to.call{value: amt}("");
        require(ok, "withdraw failed");
    }

    receive() external payable {}

    /* ========= INTERNALS ========= */

    function _validSegments(uint8 s) internal pure returns (bool) {
        return (s == 10 || s == 20 || s == 30 || s == 40 || s == 50);
    }

    // EXACTLY match your front-end Spin Wheel tables/patterns (scaled 1e6).
    function _wheelMultiplierX1e6(uint8 risk, uint8 segments, uint256 i) internal pure returns (uint256) {
        // low
        if (risk == 0) {
            if (segments == 10) {
                uint256[10] memory arr = [uint256(1500000),1200000,1200000,1200000,1200000,0,1200000,1200000,1200000,1200000];
                return arr[i];
            } else if (segments == 20) {
                uint256[20] memory arr = [uint256(1500000),1200000,1100000,1100000,1100000,1100000,1100000,1100000,0,1100000,1100000,1100000,1100000,1100000,1100000,1100000,1100000,1200000,1200000,1500000];
                return arr[i];
            } else if (segments == 30) {
                // i==0:1.5, i==14:0, i==29:1.5, else (i%3==0?1.2:1.1)
                if (i==0) return 1500000;
                if (i==14) return 0;
                if (i==29) return 1500000;
                return (i%3==0) ? 1200000 : 1100000;
            } else if (segments == 40) {
                if (i==0) return 1500000;
                if (i==19) return 0;
                if (i==39) return 1500000;
                return (i%4==0) ? 1200000 : 1100000;
            } else { // 50
                if (i==0) return 1500000;
                if (i==24) return 0;
                if (i==49) return 1500000;
                return (i%5==0) ? 1200000 : 1100000;
            }
        }
        // medium
        else if (risk == 1) {
            if (segments == 10) {
                uint256[10] memory arr = [uint256(2000000),1500000,1300000,1500000,1300000,0,1300000,1500000,1300000,1500000];
                return arr[i];
            } else if (segments == 20) {
                uint256[20] memory arr = [uint256(3000000),1800000,1500000,1300000,1300000,1100000,1300000,1300000,1500000,0,1500000,1300000,1300000,1100000,1300000,1300000,1500000,1800000,2000000,3000000];
                return arr[i];
            } else if (segments == 30) {
                if (i==0) return 3000000;
                if (i==14) return 0;
                if (i==29) return 3000000;
                if (i%3==0) return 1800000;
                if (i%2==0) return 1500000;
                return 1300000;
            } else if (segments == 40) {
                if (i==0) return 3000000;
                if (i==19) return 0;
                if (i==39) return 3000000;
                if (i%4==0) return 1800000;
                if (i%2==0) return 1500000;
                return 1300000;
            } else { // 50
                if (i==0) return 3000000;
                if (i==24) return 0;
                if (i==49) return 3000000;
                if (i%5==0) return 1800000;
                if (i%2==0) return 1500000;
                return 1300000;
            }
        }
        // high
        else {
            if (segments == 10) {
                uint256[10] memory arr = [uint256(5000000),2000000,1500000,2000000,1500000,0,1500000,2000000,1500000,2000000];
                return arr[i];
            } else if (segments == 20) {
                uint256[20] memory arr = [uint256(10000000),3000000,2000000,1800000,1500000,1300000,1500000,1800000,2000000,0,2000000,1800000,1500000,1300000,1500000,1800000,2000000,3000000,5000000,10000000];
                return arr[i];
            } else if (segments == 30) {
                if (i==0) return 10000000;
                if (i==14) return 0;
                if (i==29) return 10000000;
                if (i%6==0) return 5000000;
                if (i%3==0) return 3000000;
                if (i%2==0) return 2000000;
                return 1500000;
            } else if (segments == 40) {
                if (i==0) return 10000000;
                if (i==19) return 0;
                if (i==39) return 10000000;
                if (i%8==0) return 5000000;
                if (i%4==0) return 3000000;
                if (i%2==0) return 2000000;
                return 1500000;
            } else { // 50
                if (i==0) return 10000000;
                if (i==24) return 0;
                if (i==49) return 10000000;
                if (i%10==0) return 5000000;
                if (i%5==0) return 3000000;
                if (i%2==0) return 2000000;
                return 1500000;
            }
        }
    }

    function _minesMaskFromRandom(bytes32 rnd, uint8 mineCount) internal pure returns (uint32 mask) {
        // Fisher–Yates on 0..24 using keccak(rnd, step) as RNG source.
        uint8[25] memory arr;
        for (uint8 i = 0; i < 25; i++) { arr[i] = i; }
        bytes32 state = rnd;
        for (uint8 i = 0; i < 25; i++) {
            state = keccak256(abi.encodePacked(state, i));
            uint256 r = uint256(state);
            uint8 j = uint8(i + (r % (25 - i)));
            (arr[i], arr[j]) = (arr[j], arr[i]);
        }
        // mines = first m indices
        for (uint8 k = 0; k < mineCount; k++) {
            mask |= (uint32(1) << arr[k]);
        }
    }

    function _popcount(uint32 x) internal pure returns (uint32 c) {
        while (x != 0) {
            x &= (x - 1);
            c++;
        }
    }
}
