# Pyth-connector example
This example provides two main usage patterns for interacting with Pyth:

- **On-chain getter:**  
  `User → User JW → App JW → App → Pyth → App → ...`

- **Proxy call:**  
  `User → Pyth → App → ...`

You can use this example as a standalone module for sandbox testing. It exports functions to deploy and configure a local Pyth contract, making it easy to experiment without connecting to real on-chain contracts on testnet or mainnet.

This example uses a patched Pyth contract intended only for testing purposes in a local development environment. It accepts simplified prices without requiring a Merkle trie proof, so price authenticity is not verified.

<div style="border-radius: 8px; border: 1px solid #ffd700; background: #fffbe6; padding: 16px; margin: 16px 0;">
  <strong>Important:</strong> This patched contract is for <strong>testing purposes only</strong>. For production, always use the official Pyth contract deployed on mainnet.
</div>

The demonstration is fully sandboxed. You do not need the Hermes client, prices can be generated locally, for example:  **`{ TON: 3.456, USDC: 0.998, USDT: 0.999 }`**

## Project Structure

- `contracts/` — Source code of the smart contracts and their dependencies.
- `wrappers/` — TypeScript contract wrappers (implementing `Contract` from ton-core), including serialization/deserialization and compilation utilities.
- `tests/` — Unit and integration tests for the contracts.
- `scripts/` — Deployment and utility scripts.


## How to use

1. **Install Node.js version 22**  
   It is recommended to use [nvm](https://github.com/nvm-sh/nvm) for managing Node.js versions.  
   If you don't have nvm installed, run:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
   source ~/.bashrc
   ```
   Then install and use Node.js 22:
   ```bash
   nvm install 22
   nvm use 22
   ```

2. **Install Yarn** (if not already installed):
   ```bash
   npm install -g yarn
   ```

3. **Install project dependencies**  
   In the project root directory, run:
   ```bash
   yarn install
   ```

After these steps, you are ready to build, test, and use the example. See the sections below for more commands.

### Build
to build the module you can run:
   ```bash 
   yarn build
   ```

### Contracts
To prebuild contracts run:
   ```bash 
   yarn contracts
   ```

### Test
   ```bash
    yarn test:unit
   ```
    
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
