Pyth Prize Justification

I used Pyth’s Entropy SDK to generate trustless, verifiable randomness for apple spawning in BeSnake. Each seed is hashed with a log of all player inputs, which is then compared with the other player's hash. This lets us optimistically verify the winner and decide who to pay out. Since each game’s outcome directly affects real money (players stake ETH), we needed randomness that couldn’t be predicted, manipulated, or biased by either player (including me the developer). Pyth gave us on-chain, tamper-proof entropy so every apple spawn is provably fair, making gameplay transparent and preventing any RNG-based exploits.



Contract: https://github.com/xavierdmello/slithermoney/blob/main/contracts/contracts/Snake.sol

Deployed Link: https://base-sepolia.blockscout.com/address/0x82393d3dd11c31c252e120aa566bc59ac98cbd6b
