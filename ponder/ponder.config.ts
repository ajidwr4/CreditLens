import { createConfig } from "ponder";
import { http } from "viem";
import { LendingMarketV3ABI } from "./abis/LendingMarketV3ABI";
import { RealWorldCreditABI } from "./abis/RealWorldCreditABI";

export default createConfig({
  networks: {
    creditcoin: {
      chainId: 102031,
      transport: http(process.env.PONDER_RPC_URL_102031),
    },
  },
  contracts: {
    LendingMarket: {
      network: "creditcoin",
      abi: LendingMarketV3ABI,
      address: "0xDD98f9D3aDC99e07A473bED4E396736d13117128", // v3
      startBlock: 4360000,
    },
    RealWorldCredit: {
      network: "creditcoin",
      abi: RealWorldCreditABI,
      address: "0xB6A2331289F2BeB040eF29bd1932f15Ae4f3771a",
      startBlock: 4200000,
    },
  },
});