import { createThirdwebClient } from "thirdweb";
import { defineChain } from "thirdweb/chains";
import { darkTheme } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";

// Client ID from environment variable
const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID || "";
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "";

// Create Thirdweb client
export const client = createThirdwebClient({
  clientId,
});

// Configure supported wallets
export const wallets = [
  inAppWallet({
    auth: {
      options: [
        "google",
        "discord",
        "telegram",
        "farcaster",
        "email",
        "x",
        "passkey",
        "phone",
        "github",
        "coinbase",
        "facebook",
        "apple",
        "guest",
      ],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet", {
    walletConnect: {
      projectId: walletConnectProjectId,
    },
  }),
  createWallet("io.rabby"),
  createWallet("com.tangem"),
  createWallet("com.exodus"),
  createWallet("com.ledger"),
  createWallet("com.trustwallet.app"),
  createWallet("io.zerion.wallet"),
];

// Configure theme
export const thirdwebTheme = darkTheme({
  colors: {
    modalBg: "hsl(228, 12%, 8%)",
    secondaryButtonHoverBg: "hsl(186, 49%, 36%)",
    primaryButtonBg: "hsl(180, 74%, 39%)",
  },
});

// Define Ethereum with custom RPC
const ethereum = defineChain({
  id: 1,
  name: "Ethereum",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpc: `https://ethereum.rpc.thirdweb.com/${clientId}`,
});

// Define Arbitrum with custom RPC
const arbitrum = defineChain({
  id: 42161,
  name: "Arbitrum One",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpc: `https://arbitrum.rpc.thirdweb.com/${clientId}`,
});

// Export chains
export const chains = [ethereum, arbitrum];

// Helper function to get chain by ID
export const getChainById = (chainId: number) => {
  switch (chainId) {
    case 1:
      return ethereum;
    case 42161:
      return arbitrum;
    default:
      return ethereum;
  }
};
