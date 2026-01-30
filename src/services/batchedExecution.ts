import type { Node } from "@xyflow/react";
import type { ProtocolNodeData } from "@/types";
import type { WalletGetCallsStatusResult, WalletSendCallsResult } from "@/types/global";
import { parseEther, parseUnits, encodeFunctionData, isAddress, getAddress, toHex, createPublicClient, http, type Abi, type Chain } from "viem";
import { normalize } from "viem/ens";
import { mainnet, arbitrum } from "viem/chains";

const CHAINS: Record<number, Chain> = { 1: mainnet, 42161: arbitrum };

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

// Uniswap V2 Router and WETH per chain (for swap execution)
const UNISWAP_V2_ROUTER: Record<number, string> = {
    1: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    42161: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24",
};
const WETH_ADDRESS: Record<number, string> = {
    1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    42161: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
};
// Factory address is read at runtime via router.factory() to avoid hardcoding wrong/checksum issues
const UNISWAP_V2_ROUTER_FACTORY_ABI = [
    { type: "function", name: "factory", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
] as const;
const UNISWAP_V2_FACTORY_ABI = [
    { type: "function", name: "getPair", inputs: [{ name: "tokenA", type: "address" }, { name: "tokenB", type: "address" }], outputs: [{ name: "pair", type: "address" }], stateMutability: "view" },
] as const;
const UNISWAP_V2_PAIR_ABI = [
    { type: "function", name: "getReserves", inputs: [], outputs: [{ name: "reserve0", type: "uint112" }, { name: "reserve1", type: "uint112" }, { name: "blockTimestampLast", type: "uint32" }], stateMutability: "view" },
    { type: "function", name: "token0", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
    { type: "function", name: "token1", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
    { type: "function", name: "totalSupply", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
] as const;
const UNISWAP_SWAP_ABI = [
    {
        type: "function",
        name: "swapExactETHForTokens",
        inputs: [
            { name: "amountOutMin", type: "uint256" },
            { name: "path", type: "address[]" },
            { name: "to", type: "address" },
            { name: "deadline", type: "uint256" },
        ],
        outputs: [{ type: "uint256[]" }],
        stateMutability: "payable",
    },
    {
        type: "function",
        name: "swapExactTokensForTokens",
        inputs: [
            { name: "amountIn", type: "uint256" },
            { name: "amountOutMin", type: "uint256" },
            { name: "path", type: "address[]" },
            { name: "to", type: "address" },
            { name: "deadline", type: "uint256" },
        ],
        outputs: [{ type: "uint256[]" }],
        stateMutability: "nonpayable",
    },
] as const;

const ERC20_APPROVE_ABI = [
    {
        type: "function",
        name: "approve",
        inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
        ],
        outputs: [{ type: "bool" }],
        stateMutability: "nonpayable",
    },
] as const;

// ERC-4626 / Morpho vault deposit (assets, receiver)
const MORPHO_VAULT_DEPOSIT_ABI = [
    {
        type: "function",
        name: "deposit",
        inputs: [
            { name: "assets", type: "uint256" },
            { name: "receiver", type: "address" },
        ],
        outputs: [{ name: "shares", type: "uint256" }],
        stateMutability: "nonpayable",
    },
] as const;

// ERC-4626 withdraw (assets, receiver, owner)
const MORPHO_VAULT_WITHDRAW_ABI = [
    {
        type: "function",
        name: "withdraw",
        inputs: [
            { name: "assets", type: "uint256" },
            { name: "receiver", type: "address" },
            { name: "owner", type: "address" },
        ],
        outputs: [{ name: "shares", type: "uint256" }],
        stateMutability: "nonpayable",
    },
] as const;

const UNISWAP_ADD_LIQUIDITY_ETH_ABI = [
    {
        type: "function",
        name: "addLiquidityETH",
        inputs: [
            { name: "token", type: "address" },
            { name: "amountTokenDesired", type: "uint256" },
            { name: "amountTokenMin", type: "uint256" },
            { name: "amountETHMin", type: "uint256" },
            { name: "to", type: "address" },
            { name: "deadline", type: "uint256" },
        ],
        outputs: [
            { name: "amountToken", type: "uint256" },
            { name: "amountETH", type: "uint256" },
            { name: "liquidity", type: "uint256" },
        ],
        stateMutability: "payable",
    },
] as const;

const UNISWAP_ROUTER_QUOTE_ABI = [
    {
        type: "function",
        name: "getAmountsOut",
        inputs: [
            { name: "amountIn", type: "uint256" },
            { name: "path", type: "address[]" },
        ],
        outputs: [{ name: "amounts", type: "uint256[]" }],
        stateMutability: "view",
    },
] as const;

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
 * Parse a single ABI argument from string input to the type expected by encodeFunctionData.
 */
function parseAbiArgValue(type: string, value: string): unknown {
  const t = type.toLowerCase().replace(/\s/g, "");
  const v = value.trim();
  if (t.startsWith("uint") || t.startsWith("int")) {
    return BigInt(v);
  }
  if (t === "bool") {
    return v === "1" || v.toLowerCase() === "true";
  }
  if (t === "address") {
    if (!v.startsWith("0x")) return `0x${v}` as `0x${string}`;
    return v as `0x${string}`;
  }
  if (t.startsWith("bytes")) {
    return (v.startsWith("0x") ? v : `0x${v}`) as `0x${string}`;
  }
  return v;
}

/**
 * Prepare a single batched call for a custom contract node (encode function + args).
 */
export function prepareCustomContractCall(node: Node<ProtocolNodeData>): BatchedTransactionCall {
  const data = node.data;
  if (data.protocol !== "custom") {
    throw new Error("Node is not a custom contract node");
  }
  const { contractAddress, contractAbi, selectedFunction, functionArgs } = data;
  if (!contractAddress || !contractAbi || !selectedFunction) {
    throw new Error(`Custom contract node ${node.id}: missing contract address, ABI, or function`);
  }
  const fn = (contractAbi as Array<{ type: string; name: string; inputs?: Array<{ name: string; type: string }> }>).find(
    (item) => item.type === "function" && item.name === selectedFunction
  );
  if (!fn?.inputs) {
    return {
      to: contractAddress,
      data: encodeFunctionData({
        abi: contractAbi,
        functionName: selectedFunction,
        args: [],
      }),
      value: toHex(0n),
    };
  }
  const args = fn.inputs.map((inp) => parseAbiArgValue(inp.type, (functionArgs || {})[inp.name] ?? "0"));
  const calldata = encodeFunctionData({
    abi: contractAbi,
    functionName: selectedFunction,
    args,
  });
  return {
    to: contractAddress,
    data: calldata,
    value: toHex(0n),
  };
}

/**
 * Simulate Uniswap V2 swap and return estimated amount out (router.getAmountsOut).
 * Only supports ETH → token path. Use for display and for downstream steps.
 */
export async function getUniswapSwapQuote(
  chainId: number,
  amountInWei: bigint,
  outputTokenSymbol: string
): Promise<{ amountOutFormatted: string; amountOutRaw: bigint } | null> {
  const chain = CHAINS[chainId as keyof typeof CHAINS];
  if (!chain) return null;
  const router = UNISWAP_V2_ROUTER[chainId as keyof typeof UNISWAP_V2_ROUTER];
  const weth = WETH_ADDRESS[chainId as keyof typeof WETH_ADDRESS];
  const chainTokens = TOKEN_ADDRESSES[chainId as keyof typeof TOKEN_ADDRESSES];
  if (!router || !weth || !chainTokens) return null;
  const outputTokenAddress = chainTokens[outputTokenSymbol as keyof typeof chainTokens];
  if (!outputTokenAddress || outputTokenSymbol === "ETH") return null;
  if (amountInWei <= 0n) return null;

  try {
    const publicClient = createPublicClient({ chain, transport: http() });
    const path = [weth as `0x${string}`, outputTokenAddress as `0x${string}`];
    const amounts = await publicClient.readContract({
      address: router as `0x${string}`,
      abi: UNISWAP_ROUTER_QUOTE_ABI,
      functionName: "getAmountsOut",
      args: [amountInWei, path],
    });
    if (!amounts || amounts.length < 2) return null;
    const amountOutRaw = amounts[1];
    const decimals = TOKEN_DECIMALS[outputTokenSymbol] ?? 18;
    const divisor = 10 ** decimals;
    const amountOutNum = Number(amountOutRaw) / divisor;
    const amountOutFormatted =
      amountOutNum === 0
        ? "0"
        : amountOutNum < 0.01
          ? amountOutNum.toFixed(6)
          : amountOutNum.toFixed(decimals <= 6 ? 2 : 4);
    return { amountOutFormatted, amountOutRaw };
  } catch (err) {
    console.warn("Uniswap quote failed:", err);
    return null;
  }
}

/**
 * Simulate Uniswap V2 token → token swap (e.g. DAI → USDC) via getAmountsOut.
 * Path is [inputToken, WETH, outputToken]. Use for Est. out display.
 */
export async function getUniswapSwapQuoteTokenToToken(
  chainId: number,
  inputTokenSymbol: string,
  outputTokenSymbol: string,
  amountHumanStr: string
): Promise<{ amountOutFormatted: string; amountOutRaw: bigint } | null> {
  const chain = CHAINS[chainId as keyof typeof CHAINS];
  if (!chain) return null;
  const router = UNISWAP_V2_ROUTER[chainId as keyof typeof UNISWAP_V2_ROUTER];
  const weth = WETH_ADDRESS[chainId as keyof typeof WETH_ADDRESS];
  const chainTokens = TOKEN_ADDRESSES[chainId as keyof typeof TOKEN_ADDRESSES];
  if (!router || !weth || !chainTokens) return null;
  if (inputTokenSymbol === "ETH" || outputTokenSymbol === "ETH") return null;
  if (inputTokenSymbol === outputTokenSymbol) return null;
  const inputTokenAddress = chainTokens[inputTokenSymbol as keyof typeof chainTokens];
  const outputTokenAddress = chainTokens[outputTokenSymbol as keyof typeof chainTokens];
  if (!inputTokenAddress || !outputTokenAddress) return null;

  const amountStr = amountHumanStr.trim();
  if (!amountStr) return null;
  const inputDecimals = TOKEN_DECIMALS[inputTokenSymbol] ?? 18;
  let amountIn: bigint;
  try {
    amountIn = parseUnits(amountStr, inputDecimals);
  } catch {
    return null;
  }
  if (amountIn <= 0n) return null;

  try {
    const publicClient = createPublicClient({ chain, transport: http() });
    const path = [
      inputTokenAddress as `0x${string}`,
      weth as `0x${string}`,
      outputTokenAddress as `0x${string}`,
    ];
    const amounts = await publicClient.readContract({
      address: router as `0x${string}`,
      abi: UNISWAP_ROUTER_QUOTE_ABI,
      functionName: "getAmountsOut",
      args: [amountIn, path],
    });
    if (!amounts || amounts.length < 3) return null;
    const amountOutRaw = amounts[2];
    const outputDecimals = TOKEN_DECIMALS[outputTokenSymbol] ?? 18;
    const divisor = 10 ** outputDecimals;
    const amountOutNum = Number(amountOutRaw) / divisor;
    const amountOutFormatted =
      amountOutNum === 0
        ? "0"
        : amountOutNum < 0.01
          ? amountOutNum.toFixed(6)
          : amountOutNum.toFixed(outputDecimals <= 6 ? 2 : 4);
    return { amountOutFormatted, amountOutRaw };
  } catch (err) {
    console.warn("Uniswap token→token quote failed:", err);
    return null;
  }
}

/**
 * Prepare a single batched call for a Uniswap swap node (ETH → token via V2 router).
 * Uses quote for amountOutMin (with slippage) and optional swap deadline.
 */
async function prepareUniswapSwapCall(
  node: Node<ProtocolNodeData>,
  chainId: number,
  account: string
): Promise<BatchedTransactionCall[]> {
  const data = node.data;
  // Uniswap defaults to swap mode when action is undefined/null
  if (data.protocol !== "uniswap" || (data.action !== "swap" && data.action != null)) {
    throw new Error("Node is not a Uniswap swap node");
  }

  const swapFrom = data.swapFrom;
  const swapTo = data.swapTo;
  const chainTokens = TOKEN_ADDRESSES[chainId as keyof typeof TOKEN_ADDRESSES];

  if (!swapFrom || !swapTo) {
    throw new Error(`Uniswap: select both swap from and swap to tokens`);
  }

  const router = UNISWAP_V2_ROUTER[chainId as keyof typeof UNISWAP_V2_ROUTER];
  const weth = WETH_ADDRESS[chainId as keyof typeof WETH_ADDRESS];
  if (!router || !weth) {
    throw new Error(`Uniswap execution not supported on chain ${chainId}`);
  }

  const amountStr = data.amount?.trim() || "0";
  const deadlineMinutes = data.swapDeadlineMinutes ?? 30;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineMinutes * 60);
  const slippagePercent = data.maxSlippageAuto !== false
    ? 0.5
    : Math.min(50, Math.max(0, parseFloat(data.maxSlippagePercent ?? "0.5") || 0.5));

  const calls: BatchedTransactionCall[] = [];

  // ETH → Token swap
  if (swapFrom === "ETH") {
    if (!chainTokens || swapTo === "ETH") {
      throw new Error(`Uniswap: select a token to swap to (e.g. USDC)`);
    }
    const outputTokenAddress = chainTokens[swapTo as keyof typeof chainTokens];
    if (!outputTokenAddress) {
      throw new Error(`Token ${swapTo} not supported on chain ${chainId}`);
    }

    const amountWei = parseEther(amountStr);
    const path = [weth as `0x${string}`, outputTokenAddress as `0x${string}`];

    const quoteResult = await getUniswapSwapQuote(chainId, amountWei, swapTo);
    const amountOutMin = quoteResult
      ? (quoteResult.amountOutRaw * BigInt(Math.floor((100 - slippagePercent) * 100))) / BigInt(10000)
      : 0n;

    const dataEncoded = encodeFunctionData({
      abi: UNISWAP_SWAP_ABI,
      functionName: "swapExactETHForTokens",
      args: [amountOutMin, path, account as `0x${string}`, deadline],
    });

    calls.push({
      to: router,
      data: dataEncoded,
      value: toHex(amountWei),
    });
  }
  // Token → Token swap
  else {
    if (!chainTokens) {
      throw new Error(`Tokens not configured for chain ${chainId}`);
    }

    const inputTokenAddress = chainTokens[swapFrom as keyof typeof chainTokens];
    const outputTokenAddress = swapTo === "ETH"
      ? weth
      : chainTokens[swapTo as keyof typeof chainTokens];

    if (!inputTokenAddress) {
      throw new Error(`Token ${swapFrom} not supported on chain ${chainId}`);
    }
    if (!outputTokenAddress) {
      throw new Error(`Token ${swapTo} not supported on chain ${chainId}`);
    }

    // Get token decimals for parsing amount
    const inputDecimals = TOKEN_DECIMALS[swapFrom] ?? 18;
    const outputDecimals = TOKEN_DECIMALS[swapTo] ?? 18;
    const amountIn = parseUnits(amountStr, inputDecimals);

    // Build path
    const path = [inputTokenAddress as `0x${string}`, outputTokenAddress as `0x${string}`];

    // Get quote (we can reuse the existing function, though it expects ETH input)
    // For simplicity, we'll calculate amountOutMin with slippage on the estimated output
    const estimatedOut = data.estimatedAmountOut ? parseUnits(data.estimatedAmountOut, outputDecimals) : 0n;
    const amountOutMin = estimatedOut > 0n
      ? (estimatedOut * BigInt(Math.floor((100 - slippagePercent) * 100))) / BigInt(10000)
      : 0n;

    // Step 1: Approve input token
    const approveData = encodeFunctionData({
      abi: ERC20_APPROVE_ABI,
      functionName: "approve",
      args: [router as `0x${string}`, amountIn],
    });

    calls.push({
      to: inputTokenAddress,
      data: approveData,
      value: "0x0",
    });

    // Step 2: Swap tokens
    const swapData = encodeFunctionData({
      abi: UNISWAP_SWAP_ABI,
      functionName: "swapExactTokensForTokens",
      args: [amountIn, amountOutMin, path, account as `0x${string}`, deadline],
    });

    calls.push({
      to: router,
      data: swapData,
      value: "0x0",
    });
  }

  return calls;
}

/** Buffer on top of expected token amount for addLiquidity to avoid tx failure from small rate changes (2%). */
const ADD_LIQUIDITY_APPROVAL_BUFFER_BPS = 200; // 2% = 200 basis points

/** Uniswap V2 LP tokens use 18 decimals */
const UNISWAP_V2_LP_DECIMALS = 18;

/**
 * Estimate LP tokens received from addLiquidityETH (Uniswap V2).
 * liquidity = min(amountETH * totalSupply / reserveETH, amountToken * totalSupply / reserveToken)
 */
export async function getEstimatedLpForAddLiquidity(
  chainId: number,
  tokenSymbol: string,
  amountWei: bigint
): Promise<{ amountLpFormatted: string; amountLpRaw: bigint } | null> {
  if (amountWei <= 0n) return null;
  const chainTokens = TOKEN_ADDRESSES[chainId as keyof typeof TOKEN_ADDRESSES];
  const router = UNISWAP_V2_ROUTER[chainId as keyof typeof UNISWAP_V2_ROUTER];
  const weth = WETH_ADDRESS[chainId as keyof typeof WETH_ADDRESS];
  if (!chainTokens || !router || !weth) return null;
  const tokenAddress = chainTokens[tokenSymbol as keyof typeof chainTokens];
  if (!tokenAddress) return null;
  const chain = CHAINS[chainId];
  if (!chain) return null;
  const clientId = (typeof import.meta !== "undefined" && (import.meta as { env?: { VITE_THIRDWEB_CLIENT_ID?: string } }).env?.VITE_THIRDWEB_CLIENT_ID) || "";
  const rpcUrl = chainId === 1 ? `https://ethereum.rpc.thirdweb.com/${clientId}` : chainId === 42161 ? `https://arbitrum.rpc.thirdweb.com/${clientId}` : undefined;
  const client = createPublicClient({ chain, transport: rpcUrl ? http(rpcUrl) : http() });
  const routerAddr = getAddress(router);
  const factoryAddr = await client.readContract({
    address: routerAddr,
    abi: UNISWAP_V2_ROUTER_FACTORY_ABI,
    functionName: "factory",
  });
  const pairAddress = await client.readContract({
    address: getAddress(factoryAddr as string),
    abi: UNISWAP_V2_FACTORY_ABI,
    functionName: "getPair",
    args: [getAddress(tokenAddress), getAddress(weth)],
  });
  if (!pairAddress || pairAddress === "0x0000000000000000000000000000000000000000") return null;
  const pairAddr = getAddress(pairAddress as string);
  const [reserves, token0, totalSupply] = await Promise.all([
    client.readContract({ address: pairAddr, abi: UNISWAP_V2_PAIR_ABI, functionName: "getReserves" }),
    client.readContract({ address: pairAddr, abi: UNISWAP_V2_PAIR_ABI, functionName: "token0" }),
    client.readContract({ address: pairAddr, abi: UNISWAP_V2_PAIR_ABI, functionName: "totalSupply" }),
  ]);
  if (totalSupply === 0n) return null;
  const isWethToken0 = (token0 as string).toLowerCase() === weth.toLowerCase();
  const reserveWETH = isWethToken0 ? reserves[0] : reserves[1];
  const reserveToken = isWethToken0 ? reserves[1] : reserves[0];
  if (reserveWETH === 0n) return null;
  const amountToken = (amountWei * reserveToken) / reserveWETH;
  const liquidityFromEth = (amountWei * totalSupply) / reserveWETH;
  const liquidityFromToken = (amountToken * totalSupply) / reserveToken;
  const liquidity = liquidityFromEth < liquidityFromToken ? liquidityFromEth : liquidityFromToken;
  const formatted = liquidity === 0n ? "0" : Number(liquidity) / 1e18 < 0.0001
    ? (Number(liquidity) / 1e18).toExponential(2)
    : (Number(liquidity) / 1e18).toFixed(4);
  return { amountLpFormatted: formatted, amountLpRaw: liquidity };
}

/**
 * Resolve LP token (pair) address for a transfer node that receives from addLiquidity.
 * asset is e.g. "ETH-USDC LP"; finds upstream addLiquidity node and returns pair address.
 */
async function getPairAddressForLpAsset(
  chainId: number,
  asset: string,
  nodes: Node<ProtocolNodeData>[],
  edges: { source: string; target: string }[],
  transferNodeId: string
): Promise<string> {
  if (!asset.endsWith(" LP")) throw new Error(`Invalid LP asset: ${asset}`);
  const pairLabel = asset.slice(0, -3).trim();
  const parts = pairLabel.split("-");
  if (parts.length !== 2) throw new Error(`Invalid LP asset label: ${asset}`);
  const [a, b] = parts.map((p) => p.trim());
  const incoming = edges.filter((e) => e.target === transferNodeId).map((e) => e.source);
  const addLiqNode = nodes.find(
    (n) =>
      incoming.includes(n.id) &&
      n.data.protocol === "uniswap" &&
      n.data.action === "addLiquidity" &&
      n.data.liquidityTokenA &&
      n.data.liquidityTokenB &&
      ((n.data.liquidityTokenA === a && n.data.liquidityTokenB === b) ||
        (n.data.liquidityTokenA === b && n.data.liquidityTokenB === a))
  );
  if (!addLiqNode?.data.liquidityTokenA || !addLiqNode.data.liquidityTokenB)
    throw new Error(`No upstream addLiquidity node for ${asset}`);
  const tokenSymbol = addLiqNode.data.liquidityTokenA === "ETH" ? addLiqNode.data.liquidityTokenB : addLiqNode.data.liquidityTokenA;
  const chainTokens = TOKEN_ADDRESSES[chainId as keyof typeof TOKEN_ADDRESSES];
  const weth = WETH_ADDRESS[chainId as keyof typeof WETH_ADDRESS];
  const router = UNISWAP_V2_ROUTER[chainId as keyof typeof UNISWAP_V2_ROUTER];
  if (!chainTokens || !weth || !router) throw new Error(`Uniswap V2 not supported on chain ${chainId}`);
  const tokenAddress = chainTokens[tokenSymbol as keyof typeof chainTokens];
  if (!tokenAddress) throw new Error(`Token ${tokenSymbol} not supported on chain ${chainId}`);
  const chain = CHAINS[chainId];
  if (!chain) throw new Error(`Unsupported chain ${chainId}`);
  const clientId = (typeof import.meta !== "undefined" && (import.meta as { env?: { VITE_THIRDWEB_CLIENT_ID?: string } }).env?.VITE_THIRDWEB_CLIENT_ID) || "";
  const rpcUrl = chainId === 1 ? `https://ethereum.rpc.thirdweb.com/${clientId}` : chainId === 42161 ? `https://arbitrum.rpc.thirdweb.com/${clientId}` : undefined;
  const client = createPublicClient({ chain, transport: rpcUrl ? http(rpcUrl) : http() });
  const routerAddr = getAddress(router);
  const factoryAddr = await client.readContract({
    address: routerAddr,
    abi: UNISWAP_V2_ROUTER_FACTORY_ABI,
    functionName: "factory",
  });
  const pairAddress = await client.readContract({
    address: getAddress(factoryAddr as string),
    abi: UNISWAP_V2_FACTORY_ABI,
    functionName: "getPair",
    args: [getAddress(tokenAddress), getAddress(weth)],
  });
  if (!pairAddress || pairAddress === "0x0000000000000000000000000000000000000000")
    throw new Error(`Liquidity pair not found for ${asset} on chain ${chainId}`);
  return getAddress(pairAddress as string);
}

/**
 * Get expected token amount for addLiquidityETH from pair reserves; add small buffer for approval.
 * Returns amountTokenDesired (expected + buffer) and amountTokenMin (for slippage).
 */
async function getExpectedTokenAmountForAddLiquidity(
  chainId: number,
  tokenAddress: string,
  amountWei: bigint,
  slippagePercent: number
): Promise<{ amountTokenDesired: bigint; amountTokenMin: bigint }> {
  const chain = CHAINS[chainId];
  if (!chain) throw new Error(`Unsupported chain ${chainId}`);
  const router = UNISWAP_V2_ROUTER[chainId as keyof typeof UNISWAP_V2_ROUTER];
  const weth = WETH_ADDRESS[chainId as keyof typeof WETH_ADDRESS];
  if (!router || !weth) throw new Error(`Uniswap V2 not supported on chain ${chainId}`);

  // Use same RPC as app (wagmi/Thirdweb) so reads work in browser; fallback to default chain RPC
  const clientId = (typeof import.meta !== "undefined" && (import.meta as { env?: { VITE_THIRDWEB_CLIENT_ID?: string } }).env?.VITE_THIRDWEB_CLIENT_ID) || "";
  const rpcUrl = chainId === 1
    ? `https://ethereum.rpc.thirdweb.com/${clientId}`
    : chainId === 42161
      ? `https://arbitrum.rpc.thirdweb.com/${clientId}`
      : undefined;
  const client = createPublicClient({ chain, transport: rpcUrl ? http(rpcUrl) : http() });
  // Get factory address from router.factory() so we never hardcode – returns correct 20-byte address
  const routerAddr = getAddress(router);
  const factoryAddr = await client.readContract({
    address: routerAddr,
    abi: UNISWAP_V2_ROUTER_FACTORY_ABI,
    functionName: "factory",
  });
  const tokenAddr = getAddress(tokenAddress);
  const wethAddr = getAddress(weth);
  // Get pair address via factory.getPair(tokenA, tokenB)
  const pairAddress = await client.readContract({
    address: getAddress(factoryAddr as string),
    abi: UNISWAP_V2_FACTORY_ABI,
    functionName: "getPair",
    args: [tokenAddr, wethAddr],
  });
  if (!pairAddress || pairAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("Liquidity pair not found for this token/ETH on this chain");
  }
  const pairAddr = getAddress(pairAddress as string);

  const [reserves, token0] = await Promise.all([
    client.readContract({ address: pairAddr, abi: UNISWAP_V2_PAIR_ABI, functionName: "getReserves" }),
    client.readContract({ address: pairAddr, abi: UNISWAP_V2_PAIR_ABI, functionName: "token0" }),
  ]);
  const isWethToken0 = (token0 as string).toLowerCase() === wethAddr.toLowerCase();
  const reserveWETH = isWethToken0 ? reserves[0] : reserves[1];
  const reserveToken = isWethToken0 ? reserves[1] : reserves[0];
  if (reserveWETH === 0n) throw new Error("Pair has no liquidity");

  // amountToken = (amountWei * reserveToken) / reserveWETH (same ratio as pool)
  const amountTokenExpected = (amountWei * reserveToken) / reserveWETH;
  const amountTokenDesired = (amountTokenExpected * BigInt(10000 + ADD_LIQUIDITY_APPROVAL_BUFFER_BPS)) / BigInt(10000);
  const amountTokenMin = (amountTokenExpected * BigInt(Math.floor((100 - slippagePercent) * 100))) / BigInt(10000);
  return { amountTokenDesired, amountTokenMin };
}

/**
 * Prepare batched calls for Uniswap addLiquidity (ETH + token pair only).
 * Approves only the expected token amount (+ small buffer), not unlimited.
 */
async function prepareUniswapAddLiquidityCalls(
  node: Node<ProtocolNodeData>,
  chainId: number,
  account: string
): Promise<BatchedTransactionCall[]> {
  const data = node.data;
  if (data.protocol !== "uniswap" || data.action !== "addLiquidity") {
    throw new Error("Node is not a Uniswap addLiquidity node");
  }
  const a = data.liquidityTokenA ?? "";
  const b = data.liquidityTokenB ?? "";
  if (a !== "ETH" && b !== "ETH") {
    throw new Error("Add liquidity execution only supports ETH + token pair for now");
  }
  const tokenSymbol = a === "ETH" ? b : a;
  const chainTokens = TOKEN_ADDRESSES[chainId as keyof typeof TOKEN_ADDRESSES];
  const router = UNISWAP_V2_ROUTER[chainId as keyof typeof UNISWAP_V2_ROUTER];
  if (!chainTokens || !router) {
    throw new Error(`Uniswap add liquidity not supported on chain ${chainId}`);
  }
  const tokenAddress = chainTokens[tokenSymbol as keyof typeof chainTokens];
  if (!tokenAddress) {
    throw new Error(`Token ${tokenSymbol} not supported on chain ${chainId}`);
  }
  const amountStr = data.amount?.trim() || "0";
  const amountWei = parseEther(amountStr);
  if (amountWei <= 0n) {
    throw new Error("Add liquidity: enter an ETH amount");
  }
  const slippagePercent = data.maxSlippageAuto !== false
    ? 0.5
    : Math.min(50, Math.max(0, parseFloat(data.maxSlippagePercent ?? "0.5") || 0.5));
  const amountETHMin = (amountWei * BigInt(Math.floor(100 - slippagePercent) * 100)) / BigInt(10000);
  const deadlineMinutes = data.swapDeadlineMinutes ?? 30;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineMinutes * 60);

  const { amountTokenDesired, amountTokenMin } = await getExpectedTokenAmountForAddLiquidity(
    chainId,
    tokenAddress,
    amountWei,
    slippagePercent
  );

  const approveData = encodeFunctionData({
    abi: ERC20_APPROVE_ABI,
    functionName: "approve",
    args: [router as `0x${string}`, amountTokenDesired],
  });
  const addLiqData = encodeFunctionData({
    abi: UNISWAP_ADD_LIQUIDITY_ETH_ABI,
    functionName: "addLiquidityETH",
    args: [
      tokenAddress as `0x${string}`,
      amountTokenDesired,
      amountTokenMin,
      amountETHMin,
      account as `0x${string}`,
      deadline,
    ],
  });
  return [
    { to: tokenAddress, data: approveData, value: toHex(0n) },
    { to: router, data: addLiqData, value: toHex(amountWei) },
  ];
}

/**
 * Prepare batched calls for Morpho vault deposit (lend) or withdraw.
 * Deposit: approve asset for vault, then vault.deposit(assets, receiver).
 * Withdraw: vault.withdraw(assets, receiver, owner).
 */
function prepareMorphoVaultCalls(
  node: Node<ProtocolNodeData>,
  chainId: number,
  account: string
): BatchedTransactionCall[] {
  const { action, morphoVaultAddress, asset: assetSymbol, amount } = node.data;
  if (!morphoVaultAddress || !assetSymbol || !amount?.trim()) {
    throw new Error("Morpho: vault, asset and amount are required");
  }
  const tokens = TOKEN_ADDRESSES[chainId as keyof typeof TOKEN_ADDRESSES];
  const assetAddress = tokens?.[assetSymbol as keyof typeof tokens];
  if (!assetAddress) {
    throw new Error(`Morpho: unsupported asset "${assetSymbol}" on this chain`);
  }
  const decimals = TOKEN_DECIMALS[assetSymbol] ?? 18;
  const amountWei = parseUnits(amount.trim(), decimals);
  const vaultAddress = getAddress(morphoVaultAddress);

  if (action === "lend" || action === "deposit") {
    const approveData = encodeFunctionData({
      abi: ERC20_APPROVE_ABI,
      functionName: "approve",
      args: [vaultAddress, amountWei],
    });
    const depositData = encodeFunctionData({
      abi: MORPHO_VAULT_DEPOSIT_ABI,
      functionName: "deposit",
      args: [amountWei, getAddress(account)],
    });
    return [
      { to: assetAddress, data: approveData, value: toHex(0n) },
      { to: vaultAddress, data: depositData, value: toHex(0n) },
    ];
  }

  if (action === "withdraw") {
    const withdrawData = encodeFunctionData({
      abi: MORPHO_VAULT_WITHDRAW_ABI,
      functionName: "withdraw",
      args: [amountWei, getAddress(account), getAddress(account)],
    });
    return [{ to: vaultAddress, data: withdrawData, value: toHex(0n) }];
  }

  throw new Error(`Morpho: action "${action}" is not supported for execution`);
}

/**
 * Prepare batched transaction calls for all nodes (transfers + custom + uniswap + morpho) in order.
 * Returns a flat list for EIP-7702 wallet_sendCalls (approve + addLiquidity are separate calls in the same batch).
 * @param account - Required for Uniswap swap/addLiquidity (recipient of output tokens)
 * @param edges - Optional edges so transfer nodes can resolve LP token from upstream addLiquidity
 * @param allNodes - Optional full node list for LP resolution (defaults to nodes)
 */
export const prepareBatchedCalls = async (
  nodes: Node<ProtocolNodeData>[],
  chainId: number,
  account?: string,
  edges?: { source: string; target: string }[],
  allNodes?: Node<ProtocolNodeData>[]
): Promise<BatchedTransactionCall[]> => {
  const calls: BatchedTransactionCall[] = [];
  let lastError: Error | null = null;
  const nodeList = allNodes ?? nodes;
  for (const node of nodes) {
    if (node.data.protocol === "transfer") {
      const transferCalls = await prepareTransferCalls([node], chainId, edges, nodeList);
      calls.push(...transferCalls);
    } else if (node.data.protocol === "custom") {
      calls.push(prepareCustomContractCall(node));
    } else if (node.data.protocol === "uniswap" && account) {
      // Uniswap defaults to swap mode when action is undefined/null
      if (node.data.action === "swap" || node.data.action == null) {
        const versionAuto = node.data.uniswapVersionAuto !== false;
        const version = node.data.uniswapVersion ?? "v2";
        const useV2 = versionAuto || version === "v2";
        if (!useV2) {
          console.warn(`Uniswap ${version} swap execution not yet supported, skipping node ${node.id}`);
        } else {
          try {
            calls.push(...(await prepareUniswapSwapCall(node, chainId, account)));
          } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            console.warn(`Skipping Uniswap node ${node.id}:`, err);
          }
        }
      } else if (node.data.action === "addLiquidity") {
        const versionAuto = node.data.uniswapVersionAuto !== false;
        const version = node.data.uniswapVersion ?? "v2";
        const useV2 = versionAuto || version === "v2";
        if (!useV2) {
          console.warn(`Uniswap ${version} add liquidity not yet supported, skipping node ${node.id}`);
        } else {
          try {
            calls.push(...(await prepareUniswapAddLiquidityCalls(node, chainId, account)));
          } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            console.warn(`Skipping Uniswap add liquidity node ${node.id}:`, err);
          }
        }
      }
      // removeLiquidity not implemented for execution
    } else if (node.data.protocol === "morpho" && account) {
      const action = node.data.action;
      const isVaultAction =
        (action === "lend" || action === "deposit") && node.data.morphoVaultAddress;
      const isWithdraw = action === "withdraw" && node.data.morphoVaultAddress;
      if (isVaultAction || isWithdraw) {
        try {
          calls.push(...prepareMorphoVaultCalls(node, chainId, account));
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          console.warn(`Skipping Morpho node ${node.id}:`, err);
        }
      }
      // borrow/repay not implemented for execution
    }
  }
  if (calls.length === 0 && lastError) {
    throw lastError;
  }
  return calls;
};

