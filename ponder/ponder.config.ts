import { createConfig } from "ponder";
import { http } from "viem";
import { LendingMarketV3ABI } from "./abis/LendingMarketV3ABI";
import { RealWorldCreditABI } from "./abis/RealWorldCreditABI";

export default createConfig({
  chains: {
    creditcoin: {
      id: 102031,
      rpc: http(process.env.PONDER_RPC_URL ?? "https://rpc.cc3-testnet.creditcoin.network"),
    },
  },
  contracts: {
    LendingMarket: {
      chain: "creditcoin",
      abi: LendingMarketV3ABI,
      address: "0xDD98f9D3aDC99e07A473bED4E396736d13117128", // v3
      startBlock: 4360000,
    },
    RealWorldCredit: {
      chain: "creditcoin",
      abi: RealWorldCreditABI,
      address: "0xB6A2331289F2BeB040eF29bd1932f15Ae4f3771a",
      startBlock: 4329014,
    },
  },
});
