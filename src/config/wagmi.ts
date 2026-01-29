import { http, createConfig } from "wagmi";
import { mainnet, arbitrum } from "wagmi/chains";
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors";

const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID || "";
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "";

// Export chains for use in other components
export const chains = [mainnet, arbitrum] as const;

// Build connectors array
const connectors = [
  injected(),
  coinbaseWallet({ appName: "ETH Kratong" }),
];

// Only add WalletConnect if project ID is available
if (walletConnectProjectId) {
  connectors.push(
    walletConnect({
      projectId: walletConnectProjectId,
    }) as (typeof connectors)[number]
  );
}

export const config = createConfig({
  chains: [mainnet, arbitrum],
  connectors,
  transports: {
    [mainnet.id]: http(`https://ethereum.rpc.thirdweb.com/${clientId}`),
    [arbitrum.id]: http(`https://arbitrum.rpc.thirdweb.com/${clientId}`),
  },
});
