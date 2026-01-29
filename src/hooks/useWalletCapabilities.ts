import { useState, useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { useChainId } from 'wagmi';

/**
 * Hook to check if the connected wallet supports EIP-7702/5792 batched transactions
 * @returns {Object} - Contains supportsBatch boolean, capabilities object, and isLoading state
 */
export const useWalletCapabilities = () => {
  const activeAccount = useActiveAccount();
  const chainIdFromWagmi = useChainId();
  const [capabilities, setCapabilities] = useState<any>({});
  const [supportsBatch, setSupportsBatch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkCapabilities = async () => {
      if (!activeAccount?.address) {
        if (isMounted) {
          setSupportsBatch(false);
          setCapabilities({});
        }
        return;
      }

      if (isMounted) {
        setIsLoading(true);
      }

      try {
        // Get chain ID from wagmi (Account type has no chain property)
        const chainId = chainIdFromWagmi || 1;
        const chainIdHex = `0x${chainId.toString(16)}`;

        // Check if we have access to ethereum provider
        if (typeof window === 'undefined' || !window.ethereum) {
          throw new Error('No ethereum provider found');
        }

        // Request wallet capabilities using wallet_getCapabilities
        const caps = await (window.ethereum as any).request({
          method: 'wallet_getCapabilities',
          params: [activeAccount.address]
        });

        if (!isMounted) return;

        console.log('=== Wallet Capabilities Debug ===');
        console.log('Chain ID (decimal):', chainId);
        console.log('Chain ID (hex):', chainIdHex);
        console.log('Address:', activeAccount.address);
        console.log('Raw capabilities:', caps);
        console.log('Capabilities for current chain:', caps?.[chainIdHex]);

        setCapabilities(caps || {});

        // Check if current chain supports atomic batch transactions
        if (caps && caps[chainIdHex]) {
          const chainCapabilities = caps[chainIdHex];
          console.log('Chain capabilities object:', chainCapabilities);

          // Check for atomic batching support
          const supportAtomic = chainCapabilities?.atomic || chainCapabilities?.atomicBatch;

          setSupportsBatch(!!supportAtomic);
          console.log('Atomic batching support:', supportAtomic);
          console.log('Full chain capabilities:', JSON.stringify(chainCapabilities, null, 2));
          console.log('=================================');
        } else {
          setSupportsBatch(false);
          console.log('No capabilities found for chain:', chainIdHex);
          console.log('All capabilities:', JSON.stringify(caps, null, 2));
          console.log('=================================');
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Error checking wallet capabilities:', error);
        setSupportsBatch(false);
        setCapabilities({});
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkCapabilities();

    return () => {
      isMounted = false;
    };
  }, [activeAccount, chainIdFromWagmi]);

  return {
    capabilities,
    supportsBatch,
    isLoading
  };
};

export default useWalletCapabilities;
