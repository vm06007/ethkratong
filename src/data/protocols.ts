import type { NodeTemplate } from "@/types";

export interface ProtocolCategory {
  name: string;
  icon: string;
  protocols: NodeTemplate[];
}

export const protocolCategories: ProtocolCategory[] = [
  {
    name: "Wallet",
    icon: "wallet",
    protocols: [
      {
        protocol: "wallet",
        label: "Wallet",
        description: "Your connected wallet - starting point",
        color: "bg-purple-500",
        availableActions: ["deposit", "withdraw"],
      },
    ],
  },
  {
    name: "Lending Protocols",
    icon: "building",
    protocols: [
      {
        protocol: "morpho",
        label: "Morpho",
        description: "Optimized lending and borrowing",
        color: "bg-blue-500",
        availableActions: ["lend", "borrow", "deposit", "withdraw"],
        url: "https://morpho.org",
      },
      {
        protocol: "aave",
        label: "Aave",
        description: "Decentralized lending protocol",
        color: "bg-pink-500",
        availableActions: ["lend", "borrow", "deposit", "withdraw"],
        url: "https://aave.com",
      },
      {
        protocol: "compound",
        label: "Compound",
        description: "Algorithmic money market",
        color: "bg-green-500",
        availableActions: ["lend", "borrow", "deposit", "withdraw"],
        url: "https://compound.finance",
      },
      {
        protocol: "spark",
        label: "Spark",
        description: "MakerDAO's lending protocol",
        color: "bg-orange-500",
        availableActions: ["lend", "borrow", "deposit", "withdraw"],
        url: "https://spark.fi",
      },
    ],
  },
  {
    name: "Swap Protocols",
    icon: "repeat",
    protocols: [
      {
        protocol: "uniswap",
        label: "Uniswap",
        description: "Leading decentralized exchange",
        color: "bg-red-500",
        availableActions: ["swap", "addLiquidity"],
        url: "https://app.uniswap.org",
      },
      {
        protocol: "curve",
        label: "Curve",
        description: "Stablecoin-optimized DEX",
        color: "bg-yellow-500",
        availableActions: ["swap", "stake"],
        url: "https://curve.fi",
      },
    ],
  },
  {
    name: "Yield & Derivatives",
    icon: "trending-up",
    protocols: [
      {
        protocol: "pendle",
        label: "Pendle",
        description: "Yield trading protocol",
        color: "bg-indigo-500",
        availableActions: ["swap", "stake"],
        url: "https://www.pendle.finance",
      },
    ],
  },
  {
    name: "Custom Actions",
    icon: "settings",
    protocols: [
      {
        protocol: "custom",
        label: "Arbitrary Contract",
        description: "Interact with any contract address",
        color: "bg-gray-500",
        availableActions: ["deposit", "withdraw"],
      },
      {
        protocol: "transfer",
        label: "Arbitrary Transfer",
        description: "Send tokens to an address",
        color: "bg-teal-500",
        availableActions: ["deposit"],
      },
      {
        protocol: "conditional",
        label: "Conditional Logic",
        description: "If view function result meets condition, proceed to next action",
        color: "bg-amber-500",
        availableActions: [],
      },
      {
        protocol: "balanceLogic",
        label: "Balance Logic",
        description: "If ETH balance of address meets condition, proceed to next action",
        color: "bg-cyan-500",
        availableActions: [],
      },
    ],
  },
];

// Flatten all protocols for easy access
export const allProtocols: NodeTemplate[] = protocolCategories.flatMap(
  (category) => category.protocols
);
