import { Client, type Signer, type Identifier } from '@xmtp/browser-sdk';

// Environment configuration - easy to change
// Options: 'local' | 'dev' | 'production'
// 'dev' = ephemeral, messages get deleted
// 'production' = messages stored indefinitely (costs real ETH)
const XMTP_ENV = 'production' as const; // Using production for better testing persistence

// Helper to convert hex to bytes
export const hexToBytes = (hex: string): Uint8Array => {
  hex = hex.startsWith("0x") ? hex.slice(2) : hex;
  return new Uint8Array(hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
};

// Create a signer from a wallet address
export const createSigner = (
  address: string,
  signMessageAsync: (args: { message: string }) => Promise<`0x${string}`>
): Signer => {
  return {
    type: "EOA",
    getIdentifier: () => ({
      identifier: address as `0x${string}`,
      identifierKind: "Ethereum",
    }),
    signMessage: async (message) => {
      const msg = typeof message === "string" ? message : new TextDecoder().decode(message);
      const sigHex = await signMessageAsync({ message: msg });
      return hexToBytes(sigHex);
    },
  };
};

// Client cache to avoid recreating clients
const clientCache = new Map<string, Client>();

// Get or create an XMTP client for a wallet address
export const getXMTPClient = async (
  address: string,
  signMessageAsync: (args: { message: string }) => Promise<`0x${string}`>
): Promise<Client> => {
  // Check cache first
  if (clientCache.has(address)) {
    return clientCache.get(address)!;
  }

  const signer = createSigner(address, signMessageAsync);
  const client = await Client.create(signer, { env: XMTP_ENV });

  // Cache the client
  clientCache.set(address, client);

  return client;
};

// Check if addresses can receive messages on XMTP
export const checkCanMessage = async (addresses: string[]): Promise<Map<string, boolean>> => {
  const identifiers: Identifier[] = addresses.map(addr => ({
    identifier: addr as `0x${string}`,
    identifierKind: "Ethereum",
  }));

  return await Client.canMessage(identifiers);
};

// Clear client cache (useful for logout)
export const clearClientCache = (address?: string) => {
  if (address) {
    clientCache.delete(address);
  } else {
    clientCache.clear();
  }
};
