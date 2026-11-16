import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'raffle_system';

if (!MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(MONGODB_URI);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(MONGODB_URI);
  clientPromise = client.connect();
}

// Raffle data interface
interface RaffleData {
  contractAddress: string;
  title: string;
  description: string;
  imageUrl?: string;
  pricePerTicket: string;
  totalTickets: number;
  ticketsSold: number;
  startTime: number;
  endTime: number;
  isClosed: boolean;
  winner?: string;
  maxTicketsPerUser: number;
  houseFeePercentage: number;
  prizeAmount: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
  txHash: string;
  createdBy: string; // Admin wallet address
}

// POST - Create new raffle
export async function POST(request: NextRequest) {
  try {
    const raffleData: RaffleData = await request.json();
    
    // Validate required fields
    if (!raffleData.contractAddress || !raffleData.title || !raffleData.createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(MONGODB_DB);
    const collection = db.collection('raffles');

    // Add timestamps
    const now = new Date();
    const raffleWithTimestamps = {
      ...raffleData,
      createdAt: now,
      updatedAt: now,
    };

    // Insert raffle
    const result = await collection.insertOne(raffleWithTimestamps);
    
    return NextResponse.json({
      success: true,
      id: result.insertedId,
      message: 'Raffle created successfully'
    });

  } catch (error) {
    console.error('Error creating raffle:', error);
    return NextResponse.json(
      { error: 'Failed to create raffle' },
      { status: 500 }
    );
  }
}

// GET - Fetch all raffles
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(MONGODB_DB);
    const collection = db.collection('raffles');

    const raffles = await collection
      .find({})
      .sort({ createdAt: -1 }) // Most recent first
      .toArray();

    return NextResponse.json({
      success: true,
      raffles: raffles.map(raffle => ({
        ...raffle,
        _id: raffle._id.toString() // Convert ObjectId to string
      }))
    });

  } catch (error) {
    console.error('Error fetching raffles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch raffles' },
      { status: 500 }
    );
  }
}

// PUT - Update raffle
export async function PUT(request: NextRequest) {
  try {
    const { contractAddress, updates } = await request.json();
    
    if (!contractAddress) {
      return NextResponse.json(
        { error: 'Contract address is required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(MONGODB_DB);
    const collection = db.collection('raffles');

    const result = await collection.updateOne(
      { contractAddress },
      { 
        $set: {
          ...updates,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Raffle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Raffle updated successfully'
    });

  } catch (error) {
    console.error('Error updating raffle:', error);
    return NextResponse.json(
      { error: 'Failed to update raffle' },
      { status: 500 }
    );
  }
}

// DELETE - Delete raffle
export async function DELETE(request: NextRequest) {
  try {
    const { contractAddress } = await request.json();
    
    if (!contractAddress) {
      return NextResponse.json(
        { error: 'Contract address is required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(MONGODB_DB);
    const collection = db.collection('raffles');

    const result = await collection.deleteOne({ contractAddress });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Raffle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Raffle deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting raffle:', error);
    return NextResponse.json(
      { error: 'Failed to delete raffle' },
      { status: 500 }
    );
  }
}

