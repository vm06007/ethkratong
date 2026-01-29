/** EIP-5792 wallet_sendCalls result */
export interface WalletSendCallsResult {
  id: string;
}

/** EIP-5792 wallet_getCallsStatus result */
export interface WalletGetCallsStatusResult {
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  receipts?: Array<{ transactionHash?: string }>;
}

interface EthereumProvider {
  request<T = unknown>(args: { method: string; params?: unknown[] }): Promise<T>;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export {};
