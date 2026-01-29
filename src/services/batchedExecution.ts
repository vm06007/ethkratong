import type { Node } from "@xyflow/react";
import type { ProtocolNodeData } from "@/types";
import type { WalletGetCallsStatusResult, WalletSendCallsResult } from "@/types/global";
import { parseEther, parseUnits, encodeFunctionData, isAddress, toHex, createPublicClient, http } from "viem";
import { normalize } from "viem/ens";
import { mainnet } from "viem/chains";

// Token addresses for different chains
const TOKEN_ADDRESSES = {
    // Ethereum Mainnet
    1: {
        USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        USDS: "0xdC035D45d973E3EC169d2276DDab16f1e407384F",
    },
    // Arbitrum One
    42161: {
        USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
        DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
        USDS: "0xa3931d71877C0E7a3148CB7Eb4463524FEc27fbD",
    },
};

// Token decimals mapping
const TOKEN_DECIMALS: Record<string, number> = {
    ETH: 18,
    USDC: 6,
    USDT: 6,
    DAI: 18,
    USDS: 18, // Assuming 18 decimals for USDS, adjust if needed
};

// ERC20 Transfer function ABI
const ERC20_TRANSFER_ABI = [
    {
        type: "function",
        name: "transfer",
        inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
        ],
        outputs: [{ type: "bool" }],
        stateMutability: "nonpayable",
    },
] as const;

export interface BatchedTransactionCall {
  to: string;
  data?: string;
  value: string;
}

/**
 * Resolve ENS name to address
 * @param addressOrENS - Address or ENS name
 * @param chainId - Chain ID for resolution
 * @returns Promise with resolved address
 */
