# DeFi Strategy Builder

A visual transaction builder for creating complex DeFi strategies across multiple protocols using EIP-7702.

## Features

- **Visual Canvas**: Drag-and-drop interface for building DeFi transaction flows
- **Protocol Support**:
  - Morpho (Lending/Borrowing)
  - Aave (Lending/Borrowing)
  - Compound (Lending/Borrowing)
  - Spark (Lending/Borrowing)
  - Uniswap (Swapping)
  - Curve (Swapping/Staking)
- **Transaction Chaining**: Connect protocols to create complex strategies
- **EIP-7702 Ready**: Built for the new account abstraction standard

## Getting Started

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build
```

## How to Use

1. **Start with your wallet**: The canvas starts with a wallet node representing your connected wallet
2. **Drag protocols**: Drag protocol cards from the left sidebar onto the canvas
3. **Connect nodes**: Click and drag from the green output handle to the blue input handle of another node
4. **Configure actions**: Click on any node to expand it and configure:
   - Action type (lend, borrow, deposit, withdraw, swap, stake)
   - Asset (e.g., USDC, ETH, DAI)
   - Amount
5. **Build strategies**: Chain multiple protocols together to create complex yield strategies

## Example Strategies

### Leveraged Yield Farming
1. Wallet → Aave (Deposit ETH as collateral)
2. Aave → Aave (Borrow USDC)
3. Aave → Morpho (Deposit USDC for higher APY)

### Multi-Protocol Arbitrage
1. Wallet → Uniswap (Swap ETH to USDC)
2. Uniswap → Compound (Lend USDC)
3. Compound → Curve (Swap interest back to ETH)

## Tech Stack

- **React** + **TypeScript**: UI framework
- **Vite**: Build tool
- **@xyflow/react**: Flow diagram library (based on ReactFlow)
- **Tailwind CSS**: Styling
- **Radix UI**: Component primitives

## Project Structure

```
src/
├── components/
│   ├── nodes/          # Protocol node components
│   ├── layout/         # Layout components (Sidebar, TopBar)
│   └── Flow.tsx        # Main flow canvas
├── data/
│   └── protocols.ts    # Protocol definitions
├── types/
│   └── index.ts        # TypeScript types
└── lib/
    └── utils.ts        # Utility functions
```

## Next Steps

- [ ] Add actual protocol ABIs and contract interactions
- [ ] Implement transaction simulation
- [ ] Add EIP-7702 transaction bundling
- [ ] Save/load strategy templates
- [ ] Export strategies as executable transactions
- [ ] Add gas estimation
- [ ] Integrate with wallet providers (WalletConnect, MetaMask)
- [ ] Add APY calculations and optimization suggestions

## Based On

This project is inspired by [rawbit.io](https://github.com/rawBit-io/rawbit) - a Bitcoin transaction visualizer, adapted for DeFi protocol interaction and strategy building.
