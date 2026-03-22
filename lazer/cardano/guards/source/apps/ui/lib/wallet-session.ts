export type WalletSessionChain = "cardano" | "svm";
export type WalletSessionKind = "mock" | "cip30" | "wallet_standard";

export interface WalletSession {
  id: string;
  chain: WalletSessionChain;
  kind: WalletSessionKind;
  label: string;
  address: string;
  connectedAtMs: number;
}

const MOCK_WALLET_ADDRESSES: Record<WalletSessionChain, string> = {
  cardano: "addr_test1qpz7...guards_mock",
  svm: "6w4F...guardsMockSvm",
};

interface Cip30WalletApi {
  getChangeAddress?: () => Promise<string>;
  getUsedAddresses?: () => Promise<string[]>;
}

interface Cip30Provider {
  name?: string;
  enable?: () => Promise<Cip30WalletApi>;
}

interface SvmProvider {
  isPhantom?: boolean;
  publicKey?: {
    toString?: () => string;
  };
  connect?: () => Promise<{
    publicKey?: {
      toString?: () => string;
    };
  }>;
}

interface WalletAvailability {
  cardano: boolean;
  svm: boolean;
}

function normalizeCardanoDisplayAddress(address: string): string {
  if (address.startsWith("addr")) {
    return address;
  }

  return "cardano-cip30-connected";
}

function isSvmProvider(value: unknown): value is SvmProvider {
  return Boolean(
    value &&
      typeof value === "object" &&
      "connect" in value &&
      typeof (value as SvmProvider).connect === "function",
  );
}

export function createMockWalletSession(chain: WalletSessionChain): WalletSession {
  return {
    id: `mock-${chain}`,
    chain,
    kind: "mock",
    label: chain === "cardano" ? "Mock Cardano Wallet" : "Mock SVM Wallet",
    address: MOCK_WALLET_ADDRESSES[chain],
    connectedAtMs: Date.now(),
  };
}

export function shortWalletAddress(address: string): string {
  if (address.length <= 16) {
    return address;
  }

  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function getCardanoProviders(): Array<[string, Cip30Provider]> {
  if (typeof window === "undefined") {
    return [];
  }

  const cardano = (window as Window & { cardano?: Record<string, unknown> }).cardano;
  if (!cardano || typeof cardano !== "object") {
    return [];
  }

  return Object.entries(cardano).filter((entry): entry is [string, Cip30Provider] => {
    const [, provider] = entry;
    return Boolean(
      provider &&
        typeof provider === "object" &&
        typeof (provider as Cip30Provider).enable === "function",
    );
  });
}

function getSvmProvider(): SvmProvider | null {
  if (typeof window === "undefined") {
    return null;
  }

  const browser = window as Window & {
    solana?: SvmProvider;
    phantom?: { solana?: SvmProvider } | SvmProvider;
  };

  if (browser.solana && typeof browser.solana.connect === "function") {
    return browser.solana;
  }

  const phantomContainer = browser.phantom;
  const phantom =
    phantomContainer &&
    typeof phantomContainer === "object" &&
    "solana" in phantomContainer
      ? phantomContainer.solana
      : phantomContainer;

  if (isSvmProvider(phantom)) {
    return phantom;
  }

  return null;
}

export function detectWalletAvailability(): WalletAvailability {
  return {
    cardano: getCardanoProviders().length > 0,
    svm: Boolean(getSvmProvider()),
  };
}

async function connectCardanoWallet(): Promise<WalletSession | null> {
  const [providerKey, provider] = getCardanoProviders()[0] ?? [];
  if (!providerKey || !provider?.enable) {
    return null;
  }

  let walletApi: Cip30WalletApi;
  try {
    walletApi = await provider.enable();
  } catch {
    return null;
  }

  let address = "cardano-cip30-connected";

  if (walletApi.getChangeAddress) {
    try {
      const raw = await walletApi.getChangeAddress();
      if (typeof raw === "string" && raw.length > 0) {
        address = normalizeCardanoDisplayAddress(raw);
      }
    } catch {
      // Fall back to used addresses below.
    }
  }

  if (address === "cardano-cip30-connected" && walletApi.getUsedAddresses) {
    try {
      const used = await walletApi.getUsedAddresses();
      if (Array.isArray(used) && typeof used[0] === "string" && used[0].length > 0) {
        address = normalizeCardanoDisplayAddress(used[0]);
      }
    } catch {
      // Keep the placeholder connection marker if address reads are unavailable.
    }
  }

  return {
    id: `cip30-${providerKey}`,
    chain: "cardano",
    kind: "cip30",
    label: provider.name ? `${provider.name} Cardano` : `${providerKey} Cardano`,
    address,
    connectedAtMs: Date.now(),
  };
}

async function connectSvmWallet(): Promise<WalletSession | null> {
  const provider = getSvmProvider();
  if (!provider?.connect) {
    return null;
  }

  let response: Awaited<ReturnType<NonNullable<SvmProvider["connect"]>>>;
  try {
    response = await provider.connect();
  } catch {
    return null;
  }

  const address =
    provider.publicKey?.toString?.() ??
    response.publicKey?.toString?.() ??
    "svm-wallet-connected";

  return {
    id: `wallet-standard-${address}`,
    chain: "svm",
    kind: "wallet_standard",
    label: provider.isPhantom ? "Phantom" : "SVM Wallet",
    address,
    connectedAtMs: Date.now(),
  };
}

export async function connectPreferredWallet(
  chain: WalletSessionChain,
): Promise<WalletSession> {
  if (chain === "cardano") {
    return (await connectCardanoWallet()) ?? createMockWalletSession("cardano");
  }

  return (await connectSvmWallet()) ?? createMockWalletSession("svm");
}