const resolveAddress = async (addressOrENS: string, chainId: number): Promise<string> => {
  // Trim whitespace
  const trimmed = addressOrENS.trim();

  // If already a valid address, return it
  if (isAddress(trimmed)) {
    return trimmed;
  }

  // If it's an ENS name, resolve it
  if (trimmed.endsWith('.eth')) {
    try {
      console.log(`🔍 Resolving ENS name: ${trimmed}`);

      // Create a public client for ENS resolution
      // ENS is only on Ethereum mainnet
      const publicClient = createPublicClient({
        chain: mainnet,
        transport: http()
      });

      // Normalize and resolve the ENS name
      const normalizedName = normalize(trimmed);
      const resolvedAddress = await publicClient.getEnsAddress({
        name: normalizedName
      });

      if (!resolvedAddress) {
        throw new Error(`ENS name ${trimmed} does not resolve to an address`);
      }

      console.log(`Resolved ${trimmed} to ${resolvedAddress}`);
      return resolvedAddress;
    } catch (error) {
      console.error('Error resolving ENS name:', error);
      throw new Error(`Failed to resolve ENS name ${trimmed}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  throw new Error(`Invalid address format: ${trimmed}. Must be a valid 0x address or .eth ENS name`);
};

/**
 * Prepare batched transaction calls for transfer nodes
 * @param nodes - Array of nodes in execution order
 * @param account - Active account address
 * @param chainId - Current chain ID
 * @returns Array of transaction calls
 */
export const prepareTransferCalls = async (
  nodes: Node<ProtocolNodeData>[],
  chainId: number
): Promise<BatchedTransactionCall[]> => {
  const calls: BatchedTransactionCall[] = [];

  for (const node of nodes) {
    // Only process transfer nodes
    if (node.data.protocol !== "transfer") {
      continue;
    }

    // Validate transfer data
    if (!node.data.recipientAddress || !node.data.amount || !node.data.asset) {
      console.warn(`Skipping transfer node ${node.id} - missing required fields`);
      continue;
    }

    const { recipientAddress, amount, asset } = node.data;

    try {
      // Resolve ENS name to address
      const resolvedAddress = await resolveAddress(recipientAddress, chainId);

      // Handle ETH transfers
      if (asset.toUpperCase() === "ETH") {
        const value = parseEther(amount);
        calls.push({
          to: resolvedAddress,
          // No data field for simple ETH transfers to EOA
          value: toHex(value), // Convert to hex string with 0x prefix
        });
        console.log(`Prepared ETH transfer: ${amount} ETH to ${resolvedAddress} (${recipientAddress})`);
      } else {
        // Handle ERC20 transfers
        const assetUpper = asset.toUpperCase();
        const chainTokens = TOKEN_ADDRESSES[chainId as keyof typeof TOKEN_ADDRESSES];

        if (!chainTokens) {
          throw new Error(`Unsupported chain ID: ${chainId}`);
        }

        const tokenAddress = chainTokens[assetUpper as keyof typeof chainTokens];

        if (!tokenAddress) {
          throw new Error(`Token ${asset} not supported on chain ${chainId}`);
        }

        // Get token decimals (default to 18 if not found)
        const decimals = TOKEN_DECIMALS[assetUpper] || 18;

        // Parse amount with correct decimals
        const amountInWei = parseUnits(amount, decimals);

        // Encode the ERC20 transfer function call
        const transferData = encodeFunctionData({
          abi: ERC20_TRANSFER_ABI,
          functionName: "transfer",
          args: [resolvedAddress as `0x${string}`, amountInWei],
        });

        calls.push({
          to: tokenAddress,
          data: transferData,
          value: toHex(0n), // ERC20 transfers don't send ETH
        });

        console.log(`Prepared ERC20 transfer: ${amount} ${asset} to ${resolvedAddress} (${recipientAddress})`);
      }
    } catch (error) {
      console.error(`Error preparing transfer for node ${node.id}:`, error);
      throw error;
    }
  }

  return calls;
};

/**
 * Execute batched transaction using EIP-5792 wallet_sendCalls
 * @param calls - Array of transaction calls
 * @param account - Active account address
 * @param chainId - Current chain ID
 * @returns Promise with batch ID
 */
export const executeBatchedTransaction = async (
  calls: BatchedTransactionCall[],
  account: string,
  chainId: number
): Promise<{ id: string }> => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No ethereum provider found');
  }

  const chainIdHex = `0x${chainId.toString(16)}`;

  console.log('Preparing batched transaction:', {
    callCount: calls.length,
    chainId: chainIdHex,
    from: account,
  });

  console.log('Calls:', calls);

  try {
    const result = await window.ethereum.request<WalletSendCallsResult>({
      method: 'wallet_sendCalls',
      params: [{
        version: '2.0.0',
        chainId: chainIdHex,
        from: account,
        atomicRequired: true, // Require atomic execution
        calls: calls,
      }]
    });

    console.log('Batched transaction submitted:', result);

    if (!result?.id) {
      throw new Error('No batch ID returned from wallet_sendCalls');
    }

    return result;
  } catch (error) {
    console.error('Error executing batched transaction:', error);
    throw error;
  }
};

/**
 * Track batched transaction status
 * @param batchId - Batch ID returned from wallet_sendCalls
 * @returns Promise with transaction hash
 */
export const trackBatchedTransactionStatus = async (
  batchId: string
): Promise<string> => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No ethereum provider found');
  }

  console.log('Tracking batch transaction status:', batchId);

  try {
    // Poll for batch status
    const maxAttempts = 60; // 60 attempts with 1 second delay = 1 minute
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      try {
        const status = await window.ethereum.request<WalletGetCallsStatusResult>({
          method: 'wallet_getCallsStatus',
          params: [batchId]
        });

        console.log('Batch status:', status);

        if (status?.status === 'CONFIRMED') {
          console.log('Batch confirmed! Receipts:', status.receipts);
          // Get the transaction hash from the first receipt
          const txHash = status.receipts?.[0]?.transactionHash;
          if (txHash) {
            return txHash;
          }
        } else if (status?.status === 'FAILED') {
          throw new Error('Batch transaction failed');
        }
      } catch (error) {
        console.log('Status check attempt failed:', error);
      }

      attempts++;
    }

    throw new Error('Timeout waiting for batch confirmation');
  } catch (error) {
    console.error('Error tracking batch status:', error);
    throw error;
  }
};

/**
 * Validate that transfer amounts don't exceed wallet balances
 * @param nodes - Array of nodes
 * @param balances - Map of token symbol to balance
 * @returns Validation result with error message if invalid
 */
export const validateTransferAmounts = (
  nodes: Node<ProtocolNodeData>[],
  balances: Record<string, string>
): { valid: boolean; error?: string } => {
  const totalsByAsset: Record<string, number> = {};

  // Calculate total transfers per asset
  for (const node of nodes) {
    if (node.data.protocol !== "transfer") continue;

    const { amount, asset } = node.data;
    if (!amount || !asset) continue;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) {
      return {
        valid: false,
        error: `Invalid amount in node ${node.data.label}: ${amount}`,
      };
    }

    totalsByAsset[asset] = (totalsByAsset[asset] || 0) + amountNum;
  }

  // Check each asset against available balance
  for (const [asset, total] of Object.entries(totalsByAsset)) {
    const balance = parseFloat(balances[asset] || "0");
    if (total > balance) {
      return {
        valid: false,
        error: `Insufficient ${asset} balance. Required: ${total}, Available: ${balance}`,
      };
    }
  }

  return { valid: true };
};
