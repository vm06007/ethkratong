import type { NodeTemplate } from "@/types";

export const protocolTemplates: NodeTemplate[] = [
  {
    protocol: "wallet",
    label: "Wallet",
    description: "Your connected wallet - starting point for transactions",
    color: "bg-purple-500",
    availableActions: ["deposit", "withdraw"],
  },
  {
    protocol: "morpho",
    label: "Morpho",
    description: "Morpho Protocol - Optimized lending and borrowing",
    color: "bg-blue-500",
    availableActions: ["lend", "borrow", "deposit", "withdraw"],
  },
  {
    protocol: "aave",
    label: "Aave",
    description: "Aave Protocol - Decentralized lending protocol",
    color: "bg-pink-500",
    availableActions: ["lend", "borrow", "deposit", "withdraw"],
  },
  {
    protocol: "compound",
    label: "Compound",
    description: "Compound Finance - Algorithmic money market",
    color: "bg-green-500",
    availableActions: ["lend", "borrow", "deposit", "withdraw"],
  },
  {
    protocol: "spark",
    label: "Spark",
    description: "Spark Protocol - MakerDAO's lending protocol",
    color: "bg-orange-500",
    availableActions: ["lend", "borrow", "deposit", "withdraw"],
  },
  {
    protocol: "uniswap",
    label: "Uniswap",
    description: "Uniswap - Decentralized exchange",
    color: "bg-red-500",
    availableActions: ["swap"],
  },
  {
    protocol: "curve",
    label: "Curve",
    description: "Curve Finance - Stablecoin DEX",
    color: "bg-yellow-500",
    availableActions: ["swap", "stake"],
  },
];
