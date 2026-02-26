export const LENDING_MARKET_ADDRESS = "0xFcAc...09Fb" as `0x${string}`;
export const REAL_WORLD_CREDIT_ADDRESS = "0xB6A2...71a" as `0x${string}`;
export const CREDIT_SCORE_ORACLE_ADDRESS = "0xd908...B874" as `0x${string}`;

// Paste ABI dari ponder/abis/LendingMarketABI.ts
export const LENDING_MARKET_ABI = [] as const; // TODO: paste ABI

export const CREDIT_SCORE_ORACLE_ABI = [
  {
    inputs: [{ name: "borrower", type: "address" }],
    name: "getScore",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
