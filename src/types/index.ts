import type { Node, Edge } from "@xyflow/react";

export type ProtocolType =
  | "wallet"
  | "morpho"
  | "aave"
  | "compound"
  | "spark"
  | "uniswap"
  | "curve";

export type ActionType =
  | "lend"
  | "borrow"
  | "deposit"
  | "withdraw"
  | "swap"
  | "stake";

export interface ProtocolNodeData {
  protocol: ProtocolType;
  label: string;
  action?: ActionType;
  asset?: string;
  amount?: string;
  collateralAsset?: string;
  borrowAsset?: string;
  targetAPY?: string;
}

export type ProtocolNode = Node<ProtocolNodeData>;

export interface NodeTemplate {
  protocol: ProtocolType;
  label: string;
  description: string;
  icon?: string;
  color?: string;
  availableActions: ActionType[];
}
