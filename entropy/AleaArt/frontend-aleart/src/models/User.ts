import mongoose, { Document, Schema } from 'mongoose';

export interface IUserAleart extends Document {
  email: string;
  password: string;
  name: string;
  walletAddress?: string;
  artTokens: IArtToken[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IArtToken {
  tokenId: number;
  requestId: string;
  seed: string;
  parameters: {
    promptIndex: number;
    styleIndex: number;
    samplerIndex: number;
    aspectIndex: number;
    steps: number;
    cfg: number;
    latentSeed: number;
    paletteId: number;
  };
  createdAt: Date;
}

const ArtTokenSchema = new Schema<IArtToken>({
  tokenId: { type: Number, required: true },
  requestId: { type: String, required: true },
  seed: { type: String, required: true },
  parameters: {
    promptIndex: { type: Number, required: true },
    styleIndex: { type: Number, required: true },
    samplerIndex: { type: Number, required: true },
    aspectIndex: { type: Number, required: true },
    steps: { type: Number, required: true },
    cfg: { type: Number, required: true },
    latentSeed: { type: Number, required: true },
    paletteId: { type: Number, required: true },
  },
  createdAt: { type: Date, default: Date.now },
});

const UserAleartSchema = new Schema<IUserAleart>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  walletAddress: { type: String },
  artTokens: [ArtTokenSchema],
}, {
  timestamps: true,
});

export default mongoose.models.UserAleart || mongoose.model<IUserAleart>('UserAleart', UserAleartSchema);
