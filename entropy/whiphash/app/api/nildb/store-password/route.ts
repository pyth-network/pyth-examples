import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { config as loadEnv } from 'dotenv';

// Load environment variables
loadEnv();

// Import Nillion SDK components
import {
  Keypair,
  NucTokenBuilder,
  Command,
} from '@nillion/nuc';
import {
  SecretVaultBuilderClient,
  SecretVaultUserClient,
} from '@nillion/secretvaults';

// Configuration from environment variables (same as demo.js)
const config = {
  NILCHAIN_URL: process.env.NILCHAIN_URL,
  NILAUTH_URL: process.env.NILAUTH_URL,
  NILDB_NODES: process.env.NILDB_NODES?.split(',') || [],
  BUILDER_PRIVATE_KEY: process.env.BUILDER_PRIVATE_KEY,
};

// Validate configuration
if (!config.BUILDER_PRIVATE_KEY) {
  console.error('❌ Please set BUILDER_PRIVATE_KEY in your .env file');
}

export async function POST(request: NextRequest) {
  try {
    const { password, name, metadata, socials } = await request.json();

    // Check all required environment variables
    const missingVars = [];
    if (!config.BUILDER_PRIVATE_KEY) missingVars.push('BUILDER_PRIVATE_KEY');
    if (!config.NILCHAIN_URL) missingVars.push('NILCHAIN_URL');
    if (!config.NILAUTH_URL) missingVars.push('NILAUTH_URL');
    if (!config.NILDB_NODES || config.NILDB_NODES.length === 0) missingVars.push('NILDB_NODES');

    if (missingVars.length > 0) {
      console.error('❌ Missing environment variables:', missingVars);
      return NextResponse.json(
        { error: `Missing environment variables: ${missingVars.join(', ')}` },
        { status: 500 }
      );
    }

    // Validate private key format
    try {
      if (!config.BUILDER_PRIVATE_KEY!.startsWith('0x') && config.BUILDER_PRIVATE_KEY!.length !== 64) {
        throw new Error('Invalid private key format');
      }
    } catch (keyError) {
      console.error('❌ Invalid BUILDER_PRIVATE_KEY format:', keyError);
      return NextResponse.json(
        { error: 'BUILDER_PRIVATE_KEY must be a valid hex string (64 characters or 0x prefixed)' },
        { status: 500 }
      );
    }

    console.log('💾 Storing password in NilDB using demo.js structure...');
    console.log('🔧 Config check:', {
      hasBuilderKey: !!config.BUILDER_PRIVATE_KEY,
      hasChainUrl: !!config.NILCHAIN_URL,
      hasAuthUrl: !!config.NILAUTH_URL,
      nodeCount: config.NILDB_NODES.length
    });
    console.log('📝 Received data:', {
      passwordLength: password?.length || 0,
      name: name,
      socialsLength: socials?.length || 0,
      socials: socials,
      hasMetadata: !!metadata
    });

    // Step 1: Create keypairs for builder and user (same as demo.js)
    let builderKeypair;
    try {
      console.log('🔑 Creating builder keypair...');
      builderKeypair = Keypair.from(config.BUILDER_PRIVATE_KEY!);
      console.log('✅ Builder keypair created successfully');
    } catch (keypairError) {
      console.error('❌ Failed to create builder keypair:', keypairError);
      return NextResponse.json(
        { error: 'Invalid BUILDER_PRIVATE_KEY format. Must be a valid hex string.' },
        { status: 500 }
      );
    }
    
    console.log('👤 Creating user keypair...');
    const userKeypair = Keypair.generate();
    console.log('✅ User keypair created successfully');

    const builderDid = builderKeypair.toDid().toString();
    const userDid = userKeypair.toDid().toString();

    console.log('Builder DID:', builderDid);
    console.log('User DID:', userDid);

    // Step 2: Create payer (same as demo.js)
    // const payer = await new PayerBuilder()
    //   .keypair(builderKeypair)
    //   .chainUrl(config.NILCHAIN_URL!)
    //   .build();

    // Step 3: Create builder client (same as demo.js)
    console.log('🏗️ Creating builder client...');
    const builder = await SecretVaultBuilderClient.from({
      keypair: builderKeypair,
      urls: {
        chain: config.NILCHAIN_URL!,
        auth: config.NILAUTH_URL!,
        dbs: config.NILDB_NODES,
      },
    });
    console.log('✅ Builder client created successfully');

    // Refresh token using existing subscription
    console.log('🔄 Refreshing root token...');
    await builder.refreshRootToken();
    console.log('✅ Root token refreshed successfully');

    // Step 4: Register builder (same as demo.js)
    try {
      const existingProfile = await builder.readProfile();
      console.log('✅ Builder already registered:', existingProfile.data.name);
    } catch {
      try {
        await builder.register({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          did: builderDid as any,
          name: 'My Demo Builder', // Same name as demo.js
        });
        console.log('✅ Builder registered successfully');
      } catch (registerError: unknown) {
        if ((registerError as Error)?.message?.includes('duplicate key')) {
          console.log('✅ Builder already registered (duplicate key)');
        } else {
          throw registerError;
        }
      }
    }

    // Step 5: Define collection (exact same as demo.js)
    const collectionId = '48fb09ba-cf33-4576-a0f8-9e00d39e9aec'; // Same ID as demo.js

    const collection = {
      _id: collectionId,
      type: 'owned' as const, // Every document in the collection will be user-owned
      name: 'User Profile Collection', // Same name as demo.js
      schema: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'array',
        uniqueItems: true,
        items: {
          type: 'object',
          properties: {
            _id: { type: 'string', format: 'uuid' },
            name: { type: 'string' }, // name will not be secret shared
            email: { // email will be secret shared (we'll store socials here)
              type: "object",
              properties: {
                "%share": {
                  type: "string"
                }
              },
              required: [
                "%share"
              ]
            },
            phone: { // phone will be secret shared (we'll store password here)
              type: "object",
              properties: {
                "%share": {
                  type: "string"
                }
              },
              required: [
                "%share"
              ]
            },
          },
          required: ['_id', 'name', 'email'], // Same as demo.js
        },
      },
    };

    // Step 6: Create the owned collection (same as demo.js)
    try {
      const createResults = await builder.createCollection(collection);
      console.log(
        '✅ Password collection created on',
        Object.keys(createResults).length,
        'nodes'
      );
    } catch (error: unknown) {
      console.log('✅ Password collection already exists or creation failed:', (error as Error)?.message);
    }

    // Step 7: Create user client (same as demo.js)
    console.log('👤 Creating user client...');
    const user = await SecretVaultUserClient.from({
      baseUrls: config.NILDB_NODES,
      keypair: userKeypair,
      blindfold: {
        operation: 'store',
      },
    });
    console.log('✅ User client created successfully');

    // Step 8: Builder grants write access to the user (same as demo.js)
    console.log('🔐 Creating delegation token...');
    const delegation = NucTokenBuilder.extending(builder.rootToken)
      .command(new Command(['nil', 'db', 'data', 'create']))
      .audience(userKeypair.toDid())
      .expiresAt(Math.floor(Date.now() / 1000) + 3600) // 1 hour
      .build(builderKeypair.privateKey());
    console.log('✅ Delegation token created successfully');

    // Step 9: User's private data (exact same format as demo.js)
    // %allot indicates that the client should encrypt this data
    const userPrivateData = {
      _id: randomUUID(),
      name: name || `WhipHash Password - ${new Date().toLocaleString()}`,
      email: {
        '%allot': socials || 'No socials provided', // Store user's socials input in email field
      },
      phone: {
        '%allot': password, // Store password in phone field
      },
    };

    console.log('📦 Final data structure:', {
      _id: userPrivateData._id,
      name: userPrivateData.name,
      emailLength: userPrivateData.email['%allot']?.length || 0,
      phoneLength: userPrivateData.phone['%allot']?.length || 0,
    });

    // Step 10: User uploads data and grants builder limited access (same as demo.js)
    console.log('📤 Uploading data to NilDB...');
    const uploadResults = await user.createData(delegation, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      owner: userDid as any,
      acl: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        grantee: builderDid as any, // Grant access to the builder
        read: true, // Builder can read the data
        write: false, // Builder cannot modify the data
        execute: true, // Builder can run queries on the data
      },
      collection: collectionId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: [userPrivateData as any],
    });
    console.log('✅ Data uploaded successfully to', Object.keys(uploadResults).length, 'nodes');

    console.log('✅ User uploaded private password data with builder access granted');

    // Step 11: See what data the user has stored (same as demo.js)
    const references = await user.listDataReferences();
    console.log('✅ User has', references.data.length, 'private password records stored');

    return NextResponse.json({
      success: true,
      message: 'Password stored successfully in NilDB',
      documentId: userPrivateData._id,
      collection: collectionId,
      nodes: Object.keys(uploadResults).length,
      timestamp: new Date().toISOString(),
      totalRecords: references.data.length
    });

  } catch (error) {
    console.error('❌ Failed to store password in NilDB:', error);
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error constructor:', error?.constructor?.name);
    console.error('❌ Error string:', String(error));
    
    let errorMessage = 'Failed to store password in NilDB';
    let errorDetails = 'Unknown error';

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
      errorDetails = error;
    } else if (error && typeof error === 'object') {
      try {
        errorMessage = (error as { message?: string }).message || 'Object error';
        errorDetails = JSON.stringify(error, null, 2);
      } catch {
        errorMessage = 'Object error (could not stringify)';
        errorDetails = String(error);
      }
    }

    console.error('❌ Processed error details:', { errorMessage, errorDetails });

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
