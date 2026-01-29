import { createPublicClient, http, isAddress, type Abi, type Chain } from "viem";
import { mainnet, arbitrum } from "viem/chains";

// Etherscan API V2: single chain-agnostic endpoint (https://docs.etherscan.io/v2-migration)
const ETHERSCAN_V2_BASE = "https://api.etherscan.io/v2/api";
const ETHERSCAN_API_KEY_ENV = "VITE_ETHERSCAN_API_KEY";

const CHAINS: Record<number, Chain> = {
    1: mainnet,
    42161: arbitrum,
};

/**
 * Check if an address is a contract (has bytecode) on the given chain.
 */
export async function isContractAddress(chainId: number, address: string): Promise<boolean> {
    const trimmed = address.trim();
    if (!isAddress(trimmed)) return false;

    const chain = CHAINS[chainId];
    if (!chain) {
        console.warn(`Unsupported chainId for contract check: ${chainId}`);
        return false;
    }

    const publicClient = createPublicClient({
        chain,
        transport: http(),
    });

    const bytecode = await publicClient.getBytecode({ address: trimmed as `0x${string}` });
    return bytecode !== undefined && bytecode !== "0x" && bytecode.length > 2;
}

/**
 * Fetch contract ABI via Etherscan API V2 (chain-agnostic, one API key for all chains).
 * Contract must be verified on the explorer for the given chain.
 * @see https://docs.etherscan.io/v2-migration
 */
export async function fetchContractAbi(chainId: number, address: string): Promise<Abi> {
    const trimmed = address.trim();
    if (!isAddress(trimmed)) {
        throw new Error("Invalid contract address");
    }

    const apiKey = import.meta.env[ETHERSCAN_API_KEY_ENV];
    if (!apiKey) {
        throw new Error("Etherscan API key required (VITE_ETHERSCAN_API_KEY in .env)");
    }

    const url = `${ETHERSCAN_V2_BASE}?chainid=${chainId}&module=contract&action=getabi&address=${trimmed}&apikey=${apiKey}`;

    const res = await fetch(url);
    const json = await res.json();

    if (json.status !== "1" || !json.result) {
        const msg = json.result || json.message || "Contract not verified or ABI not found";
        throw new Error(typeof msg === "string" ? msg : "Failed to fetch ABI");
    }

    const abi = typeof json.result === "string" ? JSON.parse(json.result) : json.result;
    if (!Array.isArray(abi)) {
        throw new Error("Invalid ABI format");
    }
    return abi as Abi;
}

/** Function shape we use for selector and args (name + optional inputs). */
export interface AbiFunctionInfo {
    name: string;
    type: string;
    inputs?: Array<{ name: string; type: string }>;
}

/** stateMutability values that are read-only (excluded from "call" list). */
const VIEW_LIKE: readonly string[] = ["view", "pure"];

/**
 * Get only non-view functions from ABI (payable + nonpayable). Excludes view and pure so
 * the list only shows functions that can be used in transactions.
 */
export function getAbiFunctions(abi: Abi): AbiFunctionInfo[] {
    return abi
        .filter((item) => {
            if (typeof item !== "object" || item === null || !("type" in item) || (item as { type?: string }).type !== "function" || !("name" in item)) {
                return false;
            }
            const fn = item as { name: string; stateMutability?: string };
            const mut = fn.stateMutability?.toLowerCase();
            return !VIEW_LIKE.includes(mut ?? "");
        })
        .map((item) => {
            const fn = item as { name: string; type: string; inputs?: Array<{ name: string; type: string }> };
            return { name: fn.name, type: fn.type, inputs: fn.inputs };
        });
}
