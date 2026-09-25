# AleaArt - Next.js Frontend

A complete Next.js application for generating and managing art parameters using blockchain randomness.

## Features

- 🔐 **Authentication**: User registration and login with MongoDB
- 🔗 **Wallet Integration**: MetaMask connection for blockchain interactions
- 🎨 **Art Parameter Generation**: Generate unique art parameters using Pyth Entropy V2
- 💾 **Data Persistence**: Save generated art tokens to user profiles
- 📊 **Dashboard**: View and manage your art tokens
- 👤 **Profile Management**: Track your art generation history

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/aleaart

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Contract Configuration
NEXT_PUBLIC_CONTRACT_ADDRESS=0x420D121aE08007Ef0A66E67D5D7BfFdC98AbECF0
NEXT_PUBLIC_ENTROPY_ADDRESS=0x549Ebba8036Ab746611B4fFA1423eb0A4Df61440
NEXT_PUBLIC_COLLECTION_SALT=0x7d0293489313c8b010a0b94fadf33237ae4b7f212d87b2b69753426aa1179b27
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts    # NextAuth configuration
│   │   │   └── signup/route.ts           # User registration
│   │   ├── art-tokens/route.ts           # Art token management
│   │   └── wallet/connect/route.ts       # Wallet connection
│   ├── dashboard/page.tsx                # Main dashboard
│   ├── login/page.tsx                     # Login page
│   ├── profile/page.tsx                  # User profile
│   ├── signup/page.tsx                   # Registration page
│   ├── layout.tsx                        # Root layout
│   └── page.tsx                          # Landing page
├── components/
│   └── Navigation.tsx                     # Navigation component
├── lib/
│   ├── auth.ts                           # NextAuth configuration
│   └── mongodb.ts                        # Database connection
├── models/
│   └── UserAleart.ts                     # UserAleart model
└── middleware.ts                         # Route protection
```

## Usage

1. **Sign Up**: Create a new account
2. **Connect Wallet**: Connect your MetaMask wallet
3. **Generate Art**: Request art parameters from the blockchain
4. **View Results**: Check your generated art tokens in the dashboard
5. **Profile**: View your art generation history

## Technologies Used

- **Next.js 14** - React framework
- **NextAuth.js** - Authentication
- **MongoDB** - Database
- **Mongoose** - ODM
- **Ethers.js** - Blockchain interactions
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety

## Smart Contract Integration

The application integrates with the deployed `EntropyArtParamsV2` contract on Arbitrum Sepolia:

- **Contract Address**: `0x420D121aE08007Ef0A66E67D5D7BfFdC98AbECF0`
- **Network**: Arbitrum Sepolia
- **Entropy Provider**: Pyth Entropy V2

## API Endpoints

- `POST /api/auth/signup` - User registration
- `GET /api/art-tokens` - Get user's art tokens
- `POST /api/art-tokens` - Save new art token
- `POST /api/wallet/connect` - Connect wallet to user profile

## Environment Variables

Make sure to set up your environment variables properly:

- `MONGODB_URI`: Your MongoDB connection string
- `NEXTAUTH_SECRET`: A random secret for NextAuth
- `NEXT_PUBLIC_CONTRACT_ADDRESS`: The deployed contract address
- `NEXT_PUBLIC_ENTROPY_ADDRESS`: The Pyth Entropy contract address
- `NEXT_PUBLIC_COLLECTION_SALT`: The collection salt for uniqueness

## Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License