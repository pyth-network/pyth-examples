#!/bin/bash

echo "🚀 JuryDAO Redeployment Script"
echo "================================"

# Load environment variables
source .env

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Compiling contracts...${NC}"
forge build

if [ $? -ne 0 ]; then
    echo "❌ Compilation failed!"
    exit 1
fi

echo -e "${GREEN}✅ Compilation successful!${NC}"
echo ""

echo -e "${BLUE}🚀 Deploying contracts to Base Sepolia...${NC}"

# Deploy and capture output
DEPLOY_OUTPUT=$(forge script script/Deploy.s.sol \
    --rpc-url $BASE_SEPOLIA_RPC \
    --broadcast \
    --verify \
    -vvvv 2>&1)

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed!"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo "$DEPLOY_OUTPUT"

# Extract addresses from deployment output
TOKEN_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP "GovernanceToken deployed at: \K0x[a-fA-F0-9]{40}" | head -1)
REGISTRY_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP "JurorRegistry deployed at: \K0x[a-fA-F0-9]{40}" | head -1)
GOVERNOR_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP "GovernorSortition deployed at: \K0x[a-fA-F0-9]{40}" | head -1)

echo ""
echo -e "${GREEN}✅ Deployment successful!${NC}"
echo ""
echo -e "${YELLOW}📋 Deployed Addresses:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "GovernanceToken:  $TOKEN_ADDRESS"
echo "JurorRegistry:    $REGISTRY_ADDRESS"
echo "GovernorSortition: $GOVERNOR_ADDRESS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Update .env file
echo -e "${BLUE}📝 Updating .env file...${NC}"
sed -i.bak "s/VITE_GOVERNANCE_TOKEN=.*/VITE_GOVERNANCE_TOKEN=$TOKEN_ADDRESS/" .env
sed -i.bak "s/VITE_JUROR_REGISTRY=.*/VITE_JUROR_REGISTRY=$REGISTRY_ADDRESS/" .env
sed -i.bak "s/VITE_GOVERNOR_SORTITION=.*/VITE_GOVERNOR_SORTITION=$GOVERNOR_ADDRESS/" .env

echo -e "${GREEN}✅ .env updated successfully!${NC}"
echo ""

echo -e "${BLUE}🔗 Explorer Links:${NC}"
echo "Token:    https://sepolia.basescan.org/address/$TOKEN_ADDRESS"
echo "Registry: https://sepolia.basescan.org/address/$REGISTRY_ADDRESS"
echo "Governor: https://sepolia.basescan.org/address/$GOVERNOR_ADDRESS"
echo ""

echo -e "${YELLOW}⚠️  Next Steps:${NC}"
echo "1. Restart your frontend: npm run dev"
echo "2. Hard refresh browser: Ctrl+Shift+R"
echo "3. Test proposal creation with 0.005 ETH"
echo ""
echo -e "${GREEN}🎉 All done!${NC}"
