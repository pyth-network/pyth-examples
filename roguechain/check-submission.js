#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('🔍 RogueChain ETHGlobal Submission Check\n');

// Check if all required files exist
const requiredFiles = [
    'contracts/RogueChain.sol',
    'frontend/index.html',
    'frontend/app.js',
    'frontend/abi.json',
    'hardhat.config.ts',
    'package.json',
    'README.md',
    'ignition/modules/RogueChain.ts'
];

console.log('📁 Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - MISSING`);
        allFilesExist = false;
    }
});

// Check package.json for required dependencies
console.log('\n📦 Checking dependencies...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredDeps = [
    '@openzeppelin/contracts',
    '@pythnetwork/pyth-sdk-solidity',
    'ethers',
    'hardhat',
    'dotenv'
];

requiredDeps.forEach(dep => {
    if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
        console.log(`✅ ${dep}`);
    } else {
        console.log(`❌ ${dep} - MISSING`);
        allFilesExist = false;
    }
});

// Check contract compilation
console.log('\n🔧 Checking contract compilation...');
try {
    const artifactsPath = 'artifacts/contracts/RogueChain.sol/RogueChain.json';
    if (fs.existsSync(artifactsPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactsPath, 'utf8'));
        if (artifact.abi && artifact.bytecode) {
            console.log('✅ Contract compiled successfully');
            console.log(`   - ABI functions: ${artifact.abi.length}`);
            console.log(`   - Bytecode length: ${artifact.bytecode.length}`);
        } else {
            console.log('❌ Contract compilation incomplete');
            allFilesExist = false;
        }
    } else {
        console.log('❌ Contract not compiled');
        allFilesExist = false;
    }
} catch (e) {
    console.log('❌ Error checking contract compilation:', e.message);
    allFilesExist = false;
}

// Check deployment
console.log('\n🚀 Checking deployment...');
const deployedAddressesPath = 'ignition/deployments/chain-11155420/deployed_addresses.json';
if (fs.existsSync(deployedAddressesPath)) {
    const deployed = JSON.parse(fs.readFileSync(deployedAddressesPath, 'utf8'));
    if (deployed['RogueChainModule#RogueChain']) {
        console.log('✅ Contract deployed successfully');
        console.log(`   - Address: ${deployed['RogueChainModule#RogueChain']}`);
    } else {
        console.log('❌ Contract deployment not found');
        allFilesExist = false;
    }
} else {
    console.log('❌ No deployment found');
    allFilesExist = false;
}

// Check README quality
console.log('\n📖 Checking README quality...');
const readme = fs.readFileSync('README.md', 'utf8');
const readmeChecks = [
    { name: 'Live Demo Link', test: /https:\/\/rogue-chain\.vercel\.app/ },
    { name: 'Contract Address', test: /0x[a-fA-F0-9]{40}/ },
    { name: 'Technical Stack', test: /Solidity|Ethers\.js|Pyth/ },
    { name: 'Features List', test: /## .*Features/ },
    { name: 'Installation Guide', test: /npm install/ },
    { name: 'ETHGlobal Mention', test: /ETHGlobal/ }
];

let readmeScore = 0;
readmeChecks.forEach(check => {
    if (check.test.test(readme)) {
        console.log(`✅ ${check.name}`);
        readmeScore++;
    } else {
        console.log(`❌ ${check.name} - MISSING`);
    }
});

// Check frontend functionality
console.log('\n🎨 Checking frontend...');
const indexHtml = fs.readFileSync('frontend/index.html', 'utf8');
const appJs = fs.readFileSync('frontend/app.js', 'utf8');

const frontendChecks = [
    { name: 'Ethers.js CDN', test: /ethers@5\.7\.2/ },
    { name: 'Contract Address', test: /0x01b4b5227A1234A32b23bdBCF63C354f1253C963/ },
    { name: 'Wallet Connection', test: /connectWallet/ },
    { name: 'Hero Minting', test: /mintHero/ },
    { name: 'Dungeon Entry', test: /enterDungeon/ },
    { name: 'Pyth Integration', test: /pyth|hermes/ }
];

let frontendScore = 0;
frontendChecks.forEach(check => {
    if (check.test.test(indexHtml) || check.test.test(appJs)) {
        console.log(`✅ ${check.name}`);
        frontendScore++;
    } else {
        console.log(`❌ ${check.name} - MISSING`);
    }
});

// Final summary
console.log('\n📊 SUBMISSION READINESS SUMMARY');
console.log('================================');

const totalChecks = requiredFiles.length + requiredDeps.length + 3; // files + deps + compilation + deployment + readme + frontend
const passedChecks = (allFilesExist ? requiredFiles.length : 0) + 
                    requiredDeps.length + 
                    (allFilesExist ? 3 : 0) + 
                    readmeScore + 
                    frontendScore;

const readinessPercentage = Math.round((passedChecks / totalChecks) * 100);

console.log(`\nOverall Readiness: ${readinessPercentage}%`);

if (readinessPercentage >= 90) {
    console.log('🎉 EXCELLENT! Ready for ETHGlobal submission');
} else if (readinessPercentage >= 80) {
    console.log('✅ GOOD! Minor improvements needed');
} else if (readinessPercentage >= 70) {
    console.log('⚠️  FAIR! Several issues need attention');
} else {
    console.log('❌ NOT READY! Major issues need to be fixed');
}

console.log('\n📋 Next Steps:');
if (readinessPercentage < 100) {
    console.log('1. Fix any missing files or dependencies');
    console.log('2. Ensure contract is compiled and deployed');
    console.log('3. Test frontend functionality thoroughly');
    console.log('4. Update README with any missing information');
} else {
    console.log('1. ✅ All checks passed!');
    console.log('2. 🚀 Ready to submit to ETHGlobal!');
    console.log('3. 📤 Upload your project files');
    console.log('4. 🎯 Include the live demo link: https://rogue-chain.vercel.app/');
}

console.log('\n🔗 Live Demo: https://rogue-chain.vercel.app/');
console.log('📧 Contract: 0x01b4b5227A1234A32b23bdBCF63C354f1253C963');
console.log('🌐 Network: Optimism Sepolia');
