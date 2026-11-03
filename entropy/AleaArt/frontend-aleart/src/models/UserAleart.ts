import mongoose, { Document, Schema } from 'mongoose';

export interface IGeneratedImage {
  tokenId: number;
  imageData?: string; // Make optional for initial creation
  ipfsHash?: string; // IPFS content hash
  ipfsUrl?: string; // IPFS gateway URL
  prompt: string;
  parameters: {
    steps: number;
    cfg_scale: number;
    seed: number;
    width: number;
    height: number;
  };
  status: 'generating' | 'completed' | 'failed';
  createdAt: Date;
}

export interface IUserAleart extends Document {
  email: string;
  password: string;
  name: string;
  walletAddress?: string;
  artTokens: IArtToken[];
  generatedImages: IGeneratedImage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IArtToken {
  tokenId: number;
  requestId: string;
  createdAt: Date;
}

const GeneratedImageSchema = new Schema<IGeneratedImage>({
  tokenId: { type: Number, required: true },
  imageData: { type: String, required: false }, // Make optional for initial creation
  ipfsHash: { type: String, required: false }, // IPFS content hash
  ipfsUrl: { type: String, required: false }, // IPFS gateway URL
  prompt: { type: String, required: true },
  parameters: {
    steps: { type: Number, required: true },
    cfg_scale: { type: Number, required: true },
    seed: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  status: { type: String, enum: ['generating', 'completed', 'failed'], default: 'generating' },
  createdAt: { type: Date, default: Date.now },
});

const ArtTokenSchema = new Schema<IArtToken>({
  tokenId: { type: Number, required: true },
  requestId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const UserAleartSchema = new Schema<IUserAleart>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  walletAddress: { type: String },
  artTokens: [ArtTokenSchema],
  generatedImages: [GeneratedImageSchema],
}, {
  timestamps: true,
});

export default mongoose.models.UserAleart || mongoose.model<IUserAleart>('UserAleart', UserAleartSchema);
