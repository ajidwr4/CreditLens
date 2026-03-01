export const LENDING_MARKET_ADDRESS =
  "0x7c686DBA61c5F5C7C30ae53b6E9D9965b96BB542" as `0x${string}`; // v2

export const REAL_WORLD_CREDIT_ADDRESS =
  "0xB6A2331289F2BeB040eF29bd1932f15Ae4f3771a" as `0x${string}`;

export const CREDIT_SCORE_ORACLE_ADDRESS =
  "0xd908cb092578137b1642E84c830437a51428B874" as `0x${string}`;

// ─── LendingMarket v2 ABI ────────────────────────────────────
export const LENDING_MARKET_ABI = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },

  // Custom Errors
  { inputs: [], name: "AmountExceedsLimit",    type: "error" },
  { inputs: [], name: "AmountMismatch",         type: "error" },
  { inputs: [], name: "AskNotOpen",             type: "error" },
  { inputs: [], name: "BidNotOpen",             type: "error" },
  { inputs: [], name: "CannotLendToYourself",   type: "error" },
  { inputs: [], name: "CurrencyMismatch",       type: "error" },
  { inputs: [], name: "DeadlineNotPassed",      type: "error" },
  { inputs: [], name: "DealNotActive",          type: "error" },
  { inputs: [], name: "DurationExceedsLimit",   type: "error" },
  { inputs: [], name: "InsufficientRepayment",  type: "error" },
  { inputs: [], name: "InvalidAmount",          type: "error" },
  { inputs: [], name: "InvalidDuration",        type: "error" },
  { inputs: [], name: "InvalidInterestRate",    type: "error" },
  { inputs: [], name: "NotBorrower",            type: "error" },
  { inputs: [], name: "NotYourOrder",           type: "error" },
  { inputs: [], name: "OrderNotOpen",           type: "error" },
  { inputs: [], name: "RateExceedsLimit",       type: "error" },
  { inputs: [], name: "ReentrantCall",          type: "error" },
  { inputs: [], name: "TransferFailed",         type: "error" },
  { inputs: [], name: "WrongFundingAmount",     type: "error" },

  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256", name: "orderId",  type: "uint256" },
      { indexed: true,  internalType: "address", name: "borrower", type: "address" },
    ],
    name: "AskCancelled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256", name: "orderId",  type: "uint256" },
      { indexed: true,  internalType: "address", name: "borrower", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount",   type: "uint256" },
      { indexed: false, internalType: "string",  name: "currency", type: "string"  },
    ],
    name: "AskPosted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256", name: "orderId", type: "uint256" },
      { indexed: true,  internalType: "address", name: "lender",  type: "address" },
    ],
    name: "BidCancelled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256", name: "orderId",      type: "uint256" },
      { indexed: true,  internalType: "address", name: "lender",       type: "address" },
      { indexed: false, internalType: "uint256", name: "amount",       type: "uint256" },
      { indexed: false, internalType: "string",  name: "currency",     type: "string"  },
      { indexed: false, internalType: "uint256", name: "interestRate", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "duration",     type: "uint256" },
    ],
    name: "BidPosted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256", name: "dealId",       type: "uint256" },
      { indexed: true,  internalType: "uint256", name: "bidId",        type: "uint256" },
      { indexed: true,  internalType: "uint256", name: "askId",        type: "uint256" },
      { indexed: false, internalType: "address", name: "borrower",     type: "address" },
      { indexed: false, internalType: "address", name: "lender",       type: "address" },
      { indexed: false, internalType: "uint256", name: "amount",       type: "uint256" },
      { indexed: false, internalType: "string",  name: "currency",     type: "string"  },
      { indexed: false, internalType: "uint256", name: "interestRate", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "duration",     type: "uint256" },
      { indexed: false, internalType: "uint256", name: "deadline",     type: "uint256" },
      { indexed: false, internalType: "uint256", name: "repaymentDue", type: "uint256" },
    ],
    name: "DealMatched",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "dealId",   type: "uint256" },
      { indexed: true, internalType: "address", name: "borrower", type: "address" },
      { indexed: true, internalType: "address", name: "lender",   type: "address" },
    ],
    name: "LoanDefaulted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256", name: "dealId",   type: "uint256" },
      { indexed: true,  internalType: "address", name: "borrower", type: "address" },
      { indexed: true,  internalType: "address", name: "lender",   type: "address" },
      { indexed: false, internalType: "bool",    name: "onTime",   type: "bool"    },
    ],
    name: "LoanRepaid",
    type: "event",
  },

  // Write Functions
  {
    inputs: [
      { internalType: "uint256", name: "bidId", type: "uint256" },
      { internalType: "uint256", name: "askId", type: "uint256" },
    ],
    name: "acceptAsk",
    outputs: [{ internalType: "uint256", name: "dealId", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "askId", type: "uint256" }],
    name: "cancelAsk",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "bidId", type: "uint256" }],
    name: "cancelBid",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "dealId", type: "uint256" }],
    name: "markDefault",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amount",   type: "uint256" },
      { internalType: "string",  name: "currency", type: "string"  },
    ],
    name: "postAsk",
    outputs: [{ internalType: "uint256", name: "askId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amount",       type: "uint256" },
      { internalType: "string",  name: "currency",     type: "string"  },
      { internalType: "uint256", name: "interestRate", type: "uint256" },
      { internalType: "uint256", name: "duration",     type: "uint256" },
    ],
    name: "postBid",
    outputs: [{ internalType: "uint256", name: "bidId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "dealId", type: "uint256" }],
    name: "repayLoan",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },

  // View Functions
  {
    inputs: [],
    name: "MAX_AMOUNT",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MAX_DURATION",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MAX_RATE",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "asks",
    outputs: [
      { internalType: "uint256", name: "id",        type: "uint256" },
      { internalType: "address", name: "borrower",  type: "address" },
      { internalType: "uint256", name: "amount",    type: "uint256" },
      { internalType: "string",  name: "currency",  type: "string"  },
      { internalType: "uint8",   name: "status",    type: "uint8"   },
      { internalType: "uint256", name: "createdAt", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "bids",
    outputs: [
      { internalType: "uint256", name: "id",           type: "uint256" },
      { internalType: "address", name: "lender",       type: "address" },
      { internalType: "uint256", name: "amount",       type: "uint256" },
      { internalType: "string",  name: "currency",     type: "string"  },
      { internalType: "uint256", name: "interestRate", type: "uint256" },
      { internalType: "uint256", name: "duration",     type: "uint256" },
      { internalType: "uint8",   name: "status",       type: "uint8"   },
      { internalType: "uint256", name: "createdAt",    type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "deals",
    outputs: [
      { internalType: "uint256", name: "id",           type: "uint256" },
      { internalType: "uint256", name: "bidId",        type: "uint256" },
      { internalType: "uint256", name: "askId",        type: "uint256" },
      { internalType: "address", name: "borrower",     type: "address" },
      { internalType: "address", name: "lender",       type: "address" },
      { internalType: "uint256", name: "amount",       type: "uint256" },
      { internalType: "string",  name: "currency",     type: "string"  },
      { internalType: "uint256", name: "interestRate", type: "uint256" },
      { internalType: "uint256", name: "duration",     type: "uint256" },
      { internalType: "uint256", name: "deadline",     type: "uint256" },
      { internalType: "uint256", name: "repaymentDue", type: "uint256" },
      { internalType: "bool",    name: "repaidOnTime", type: "bool"    },
      { internalType: "bool",    name: "isActive",     type: "bool"    },
      { internalType: "uint256", name: "createdAt",    type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "dealId", type: "uint256" }],
    name: "getRepaymentDue",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalAsks",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalBids",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalDeals",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  { stateMutability: "payable", type: "receive" },
] as const;

// ─── RealWorldCredit ABI ─────────────────────────────────────
export const REAL_WORLD_CREDIT_ABI = [
  { inputs: [], name: "InvalidAmount",     type: "error" },
  { inputs: [], name: "InvalidCategory",   type: "error" },
  { inputs: [], name: "InvalidCurrency",   type: "error" },
  { inputs: [], name: "InvalidIssuerName", type: "error" },
  { inputs: [], name: "NotRecordOwner",    type: "error" },
  { inputs: [], name: "RecordNotFound",    type: "error" },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "recordId", type: "uint256" },
      { indexed: true, internalType: "address", name: "borrower", type: "address" },
    ],
    name: "RecordDeleted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256", name: "recordId",     type: "uint256" },
      { indexed: true,  internalType: "address", name: "borrower",     type: "address" },
      { indexed: true,  internalType: "address", name: "issuerWallet", type: "address" },
      { indexed: false, internalType: "string",  name: "issuerName",   type: "string"  },
      { indexed: false, internalType: "uint256", name: "amount",       type: "uint256" },
      { indexed: false, internalType: "string",  name: "currency",     type: "string"  },
      { indexed: false, internalType: "string",  name: "category",     type: "string"  },
      { indexed: false, internalType: "bool",    name: "repaidOnTime", type: "bool"    },
      { indexed: false, internalType: "string",  name: "evidenceNote", type: "string"  },
      { indexed: false, internalType: "uint256", name: "mintedAt",     type: "uint256" },
    ],
    name: "RecordMinted",
    type: "event",
  },
  {
    inputs: [
      { internalType: "address", name: "borrower",     type: "address" },
      { internalType: "string",  name: "issuerName",   type: "string"  },
      { internalType: "uint256", name: "amount",       type: "uint256" },
      { internalType: "string",  name: "currency",     type: "string"  },
      { internalType: "string",  name: "category",     type: "string"  },
      { internalType: "bool",    name: "repaidOnTime", type: "bool"    },
      { internalType: "string",  name: "evidenceNote", type: "string"  },
    ],
    name: "mintRecord",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// ─── CreditScoreOracle ABI ───────────────────────────────────
export const CREDIT_SCORE_ORACLE_ABI = [
  {
    inputs: [{ internalType: "address", name: "borrower", type: "address" }],
    name: "getScore",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
