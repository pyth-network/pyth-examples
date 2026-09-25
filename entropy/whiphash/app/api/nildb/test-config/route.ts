import { NextResponse } from 'next/server';
import { config as loadEnv } from 'dotenv';

// Load environment variables
loadEnv();

// Configuration from environment variables
const config = {
  NILCHAIN_URL: process.env.NILCHAIN_URL,
  NILAUTH_URL: process.env.NILAUTH_URL,
  NILDB_NODES: process.env.NILDB_NODES?.split(',') || [],
  BUILDER_PRIVATE_KEY: process.env.BUILDER_PRIVATE_KEY,
};

export async function GET() {
  const missingVars = [];
  if (!config.BUILDER_PRIVATE_KEY) missingVars.push('BUILDER_PRIVATE_KEY');
  if (!config.NILCHAIN_URL) missingVars.push('NILCHAIN_URL');
  if (!config.NILAUTH_URL) missingVars.push('NILAUTH_URL');
  if (!config.NILDB_NODES || config.NILDB_NODES.length === 0) missingVars.push('NILDB_NODES');

  // Validate private key format
  let privateKeyValid = false;
  let privateKeyError = '';
  
  if (config.BUILDER_PRIVATE_KEY) {
    try {
      if (config.BUILDER_PRIVATE_KEY.startsWith('0x') && config.BUILDER_PRIVATE_KEY.length === 66) {
        privateKeyValid = true;
      } else if (!config.BUILDER_PRIVATE_KEY.startsWith('0x') && config.BUILDER_PRIVATE_KEY.length === 64) {
        privateKeyValid = true;
      } else {
        privateKeyError = 'Invalid format - must be 64 hex chars or 66 chars with 0x prefix';
      }
    } catch (error) {
      privateKeyError = 'Invalid hex string';
    }
  }

  return NextResponse.json({
    configured: missingVars.length === 0 && privateKeyValid,
    missingVariables: missingVars,
    privateKeyValid,
    privateKeyError,
    config: {
      NILCHAIN_URL: config.NILCHAIN_URL ? 'Set' : 'Not set',
      NILAUTH_URL: config.NILAUTH_URL ? 'Set' : 'Not set',
      NILDB_NODES: config.NILDB_NODES.length > 0 ? `${config.NILDB_NODES.length} nodes` : 'Not set',
      BUILDER_PRIVATE_KEY: config.BUILDER_PRIVATE_KEY ? 
        (privateKeyValid ? 'Valid format' : `Invalid: ${privateKeyError}`) : 'Not set',
    },
    recommendations: missingVars.length > 0 ? [
      'Set up environment variables in .env.local',
      'Get values from Nillion documentation',
      'Ensure BUILDER_PRIVATE_KEY is a valid hex string'
    ] : privateKeyValid ? [
      'All configuration looks good!',
      'NilDB should work properly'
    ] : [
      'Fix BUILDER_PRIVATE_KEY format',
      'Must be 64 hex characters or 66 with 0x prefix'
    ]
  });
}
