# Pyth Lazer Sui Implementation

**⚠️ DISCLAIMER: This is an example implementation for demonstration purposes only. It has not been audited and should be used at your own risk. Do not use this code in production without proper security review and testing.**

A Sui Move implementation example for parsing and validating [Pyth Lazer](https://docs.pyth.network/lazer) price feed updates. This project demonstrates on-chain verification and parsing of cryptographically signed price feed data from the Pyth Network's high-frequency Lazer protocol. Look at the [`lazer_example` module](./sources/lazer_example.move) for the main implementation.

## Prerequisites

- [Sui CLI](https://docs.sui.io/guides/developer/getting-started/sui-install) installed
- Basic familiarity with Move programming language

## Building and Testing the Project

1. **Build the project**:
   ```bash
   sui move build
   ```

2. **Run all tests**:
```bash
sui move test
```

**Run specific test**:
```bash
sui move test test_parse_and_validate_update
```

## Important Notes
- The `parse_and_validate_update` function uses a single hardcoded public key for signature verification. However, in a real-world scenario, the set of valid public keys may change over time, and multiple keys might be required. For production use, store the authorized public keys in the contract's configuration storage and reference them dynamically, rather than relying on a hardcoded value.
- There is no proper error handling in the `parse_and_validate_update` function and all the assertions use the same error code (0).
