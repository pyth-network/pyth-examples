Flare

I used Flare's Secure Random Number Generator to generate trustless, verifiable randomness for apple spawning in SlitherMoney. Each seed is hashed with a log of all player inputs, which is then compared with the other player's hash. This lets us optimistically verify the winner and decide who to pay out. Since each game’s outcome directly affects real money (players stake USDC), we needed randomness that couldn’t be predicted, manipulated, or biased by either player (including me the developer). Flare gave us on-chain, tamper-proof entropy so every apple spawn is provably fair, making gameplay transparent and preventing any RNG-based exploits.

Additionally, we deployed our on-chain gaming smart contracts on flare.

Link to code: https://github.com/xavierdmello/slithermoney/blob/main/contracts/contracts/Snake.sol
