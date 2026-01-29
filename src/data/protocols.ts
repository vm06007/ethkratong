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
      },
      {
        protocol: "aave",
        label: "Aave",
        description: "Decentralized lending protocol",
        color: "bg-pink-500",
        availableActions: ["lend", "borrow", "deposit", "withdraw"],
      },
      {
        protocol: "compound",
        label: "Compound",
        description: "Algorithmic money market",
        color: "bg-green-500",
        availableActions: ["lend", "borrow", "deposit", "withdraw"],
      },
      {
        protocol: "spark",
        label: "Spark",
        description: "MakerDAO's lending protocol",
        color: "bg-orange-500",
        availableActions: ["lend", "borrow", "deposit", "withdraw"],
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
        availableActions: ["swap"],
      },
      {
        protocol: "curve",
        label: "Curve",
        description: "Stablecoin-optimized DEX",
        color: "bg-yellow-500",
        availableActions: ["swap", "stake"],
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
      },
    ],
  },
  {
    name: "Arbitrary Contract",
    icon: "settings",
    protocols: [
      {
        protocol: "custom",
        label: "Custom Contract",
        description: "Interact with any contract address",
        color: "bg-gray-500",
        availableActions: ["deposit", "withdraw"],
      },
      {
        protocol: "transfer",
        label: "Transfer",
        description: "Send tokens to an address",
        color: "bg-teal-500",
        availableActions: ["deposit"],
      },
    ],
  },
];

// Flatten all protocols for easy access
export const allProtocols: NodeTemplate[] = protocolCategories.flatMap(
  (category) => category.protocols
);
