import type { Node } from "@xyflow/react";
import type { ProtocolNodeData } from "@/types";
import type { WalletGetCallsStatusResult, WalletSendCallsResult } from "@/types/global";
import { parseEther, isAddress, toHex, createPublicClient, http } from "viem";
import { normalize } from "viem/ens";
import { mainnet } from "viem/chains";

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
const resolveAddress = async (addressOrENS: string): Promise<string> => {
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
      const resolvedAddress = await resolveAddress(recipientAddress);

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
        // We'll need the token contract address - for now, we'll add a placeholder
        // In a real implementation, you'd have a token address mapping
        console.log(`ERC20 transfer to ${resolvedAddress} of ${amount} ${asset}`);
        // TODO: Add ERC20 transfer encoding
        throw new Error("ERC20 transfers not yet implemented");
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
