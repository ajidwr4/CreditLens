import { createConfig } from "ponder";
import { http } from "viem";
import { LendingMarketABI } from "./abis/LendingMarketABI";
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
      abi: LendingMarketABI,
      address: "0xFcAc960E5E0EB9598173229856715601f68309Fb",
      startBlock: 4329000,
    },
    RealWorldCredit: {
      chain: "creditcoin",
      abi: RealWorldCreditABI,
      address: "0xB6A2331289F2BeB040eF29bd1932f15Ae4f3771a",
      startBlock: 4329014,
    },
  },
});
