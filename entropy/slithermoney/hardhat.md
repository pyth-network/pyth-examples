Hardhat

I relied on Hardhat 3 throughout the entire smart contract development lifecycle. We have scripts for testing and, deploying, and automatic verification of smart contracts on Blockscout. It handled compilation, local node simulation, network forking, unit testing, gas usage checks, and eventual deployment. Hardhat 3’s upgraded task runner and debugging experience made it easier to validate the staking logic, payout flow, and randomness integration. Without Hardhat 3, iterating quickly on a game with time-sensitive state changes and multiple RNG dependencies would’ve been far slower and more error-prone. 

Deploy Script (Auto verification on Blockscout): https://github.com/xavierdmello/slithermoney/blob/main/contracts/scripts/deploy.ts
