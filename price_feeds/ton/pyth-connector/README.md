# Pyth-connector example
Provides onchain-getter: User -> User JettonWallet -> App -> Pyth -> App -> ... 
and proxy call: User -> Pyth -> App -> ... pyth usage examples. 

This example can be used as a separate module providing tools for sandbox testing: exports functions for deploying and configuring a local pyth contract

It shows techniques how to use the pyth oracle in finacial applications.
The demonstration is fully sandboxed and doesn't need real on-chain contracts nor testnet neither mainnet.
Usage of hermes client is also not required: prices can be formed locally, e.g. **{TON: 3.12345, USDC: 0.998, USDT: 0.999}.**

## Project structure

- `contracts` - source code of all the smart contracts of the project and their dependencies.
- `wrappers` - wrapper classes (implementing `Contract` from ton-core) for the contracts, including any [de]serialization primitives and compilation functions.
- `tests` - tests for the contracts.
- `scripts` - scripts used by the project, mainly the deployment scripts.

## How to use
First you need to install dependencies, node v22 is required, you can use nvm to install it: `nvm use 22` .
Then install dependencies, just run `yarn`

### Build
to build the module you can run`yarn build`

### Contracts
To prebuild contracts run`yarn contracts`

### Test
`yarn test:unit`
    
### Deploy
You don't need to deploy this example's contracts to testnet/mainnet,

## Important Note on Message Handling

When using the Pyth price feed in the recommended flow (User/App -> Pyth -> Protocol), be aware that:

### Security Warning ⚠️

**CRITICAL**: Integrators MUST validate the sender address in their receive function to ensure messages are coming from the Pyth Oracle contract. Failure to do so could allow attackers to:

- Send invalid price responses
- Impersonate users via the sender_address and custom_payload fields
- Potentially drain the protocol

### Message Bouncing Behavior

- If the target protocol bounces the message (e.g., due to invalid custom payload or other errors), the forwarded TON will remain in the Pyth contract and will not be automatically refunded to the original sender.
- This could be significant when dealing with large amounts of TON (e.g., in DeFi operations).
- Integrators should implement proper error handling and refund mechanisms in their applications.
