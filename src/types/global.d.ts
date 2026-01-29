/** EIP-5792 wallet_sendCalls result */
export interface WalletSendCallsResult {
  id: string;
}

/** EIP-5792 wallet_getCallsStatus result (status: 100 pending, 200 confirmed, 4xx/5xx/6xx failure) */
export interface WalletGetCallsStatusResult {
  status: number | 'PENDING' | 'CONFIRMED' | 'FAILED';
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
