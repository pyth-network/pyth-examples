import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  Cip30WalletProvider,
  EternlWalletState,
} from '../types/wallet';

function getEternlProvider(): Cip30WalletProvider | null {
  return window.cardano?.eternl ?? window.cardano?.ccvault ?? null;
}

function mapNetworkIdToName(networkId: number | null): string {
  if (networkId === 1) {
    return 'Mainnet';
  }
  if (networkId === 0) {
    return 'Testnet';
  }
  if (networkId === null) {
    return 'Unknown network';
  }
  return `Network ${networkId}`;
}

export function useEternlWallet(): EternlWalletState {
  const isMountedRef = useRef(true);

  const [isInstalled, setIsInstalled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletName, setWalletName] = useState('Eternl');
  const [walletIcon, setWalletIcon] = useState<string | null>(null);
  const [networkId, setNetworkId] = useState<number | null>(null);
  const [primaryAddressHex, setPrimaryAddressHex] = useState<string | null>(null);

  const hydrateFromProvider = useCallback(
    async (provider: Cip30WalletProvider): Promise<void> => {
      setIsConnecting(true);
      setError(null);

      try {
        const api = await provider.enable();
        const [currentNetworkId, usedAddresses, changeAddress] = await Promise.all([
          api.getNetworkId(),
          api.getUsedAddresses({ page: 0, limit: 1 }),
          api.getChangeAddress(),
        ]);

        const candidateAddress = usedAddresses[0] ?? changeAddress ?? null;

        if (!isMountedRef.current) {
          return;
        }

        setWalletName(provider.name || 'Eternl');
        setWalletIcon(provider.icon || null);
        setNetworkId(currentNetworkId);
        setPrimaryAddressHex(candidateAddress);
        setIsConnected(true);
        setError(null);
      } catch (walletError) {
        if (!isMountedRef.current) {
          return;
        }

        setIsConnected(false);
        setNetworkId(null);
        setPrimaryAddressHex(null);
        setError(walletError instanceof Error ? walletError.message : 'Wallet connection failed.');
      } finally {
        if (isMountedRef.current) {
          setIsConnecting(false);
        }
      }
    },
    [],
  );

  const connect = useCallback(async () => {
    const provider = getEternlProvider();
    if (!provider) {
      setIsInstalled(false);
      setError('Eternl is not detected in this browser.');
      return;
    }

    setIsInstalled(true);
    await hydrateFromProvider(provider);
  }, [hydrateFromProvider]);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setNetworkId(null);
    setPrimaryAddressHex(null);
    setError(null);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    const bootstrap = async (): Promise<void> => {
      const provider = getEternlProvider();
      setIsInstalled(Boolean(provider));
      if (!provider) {
        return;
      }

      setWalletName(provider.name || 'Eternl');
      setWalletIcon(provider.icon || null);

      try {
        const alreadyEnabled = await provider.isEnabled();
        if (alreadyEnabled) {
          await hydrateFromProvider(provider);
        }
      } catch (walletError) {
        if (isMountedRef.current) {
          setError(
            walletError instanceof Error ? walletError.message : 'Could not initialize Eternl.',
          );
        }
      }
    };

    void bootstrap();

    return () => {
      isMountedRef.current = false;
    };
  }, [hydrateFromProvider]);

  const networkName = mapNetworkIdToName(networkId);

  return {
    isInstalled,
    isConnected,
    isConnecting,
    error,
    walletName,
    walletIcon,
    networkId,
    networkName,
    primaryAddressHex,
    connect,
    disconnect,
  };
}
