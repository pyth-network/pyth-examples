#!/bin/bash
# Script per flattenare tutti i contratti per verifica manuale

echo "📦 Flattening contracts for manual verification..."
echo ""

cd "$(dirname "$0")/.."

# Crea directory per i file flattened
mkdir -p flattened

# Flatten tutti i contratti principali
echo "1. MegaYieldLottery..."
npx hardhat flatten contracts/MegaYieldLottery.sol > flattened/MegaYieldLottery_flat.sol
echo "   ✅ flattened/MegaYieldLottery_flat.sol"

echo ""
echo "2. PythIntegration..."
npx hardhat flatten contracts/PythIntegration.sol > flattened/PythIntegration_flat.sol
echo "   ✅ flattened/PythIntegration_flat.sol"

echo ""
echo "3. AaveIntegration..."
npx hardhat flatten contracts/AaveIntegration.sol > flattened/AaveIntegration_flat.sol
echo "   ✅ flattened/AaveIntegration_flat.sol"

echo ""
echo "4. MegaYieldVesting..."
npx hardhat flatten contracts/MegaYieldVesting.sol > flattened/MegaYieldVesting_flat.sol
echo "   ✅ flattened/MegaYieldVesting_flat.sol"

echo ""
echo "✅ All contracts flattened!"
echo ""
echo "📝 Use these files for manual verification on Basescan:"
echo "   - flattened/MegaYieldLottery_flat.sol"
echo "   - flattened/PythIntegration_flat.sol"
echo "   - flattened/AaveIntegration_flat.sol"
echo "   - flattened/MegaYieldVesting_flat.sol"

