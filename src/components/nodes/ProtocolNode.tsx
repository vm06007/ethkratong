import { memo, useState, useEffect } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import type { ProtocolNodeData } from "@/types";
import { cn } from "@/lib/utils";
import { allProtocols } from "@/data/protocols";
import { MoreVertical, Wallet, Trash2, ExternalLink, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useActiveAccount, ConnectButton, useWalletBalance } from "thirdweb/react";
import { client, chains } from "@/config/thirdweb";
import { getContract } from "thirdweb";
import { balanceOf, decimals } from "thirdweb/extensions/erc20";
import { toTokens } from "thirdweb";
import { useChainId } from "wagmi";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { isContractAddress, fetchContractAbi, getAbiFunctions, getAbiViewFunctions } from "@/services/contractService";
import { readContractViewResult } from "@/services/batchedExecution";

const COMPARISON_OPTIONS: { value: "gt" | "gte" | "lt" | "lte" | "ne"; label: string }[] = [
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
  { value: "ne", label: "≠" },
];

// Token addresses for balance checking
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

interface TokenBalance {
  symbol: string;
  balance: string;
  isLoading: boolean;
}

function ProtocolNode({ data, selected, id }: NodeProps<ProtocolNodeData>) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { deleteElements, setNodes } = useReactFlow();
  const activeAccount = useActiveAccount();
  const chainId = useChainId();
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [transferBalances, setTransferBalances] = useState<TokenBalance[]>([]);
  const [isVerifyingContract, setIsVerifyingContract] = useState(false);
  const [contractVerifyError, setContractVerifyError] = useState<string | null>(null);
  const [currentViewValue, setCurrentViewValue] = useState<string | null>(null);
  const [currentViewLoading, setCurrentViewLoading] = useState(false);
  const [currentViewError, setCurrentViewError] = useState<string | null>(null);

  const template = allProtocols.find((t) => t.protocol === data.protocol);
  const color = template?.color || "bg-gray-500";

  // These protocols are terminal nodes - no output handle
  const isTerminalNode = data.protocol === "transfer" || data.protocol === "custom";

  // Get ETH balance using useWalletBalance hook
  const currentChain = chains.find((c) => c.id === (chainId || 1)) || chains[0];
  const { data: ethBalanceData, isLoading: isEthLoading } = useWalletBalance({
    client,
    chain: currentChain,
    address: activeAccount?.address,
  });

  // Helper function to fetch balances
  const fetchUserBalances = async (account: typeof activeAccount) => {
    if (!account) return [];

    const chainIdForBalances = chainId || 1;
    const tokens = TOKEN_ADDRESSES[chainIdForBalances as keyof typeof TOKEN_ADDRESSES];

    if (!tokens) return [];

    const balancePromises = Object.entries(tokens).map(async ([symbol, address]) => {
      try {
        const contract = getContract({
          client,
          chain: chains.find((c) => c.id === chainIdForBalances) || chains[0],
          address,
        });

        // Fetch balance and decimals concurrently
        const [balance, tokenDecimals] = await Promise.all([
          balanceOf({
            contract,
            address: account.address,
          }),
          decimals({ contract }),
        ]);

        // Format balance using actual decimals
        const balanceValue = toTokens(balance, tokenDecimals);
        const numBalance = Number(balanceValue);
        
        // Format based on token type: ETH uses 4 decimals, others use 2
        // For very small balances, show more decimals
        let formatted: string;
        if (numBalance === 0) {
            formatted = "0.00";
        } else if (numBalance < 0.01) {
            // Show more decimals for very small amounts
            formatted = numBalance.toFixed(6);
        } else {
            formatted = numBalance.toFixed(2);
        }

        return { symbol, balance: formatted, isLoading: false };
      } catch (error) {
        console.error(`Error fetching ${symbol} balance:`, error);
        return { symbol, balance: "0.00", isLoading: false };
      }
    });

    const tokenResults = await Promise.all(balancePromises);
    
    // Add ETH balance from hook - format to 4 decimals
    let ethBalance: TokenBalance;
    if (ethBalanceData && ethBalanceData.value !== undefined) {
        const ethValue = Number(ethBalanceData.value) / 1e18;
        const formattedEth = ethValue === 0 ? "0.0000" : ethValue.toFixed(4);
        ethBalance = {
            symbol: ethBalanceData.symbol || "ETH",
            balance: formattedEth,
            isLoading: isEthLoading,
        };
    } else {
        ethBalance = { symbol: "ETH", balance: "0.0000", isLoading: isEthLoading };
    }

    return [ethBalance, ...tokenResults];
  };

  // Fetch token balances for wallet node
  useEffect(() => {
    if (data.protocol === "wallet" && activeAccount) {
      fetchUserBalances(activeAccount).then(setTokenBalances);
    } else if (data.protocol === "wallet" && !activeAccount) {
      // Clear balances when wallet is disconnected
      setTokenBalances([]);
    }
  }, [activeAccount, data.protocol, ethBalanceData, isEthLoading]);

  // Fetch current view value for conditional logic node (for display)
  useEffect(() => {
    if (data.protocol !== "conditional" || !data.contractAddress || !data.contractAbi || !data.selectedFunction) {
      setCurrentViewValue(null);
      setCurrentViewError(null);
      return;
    }
    const fns = getAbiViewFunctions(data.contractAbi);
    const fn = fns.find((f) => f.name === data.selectedFunction);
    const inputs = fn?.inputs ?? [];
    const args = data.functionArgs ?? {};
    const allArgsFilled = inputs.every((inp) => (args[inp.name] ?? "").trim() !== "");
    if (!allArgsFilled) {
      setCurrentViewValue(null);
      setCurrentViewError(null);
      return;
    }
    let cancelled = false;
    setCurrentViewLoading(true);
    setCurrentViewError(null);
    readContractViewResult(
      chainId || 1,
      data.contractAddress,
      data.contractAbi,
      data.selectedFunction,
      data.functionArgs,
      inputs
    )
      .then((value) => {
        if (!cancelled) setCurrentViewValue(value);
      })
      .catch((err) => {
        if (!cancelled) setCurrentViewError(err instanceof Error ? err.message : "Failed to fetch");
      })
      .finally(() => {
        if (!cancelled) setCurrentViewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    data.protocol,
    data.contractAddress,
    data.contractAbi,
    data.selectedFunction,
    data.functionArgs,
    chainId,
  ]);

  // Fetch balances for transfer nodes
  useEffect(() => {
    if (data.protocol === "transfer" && activeAccount && isExpanded) {
      fetchUserBalances(activeAccount).then((balances) => {
        // Filter to only show assets with non-zero balances
        const availableBalances = balances.filter(
          (token) => Number(token.balance) > 0
        );
        setTransferBalances(availableBalances);
      });
    } else if (data.protocol === "transfer" && !activeAccount) {
      setTransferBalances([]);
    }
  }, [activeAccount, data.protocol, isExpanded, ethBalanceData, isEthLoading]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  const updateNodeData = (updates: Partial<ProtocolNodeData>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...updates,
            },
          };
        }
        return node;
      })
    );
  };

  return (
    <div
      className={cn(
        "rounded-lg border-2 bg-white dark:bg-gray-800 shadow-lg transition-all",
        selected ? "border-blue-500 shadow-xl" : "border-gray-300 dark:border-gray-600",
        data.protocol === "transfer" ? "w-fit min-w-[240px] max-w-[320px]" : "min-w-[200px]"
      )}
    >
      {/* Input Handle */}
      {data.protocol !== "wallet" && (
        <Handle
          type="target"
          position={Position.Left}
          className="!bg-blue-500 !w-3 !h-3"
        />
      )}

      {/* Header */}
      <div
        className={cn(
          "px-4 py-2 text-white font-semibold rounded-t-md cursor-pointer relative",
          color
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <span>
            {data.sequenceNumber !== undefined && data.sequenceNumber > 0
              ? `${data.sequenceNumber}. ${data.label}`
              : data.label}
          </span>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="hover:bg-white/20 rounded p-1 transition-colors"
                aria-label="Node options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="min-w-[180px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1 z-50"
                sideOffset={5}
              >
                {template?.url && (
                  <DropdownMenu.Item
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer outline-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(template.url, "_blank", "noopener,noreferrer");
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>View Protocol</span>
                  </DropdownMenu.Item>
                )}
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer outline-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(e as any);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2">
        {/* Wallet-specific content */}
        {data.protocol === "wallet" && (
          <>
            {!activeAccount ? (
              <div className="flex flex-col items-center justify-center py-4 space-y-3">
                <Wallet className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Connect your wallet to view balances
                </p>
                <ConnectButton
                  client={client}
                  chains={chains}
                  connectModal={{
                    size: "compact",
                    title: "Connect Wallet",
                    showThirdwebBranding: false,
                  }}
                  connectButton={{
                    label: "Connect Wallet",
                    className: "!bg-blue-600 !text-white !font-medium !px-4 !py-2 !rounded-lg !transition-all hover:!bg-blue-700",
                  }}
                />
              </div>
            ) : (
              <div className="space-y-3">
                {/* Wallet Address */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                    Connected Wallet
                  </label>
                  <div className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                    {activeAccount.address.slice(0, 6)}...{activeAccount.address.slice(-4)}
                  </div>
                </div>

                {/* Token Balances */}
                {tokenBalances.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      Balances
                    </label>
                    <div className="space-y-1.5">
                      {tokenBalances.map((token) => (
                        <div
                          key={token.symbol}
                          className="flex justify-between items-center text-sm bg-gray-50 dark:bg-gray-700/50 px-3 py-2 rounded"
                        >
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {token.symbol}
                          </span>
                          <span className="font-mono text-gray-900 dark:text-gray-100">
                            {token.isLoading ? "..." : token.balance}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chain Info */}
                {currentChain && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium">Network:</span> {currentChain.name}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Regular protocol content */}
        {data.protocol !== "wallet" && isExpanded && (
          <>
            {/* Action Selection - Skip for transfer, custom, conditional (custom/conditional use function selector) */}
            {data.protocol !== "transfer" && data.protocol !== "custom" && data.protocol !== "conditional" && (
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                  Action:
                </label>
                <select
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
                  value={data.action || ""}
                  onChange={(e) => {
                    updateNodeData({ action: e.target.value as any });
                  }}
                >
                  <option value="">Select action</option>
                  {template?.availableActions.map((action) => (
                    <option key={action} value={action}>
                      {action.charAt(0).toUpperCase() + action.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom Contract: address, verify, then function selector + args */}
            {data.protocol === "custom" && (
              <>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                    Contract Address:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="0x..."
                      className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm font-mono bg-white dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
                      value={data.contractAddress || ""}
                      onChange={(e) => {
                        updateNodeData({
                          contractAddress: e.target.value.trim() || undefined,
                          customContractVerified: false,
                          contractAbi: undefined,
                          selectedFunction: undefined,
                          functionArgs: undefined,
                        });
                        setContractVerifyError(null);
                      }}
                    />
                    <button
                      type="button"
                      disabled={!data.contractAddress?.trim() || isVerifyingContract}
                      className={cn(
                        "px-3 py-1 rounded text-sm font-medium shrink-0",
                        data.customContractVerified
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : "bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50"
                      )}
                      onClick={async () => {
                        const addr = data.contractAddress?.trim();
                        if (!addr) return;
                        setIsVerifyingContract(true);
                        setContractVerifyError(null);
                        try {
                          const isContract = await isContractAddress(chainId || 1, addr);
                          if (!isContract) {
                            setContractVerifyError("Address is not a contract (no bytecode)");
                            return;
                          }
                          const abi = await fetchContractAbi(chainId || 1, addr);
                          updateNodeData({
                            contractAbi: abi,
                            customContractVerified: true,
                            selectedFunction: undefined,
                            functionArgs: undefined,
                          });
                        } catch (err) {
                          setContractVerifyError(err instanceof Error ? err.message : "Failed to verify or fetch ABI");
                        } finally {
                          setIsVerifyingContract(false);
                        }
                      }}
                    >
                      {isVerifyingContract ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : data.customContractVerified ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        "Verify"
                      )}
                    </button>
                  </div>
                  {contractVerifyError && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-red-600 dark:text-red-400">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {contractVerifyError}
                    </div>
                  )}
                </div>
                {data.customContractVerified && data.contractAbi && (
                  <>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                        Function:
                      </label>
                      <select
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
                        value={data.selectedFunction || ""}
                        onChange={(e) => {
                          const name = e.target.value || undefined;
                          updateNodeData({
                            selectedFunction: name,
                            functionArgs: undefined,
                          });
                        }}
                      >
                        <option value="">Select function</option>
                        {getAbiFunctions(data.contractAbi).map((fn) => (
                          <option key={fn.name} value={fn.name}>
                            {fn.name}
                            {fn.inputs?.length ? `(${fn.inputs.map((i) => i.type).join(", ")})` : "()"}
                          </option>
                        ))}
                      </select>
                    </div>
                    {data.selectedFunction && (() => {
                      const fns = getAbiFunctions(data.contractAbi);
                      const fn = fns.find((f) => f.name === data.selectedFunction);
                      const inputs = fn?.inputs || [];
                      return inputs.length > 0 ? (
                        <div className="space-y-2">
                          <label className="text-xs text-gray-600 dark:text-gray-400 block">
                            Arguments:
                          </label>
                          {inputs.map((input) => (
                            <div key={input.name}>
                              <label className="text-xs text-gray-500 dark:text-gray-500 block mb-0.5">
                                {input.name} ({input.type})
                              </label>
                              <input
                                type="text"
                                placeholder={input.type}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm font-mono bg-white dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
                                value={data.functionArgs?.[input.name] ?? ""}
                                onChange={(e) => {
                                  updateNodeData({
                                    functionArgs: {
                                      ...(data.functionArgs || {}),
                                      [input.name]: e.target.value,
                                    },
                                  });
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      ) : null;
                    })()}
                  </>
                )}
              </>
            )}

            {/* Conditional Logic: contract address, verify, view function, condition */}
            {data.protocol === "conditional" && (
              <>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                    Contract Address:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="0x..."
                      className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm font-mono bg-white dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
                      value={data.contractAddress || ""}
                      onChange={(e) => {
                        updateNodeData({
                          contractAddress: e.target.value.trim() || undefined,
                          conditionalContractVerified: false,
                          contractAbi: undefined,
                          selectedFunction: undefined,
                          functionArgs: undefined,
                          comparisonOperator: undefined,
                          compareValue: undefined,
                        });
                        setContractVerifyError(null);
                      }}
                    />
                    <button
                      type="button"
                      disabled={!data.contractAddress?.trim() || isVerifyingContract}
                      className={cn(
                        "px-3 py-1 rounded text-sm font-medium shrink-0",
                        data.conditionalContractVerified
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : "bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50"
                      )}
                      onClick={async () => {
                        const addr = data.contractAddress?.trim();
                        if (!addr) return;
                        setIsVerifyingContract(true);
                        setContractVerifyError(null);
                        try {
                          const isContract = await isContractAddress(chainId || 1, addr);
                          if (!isContract) {
                            setContractVerifyError("Address is not a contract (no bytecode)");
                            return;
                          }
                          const abi = await fetchContractAbi(chainId || 1, addr);
                          updateNodeData({
                            contractAbi: abi,
                            conditionalContractVerified: true,
                            selectedFunction: undefined,
                            functionArgs: undefined,
                          });
                        } catch (err) {
                          setContractVerifyError(err instanceof Error ? err.message : "Failed to verify or fetch ABI");
                        } finally {
                          setIsVerifyingContract(false);
                        }
                      }}
                    >
                      {isVerifyingContract ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : data.conditionalContractVerified ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        "Verify"
                      )}
                    </button>
                  </div>
                  {contractVerifyError && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-red-600 dark:text-red-400">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {contractVerifyError}
                    </div>
                  )}
                </div>
                {data.conditionalContractVerified && data.contractAbi && (
                  <>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                        View Function:
                      </label>
                      <select
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
                        value={data.selectedFunction || ""}
                        onChange={(e) => {
                          const name = e.target.value || undefined;
                          updateNodeData({
                            selectedFunction: name,
                            functionArgs: undefined,
                          });
                        }}
                      >
                        <option value="">Select view function</option>
                        {getAbiViewFunctions(data.contractAbi).map((fn) => (
                          <option key={fn.name} value={fn.name}>
                            {fn.name}
                            {fn.inputs?.length ? `(${fn.inputs.map((i) => i.type).join(", ")})` : "()"}
                          </option>
                        ))}
                      </select>
                    </div>
                    {data.selectedFunction && (() => {
                      const fns = getAbiViewFunctions(data.contractAbi);
                      const fn = fns.find((f) => f.name === data.selectedFunction);
                      const inputs = fn?.inputs || [];
                      return inputs.length > 0 ? (
                        <div className="space-y-2">
                          <label className="text-xs text-gray-600 dark:text-gray-400 block">
                            Arguments:
                          </label>
                          {inputs.map((input) => (
                            <div key={input.name}>
                              <label className="text-xs text-gray-500 dark:text-gray-500 block mb-0.5">
                                {input.name} ({input.type})
                              </label>
                              <input
                                type="text"
                                placeholder={input.type}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm font-mono bg-white dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
                                value={data.functionArgs?.[input.name] ?? ""}
                                onChange={(e) => {
                                  updateNodeData({
                                    functionArgs: {
                                      ...(data.functionArgs || {}),
                                      [input.name]: e.target.value,
                                    },
                                  });
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      ) : null;
                    })()}
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                          Condition
                        </label>
                        <select
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
                          value={data.comparisonOperator ?? ""}
                          onChange={(e) => {
                            updateNodeData({
                              comparisonOperator: (e.target.value || undefined) as typeof data.comparisonOperator,
                            });
                          }}
                        >
                          <option value="">Compare</option>
                          {COMPARISON_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                          Value
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 0 or true"
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm font-mono bg-white dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
                          value={data.compareValue ?? ""}
                          onChange={(e) => updateNodeData({ compareValue: e.target.value || undefined })}
                        />
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {currentViewLoading ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                          Current value: loading…
                        </span>
                      ) : currentViewError ? (
                        <span className="text-red-600 dark:text-red-400">Current value: {currentViewError}</span>
                      ) : currentViewValue !== null ? (
                        <span className="font-mono">Current value: {currentViewValue}</span>
                      ) : null}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      If condition is TRUE, execution proceeds to the next step.
                    </p>
                  </>
                )}
              </>
            )}

            {/* Asset Selection - For transfer nodes, show dropdown with user balances */}
            {data.protocol === "transfer" ? (
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                  Asset:
                </label>
                {!activeAccount ? (
                  <div className="text-xs text-gray-500 dark:text-gray-400 py-2">
                    Connect wallet to see available assets
                  </div>
                ) : transferBalances.length === 0 ? (
                  <div className="text-xs text-gray-500 dark:text-gray-400 py-2">
                    Loading balances...
                  </div>
                ) : (
                  <select
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
                    value={data.asset || ""}
                    onChange={(e) => {
                      updateNodeData({ asset: e.target.value });
                    }}
                  >
                    <option value="">Select asset</option>
                    {transferBalances.map((token) => (
                      <option key={token.symbol} value={token.symbol}>
                        {token.symbol} ({token.balance})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              /* Asset Input for other protocols */
              (data.action === "lend" ||
                data.action === "deposit" ||
                data.action === "borrow") && (
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                    Asset:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., USDC, ETH"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
                    value={data.asset || ""}
                    onChange={(e) => {
                      updateNodeData({ asset: e.target.value });
                    }}
                  />
                </div>
              )
            )}

            {/* Amount Input - not for custom or conditional (use function args / condition) */}
            {(data.action || data.protocol === "transfer") && data.protocol !== "custom" && data.protocol !== "conditional" && (
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                  Amount:
                </label>
                <input
                  type="text"
                  placeholder="0.00"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
                  value={data.amount || ""}
                  onChange={(e) => {
                    updateNodeData({ amount: e.target.value });
                  }}
                />
              </div>
            )}

            {/* Recipient Address Input - Only for transfer nodes */}
            {data.protocol === "transfer" && (
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                  To Address:
                </label>
                <input
                  type="text"
                  placeholder="0x... or ENS name"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm font-mono bg-white dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
                  value={data.recipientAddress || ""}
                  onChange={(e) => {
                    updateNodeData({ recipientAddress: e.target.value });
                  }}
                />
              </div>
            )}
          </>
        )}

        {/* Compact View for non-wallet nodes */}
        {data.protocol !== "wallet" && !isExpanded && (
          <>
            {/* Transfer node states */}
            {data.protocol === "transfer" ? (
              // Check if transfer is configured
              data.asset && data.amount && data.recipientAddress ? (
                // Configured state - show transfer details in 2 lines
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <div>
                    <span className="font-medium">Transfer</span>
                    {data.amount && data.asset && (
                      <span> • {data.amount} {data.asset}</span>
                    )}
                  </div>
                  {data.recipientAddress && (
                    <div className="text-sm text-gray-600 dark:text-gray-300 font-mono">
                      to {
                        // Show full ENS names, truncate only long addresses
                        data.recipientAddress.endsWith('.eth') || data.recipientAddress.length <= 20
                          ? data.recipientAddress
                          : `${data.recipientAddress.slice(0, 8)}...${data.recipientAddress.slice(-6)}`
                      }
                    </div>
                  )}
                </div>
              ) : (
                // Initial state - not configured
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <div className="text-xs italic">Click header to configure</div>
                </div>
              )
            ) : data.protocol === "custom" ? (
              // Custom contract compact view
              data.customContractVerified && data.contractAddress && data.selectedFunction ? (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <div className="font-mono text-xs truncate" title={data.contractAddress}>
                    {data.contractAddress.slice(0, 8)}...{data.contractAddress.slice(-6)}
                  </div>
                  <div className="font-medium">{data.selectedFunction}</div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <div className="text-xs italic">Click to set contract address</div>
                </div>
              )
            ) : data.protocol === "conditional" ? (
              // Conditional Logic compact view
              data.conditionalContractVerified && data.contractAddress && data.selectedFunction && data.comparisonOperator != null ? (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <div className="font-mono text-xs truncate" title={data.contractAddress}>
                    {data.contractAddress.slice(0, 8)}...{data.contractAddress.slice(-6)}
                  </div>
                  <div className="font-medium">{data.selectedFunction} {data.comparisonOperator} {data.compareValue ?? ""}</div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <div className="text-xs italic">Click to set contract and condition</div>
                </div>
              )
            ) : (
              // Other protocol nodes
              data.action && (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <div>
                    <span className="font-medium">{data.action}</span>
                    {data.asset && <span> • {data.asset}</span>}
                  </div>
                  {data.amount && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">{data.amount}</div>
                  )}
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* Output Handle - only for non-terminal nodes */}
      {!isTerminalNode && (
        <Handle
          type="source"
          position={Position.Right}
          className="!bg-green-500 !w-3 !h-3"
        />
      )}
    </div>
  );
}

export default memo(ProtocolNode);
