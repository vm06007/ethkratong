import type { Node } from "@xyflow/react";
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
  | "transfer"
  | "conditional"
  | "balanceLogic";

export type ActionType =
  | "lend"
  | "borrow"
  | "deposit"
  | "withdraw"
  | "swap"
  | "stake"
  | "addLiquidity"
  | "removeLiquidity";

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
  // Conditional Logic node (view function + comparison)
  comparisonOperator?: "gt" | "gte" | "lt" | "lte" | "ne";
  compareValue?: string;
  conditionalContractVerified?: boolean;
  // Balance Logic node (ETH balance of EOA/contract + comparison)
  balanceLogicAddress?: string;
  balanceLogicComparisonOperator?: "gt" | "gte" | "lt" | "lte" | "ne";
  balanceLogicCompareValue?: string;
  // Uniswap (and DEX) swap / liquidity
  swapFrom?: string;
  swapTo?: string;
  liquidityTokenA?: string;
  liquidityTokenB?: string;
  /** Simulated/estimated amount out from swap (for display and use in next action) */
  estimatedAmountOut?: string;
  /** Symbol of the estimated output token (e.g. USDC) */
  estimatedAmountOutSymbol?: string;
  /** Estimated LP tokens from addLiquidity (for display and transfer step) */
  estimatedLpAmount?: string;
  /** Label for LP token (e.g. "ETH-USDC LP") */
  estimatedLpSymbol?: string;
  /** Max slippage % (e.g. "0.5" for 0.5%). Used when maxSlippageAuto is false. */
  maxSlippagePercent?: string;
  /** Use automatic slippage (default true) */
  maxSlippageAuto?: boolean;
  /** Swap deadline in minutes (e.g. 30) */
  swapDeadlineMinutes?: number;
  /** Uniswap version for swap / addLiquidity / removeLiquidity (v2 supported for execution; v3/v4 UI ready) */
  uniswapVersion?: "v2" | "v3" | "v4";
  /** When true, choose version automatically based on best route (default true) */
  uniswapVersionAuto?: boolean;
  /** Morpho: vault contract address when action is deposit/withdraw (lend/redeem) */
  morphoVaultAddress?: string;
  /** Morpho: vault display name (for compact view) */
  morphoVaultName?: string;
  /** Morpho: vault APY as decimal (e.g. 0.05 for 5%) */
  morphoVaultApy?: number;
  /** Track if user has manually edited the amount field (to prevent auto-sync overwriting user input) */
  amountManuallyEdited?: boolean;
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
  /** When true, protocol is not yet available - shown as non-draggable with "coming soon" in sidebar */
  comingSoon?: boolean;
}
