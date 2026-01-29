import type { Node, Edge } from "@xyflow/react";
import type { Abi } from "viem";

export type ProtocolType =
  | "wallet"
  | "morpho"
  | "aave"
  | "compound"
  | "spark"
  | "uniswap"
  | "curve"
  | "pendle"
  | "custom"
  | "transfer";

export type ActionType =
  | "lend"
  | "borrow"
  | "deposit"
  | "withdraw"
  | "swap"
  | "stake";

export interface ProtocolNodeData extends Record<string, unknown> {
  protocol: ProtocolType;
  label: string;
  action?: ActionType;
  asset?: string;
  amount?: string;
  collateralAsset?: string;
  borrowAsset?: string;
  targetAPY?: string;
  sequenceNumber?: number;
  recipientAddress?: string; // For transfer nodes
  // Custom contract node
  contractAddress?: string;
  contractAbi?: Abi;
  customContractVerified?: boolean;
  selectedFunction?: string;
  functionArgs?: Record<string, string>;
}

export type ProtocolNode = Node<ProtocolNodeData>;

export interface NodeTemplate {
  protocol: ProtocolType;
  label: string;
  description: string;
  icon?: string;
  color?: string;
  availableActions: ActionType[];
  url?: string;
}
