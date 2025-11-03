#!/bin/bash

# Load from .env
source .env

# Get governor address
GOVERNOR_ADDRESS=$(grep "VITE_GOVERNOR_SORTITION" .env | cut -d '=' -f2)

echo "💰 Withdrawing from contract: $GOVERNOR_ADDRESS"
echo "Using deployer wallet..."

# Call withdrawFees
cast send $GOVERNOR_ADDRESS \
  "withdrawFees()" \
  --private-key $PRIVATE_KEY \
  --rpc-url $BASE_SEPOLIA_RPC \
  --gas-limit 200000

echo "✅ Withdrawal complete!"