/**
 * Resolve ENS name to address
 * @param addressOrENS - Address or ENS name
 * @param chainId - Chain ID for resolution
 * @returns Promise with resolved address
 */
const resolveAddress = async (addressOrENS: string, _chainId: number): Promise<string> => {
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
 * @param chainId - Current chain ID
 * @param edges - Optional edges so LP token (pair) address can be resolved from upstream addLiquidity
 * @param allNodes - Optional full node list when resolving LP from upstream addLiquidity
 */
export const prepareTransferCalls = async (
  nodes: Node<ProtocolNodeData>[],
  chainId: number,
  edges?: { source: string; target: string }[],
  allNodes?: Node<ProtocolNodeData>[]
): Promise<BatchedTransactionCall[]> => {
  const calls: BatchedTransactionCall[] = [];

  for (const node of nodes) {
    if (node.data.protocol !== "transfer") continue;
    if (!node.data.recipientAddress || !node.data.amount || !node.data.asset) {
      console.warn(`Skipping transfer node ${node.id} - missing required fields`);
      continue;
    }

    const { recipientAddress, amount, asset } = node.data;

    try {
      const resolvedAddress = await resolveAddress(recipientAddress, chainId);

      if (asset.toUpperCase() === "ETH") {
        const value = parseEther(amount);
        calls.push({ to: resolvedAddress, value: toHex(value) });
        console.log(`Prepared ETH transfer: ${amount} ETH to ${resolvedAddress}`);
      } else if (asset.endsWith(" LP") && edges && allNodes) {
        const pairAddress = await getPairAddressForLpAsset(chainId, asset, allNodes, edges, node.id);
        const amountInWei = parseUnits(amount, UNISWAP_V2_LP_DECIMALS);
        const transferData = encodeFunctionData({
          abi: ERC20_TRANSFER_ABI,
          functionName: "transfer",
          args: [resolvedAddress as `0x${string}`, amountInWei],
        });
        calls.push({ to: pairAddress, data: transferData, value: toHex(0n) });
        console.log(`Prepared LP transfer: ${amount} ${asset} to ${resolvedAddress}`);
      } else {
        const assetUpper = asset.toUpperCase();
        const chainTokens = TOKEN_ADDRESSES[chainId as keyof typeof TOKEN_ADDRESSES];
        if (!chainTokens) throw new Error(`Unsupported chain ID: ${chainId}`);
        const tokenAddress = chainTokens[assetUpper as keyof typeof chainTokens];
        if (!tokenAddress) throw new Error(`Token ${asset} not supported on chain ${chainId}`);
        const decimals = TOKEN_DECIMALS[assetUpper] || 18;
        const amountInWei = parseUnits(amount, decimals);
        const transferData = encodeFunctionData({
          abi: ERC20_TRANSFER_ABI,
          functionName: "transfer",
          args: [resolvedAddress as `0x${string}`, amountInWei],
        });
        calls.push({ to: tokenAddress, data: transferData, value: toHex(0n) });
        console.log(`Prepared ERC20 transfer: ${amount} ${asset} to ${resolvedAddress}`);
      }
    } catch (error) {
      console.error(`Error preparing transfer for node ${node.id}:`, error);
      throw error;
    }
  }

  return calls;
};

/**
 * Evaluate a conditional logic node: call the view function and compare result to compareValue.
 * Returns true if the condition is met (proceed to next action), false otherwise.
 */
export async function evaluateConditionalNode(
  node: Node<ProtocolNodeData>,
  chainId: number
): Promise<boolean> {
  const data = node.data;
  if (data.protocol !== "conditional") {
    throw new Error("Node is not a conditional logic node");
  }
  const { contractAddress, contractAbi, selectedFunction, functionArgs, comparisonOperator, compareValue } = data;
  if (!contractAddress || !contractAbi || !selectedFunction || comparisonOperator == null || compareValue == null) {
    throw new Error(`Conditional node ${node.id}: missing contract, function, operator, or compare value`);
  }
  const chain = CHAINS[chainId];
  if (!chain) {
    throw new Error(`Unsupported chain ${chainId} for conditional`);
  }
  const publicClient = createPublicClient({ chain, transport: http() });
  const fn = (contractAbi as Array<{ type: string; name: string; inputs?: Array<{ name: string; type: string }> }>).find(
    (item) => item.type === "function" && item.name === selectedFunction
  );
  const args = (fn?.inputs ?? []).map((inp) => parseAbiArgValue(inp.type, (functionArgs || {})[inp.name] ?? "0"));
  const result = await publicClient.readContract({
    address: contractAddress as `0x${string}`,
    abi: contractAbi,
    functionName: selectedFunction,
    args: args.length > 0 ? args : undefined,
  });
  const resultStr = typeof result === "bigint" ? result.toString() : String(result);
  const cmpStr = String(compareValue).trim();
  switch (comparisonOperator) {
    case "gt":
      return tryNumericCompare(result, cmpStr, (a, b) => a > b) ?? resultStr > cmpStr;
    case "gte":
      return tryNumericCompare(result, cmpStr, (a, b) => a >= b) ?? resultStr >= cmpStr;
    case "lt":
      return tryNumericCompare(result, cmpStr, (a, b) => a < b) ?? resultStr < cmpStr;
    case "lte":
      return tryNumericCompare(result, cmpStr, (a, b) => a <= b) ?? resultStr <= cmpStr;
    case "ne":
      return resultStr !== cmpStr;
    default:
      return resultStr === cmpStr;
  }
}

function tryNumericCompare(
  result: unknown,
  compareValue: string,
  op: (a: bigint, b: bigint) => boolean
): boolean | null {
  try {
    const a = typeof result === "bigint" ? result : BigInt(String(result));
    const b = BigInt(compareValue);
    return op(a, b);
  } catch {
    return null;
  }
}

/**
 * Read a view function result for display (e.g. "Current value" on Conditional Logic card).
 * Returns the result as a string.
 */
export async function readContractViewResult(
  chainId: number,
  address: string,
  abi: Abi,
  functionName: string,
  functionArgs: Record<string, string> | undefined,
  inputs: Array<{ name: string; type: string }>
): Promise<string> {
  const chain = CHAINS[chainId];
  if (!chain) {
    throw new Error(`Unsupported chain ${chainId}`);
  }
  const publicClient = createPublicClient({ chain, transport: http() });
  const args = inputs.map((inp) => parseAbiArgValue(inp.type, (functionArgs || {})[inp.name] ?? "0"));
  const result = await publicClient.readContract({
    address: address as `0x${string}`,
    abi,
    functionName,
    args: args.length > 0 ? args : undefined,
  });
  return typeof result === "bigint" ? result.toString() : String(result);
}

/**
 * Read ETH balance of an address (EOA or contract) for display (e.g. "Current value" on Balance Logic card).
 * Returns the balance as a string in ETH (e.g. "1.5").
 */
export async function readBalanceResult(chainId: number, address: string): Promise<string> {
  const chain = CHAINS[chainId];
  if (!chain) {
    throw new Error(`Unsupported chain ${chainId}`);
  }
  const publicClient = createPublicClient({ chain, transport: http() });
  const balance = await publicClient.getBalance({ address: address.trim() as `0x${string}` });
  const ethValue = Number(balance) / 1e18;
  return ethValue === 0 ? "0" : ethValue.toFixed(6);
}

/**
 * Evaluate a balance logic node: get ETH balance of the address and compare to balanceLogicCompareValue.
 * Returns true if the condition is met (proceed to next action), false otherwise.
 */
export async function evaluateBalanceLogicNode(
  node: Node<ProtocolNodeData>,
  chainId: number
): Promise<boolean> {
  const data = node.data;
  if (data.protocol !== "balanceLogic") {
    throw new Error("Node is not a balance logic node");
  }
  const { balanceLogicAddress, balanceLogicComparisonOperator, balanceLogicCompareValue } = data;
  if (!balanceLogicAddress?.trim() || balanceLogicComparisonOperator == null || balanceLogicCompareValue == null) {
    throw new Error(`Balance logic node ${node.id}: missing address, operator, or compare value`);
  }
  const balanceStr = await readBalanceResult(chainId, balanceLogicAddress.trim());
  const result = BigInt(Math.floor(parseFloat(balanceStr) * 1e18));
  const cmpStr = String(balanceLogicCompareValue).trim();
  let compareVal: bigint;
  try {
    if (cmpStr.includes(".")) {
      compareVal = BigInt(Math.floor(parseFloat(cmpStr) * 1e18));
    } else {
      compareVal = BigInt(cmpStr);
    }
  } catch {
    compareVal = BigInt(0);
  }
  switch (balanceLogicComparisonOperator) {
    case "gt":
      return result > compareVal;
    case "gte":
      return result >= compareVal;
    case "lt":
      return result < compareVal;
    case "lte":
      return result <= compareVal;
    case "ne":
      return result !== compareVal;
    default:
      return result === compareVal;
  }
}

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

        // EIP-5792: status is numeric (200 = confirmed) or string ('CONFIRMED')
        const s = status?.status as number | string | undefined;
        const confirmed = s === 'CONFIRMED' || s === 200;
        const failed = s === 'FAILED' || s === 400 || s === 500 || s === 600;
        if (confirmed) {
          console.log('Batch confirmed! Receipts:', status.receipts);
          const txHash = status.receipts?.[0]?.transactionHash;
          if (txHash) {
            return txHash;
          }
        } else if (failed) {
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
 * Send a single transaction via eth_sendTransaction (for wallets that don't support batching).
 * Returns the transaction hash once the user has signed and the tx is submitted.
 */
export const sendSingleTransaction = async (
  call: BatchedTransactionCall,
  account: string,
  chainId: number
): Promise<string> => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No ethereum provider found');
  }
  const chainIdHex = `0x${chainId.toString(16)}`;
  const txHash = await window.ethereum.request<string>({
    method: 'eth_sendTransaction',
    params: [{
      from: account,
      to: call.to as `0x${string}`,
      data: call.data as `0x${string}` | undefined,
      value: call.value,
      chainId: chainIdHex,
    }],
  });
  if (!txHash || typeof txHash !== 'string') {
    throw new Error('No transaction hash returned');
  }
  return txHash;
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
