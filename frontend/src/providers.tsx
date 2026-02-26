"use client";

import { WagmiProvider, createConfig, http } from "wagmi";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApolloProvider } from "@apollo/client";
import { creditcoinTestnet } from "@/lib/chains";
import { ponderClient } from "@/lib/ponder";
import "@rainbow-me/rainbowkit/styles.css";

const config = getDefaultConfig({
  appName: "CreditLens",
  projectId: "YOUR_WALLETCONNECT_PROJECT_ID", // get free at cloud.walletconnect.com
  chains: [creditcoinTestnet],
  transports: {
    [creditcoinTestnet.id]: http(),
  },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <ApolloProvider client={ponderClient}>{children}</ApolloProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
