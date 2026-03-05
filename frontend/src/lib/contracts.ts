// ─── Contract Addresses ───────────────────────────────────────
export const LENDING_MARKET_ADDRESS =
  "0xDD98f9D3aDC99e07A473bED4E396736d13117128" as `0x${string}`; // v3

export const REAL_WORLD_CREDIT_ADDRESS =
  "0xB6A2331289F2BeB040eF29bd1932f15Ae4f3771a" as `0x${string}`;

export const CREDIT_SCORE_ORACLE_ADDRESS =
  "0xd908cb092578137b1642E84c830437a51428B874" as `0x${string}`;

// ─── LendingMarket v3 ABI ─────────────────────────────────────
export const LENDING_MARKET_ABI = [
  { inputs: [{ internalType: "address", name: "_oracle", type: "address" }], stateMutability: "nonpayable", type: "constructor" },

  // Errors
  { inputs: [], name: "AlreadyExpired",       type: "error" },
  { inputs: [], name: "AmountExceedsLimit",   type: "error" },
  { inputs: [], name: "AmountMismatch",        type: "error" },
  { inputs: [], name: "CannotSelfDeal",        type: "error" },
  { inputs: [], name: "DeadlineNotPassed",     type: "error" },
  { inputs: [], name: "DurationExceedsLimit",  type: "error" },
  { inputs: [], name: "InsufficientRepayment", type: "error" },
  { inputs: [], name: "InvalidAmount",         type: "error" },
  { inputs: [], name: "InvalidDuration",       type: "error" },
  { inputs: [], name: "InvalidExpiry",         type: "error" },
  { inputs: [], name: "InvalidRate",           type: "error" },
  { inputs: [], name: "LoanNotActive",         type: "error" },
  { inputs: [], name: "NotBorrower",           type: "error" },
  { inputs: [], name: "NotExpiredYet",         type: "error" },
  { inputs: [], name: "NotOfferOwner",         type: "error" },
  { inputs: [], name: "NotPublicOfferOwner",   type: "error" },
  { inputs: [], name: "NotRequestOwner",       type: "error" },
  { inputs: [], name: "NothingToWithdraw",     type: "error" },
  { inputs: [], name: "OfferNotOpen",          type: "error" },
  { inputs: [], name: "PublicOfferNotOpen",    type: "error" },
  { inputs: [], name: "RateExceedsLimit",      type: "error" },
  { inputs: [], name: "ReentrantCall",         type: "error" },
  { inputs: [], name: "RequestNotOpen",        type: "error" },
  { inputs: [], name: "ScoreTooLow",           type: "error" },
  { inputs: [], name: "TransferFailed",        type: "error" },
  { inputs: [], name: "WrongFundingAmount",    type: "error" },

  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256", name: "loanId",    type: "uint256" },
      { indexed: true,  internalType: "address", name: "borrower",  type: "address" },
      { indexed: true,  internalType: "address", name: "lender",    type: "address" },
      { indexed: false, internalType: "uint256", name: "principal", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "repayDue",  type: "uint256" },
      { indexed: false, internalType: "uint256", name: "dueTime",   type: "uint256" },
    ],
    name: "LoanCreated", type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "loanId",   type: "uint256" },
      { indexed: true, internalType: "address", name: "borrower", type: "address" },
      { indexed: true, internalType: "address", name: "lender",   type: "address" },
    ],
    name: "LoanDefaulted", type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256", name: "loanId",   type: "uint256" },
      { indexed: true,  internalType: "address", name: "borrower", type: "address" },
      { indexed: false, internalType: "bool",    name: "onTime",   type: "bool"    },
    ],
    name: "LoanRepaid", type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "offerId", type: "uint256" },
      { indexed: true, internalType: "uint256", name: "loanId",  type: "uint256" },
    ],
    name: "OfferAccepted", type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: "uint256", name: "offerId", type: "uint256" }],
    name: "OfferExpired", type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256", name: "offerId",      type: "uint256" },
      { indexed: true,  internalType: "uint256", name: "requestId",    type: "uint256" },
      { indexed: true,  internalType: "address", name: "lender",       type: "address" },
      { indexed: false, internalType: "uint256", name: "amount",       type: "uint256" },
      { indexed: false, internalType: "uint256", name: "aprBps",       type: "uint256" },
      { indexed: false, internalType: "uint256", name: "durationSecs", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "validUntil",   type: "uint256" },
    ],
    name: "OfferFunded", type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: "uint256", name: "offerId", type: "uint256" }],
    name: "OfferInvalidated", type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: "uint256", name: "offerId", type: "uint256" }],
    name: "OfferRejected", type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: "uint256", name: "offerId", type: "uint256" }],
    name: "PublicOfferCancelled", type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: "uint256", name: "offerId", type: "uint256" }],
    name: "PublicOfferExpired", type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256", name: "offerId",        type: "uint256" },
      { indexed: true,  internalType: "address", name: "lender",         type: "address" },
      { indexed: false, internalType: "uint256", name: "amount",         type: "uint256" },
      { indexed: false, internalType: "uint256", name: "aprBps",         type: "uint256" },
      { indexed: false, internalType: "uint256", name: "durationSecs",   type: "uint256" },
      { indexed: false, internalType: "uint256", name: "validUntil",     type: "uint256" },
      { indexed: false, internalType: "uint256", name: "minCreditScore", type: "uint256" },
    ],
    name: "PublicOfferPosted", type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "offerId",  type: "uint256" },
      { indexed: true, internalType: "uint256", name: "loanId",   type: "uint256" },
      { indexed: true, internalType: "address", name: "borrower", type: "address" },
    ],
    name: "PublicOfferTaken", type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "address", name: "lender", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "RefundAccrued", type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "address", name: "lender", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "RefundWithdrawn", type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "requestId", type: "uint256" },
      { indexed: true, internalType: "address", name: "borrower",  type: "address" },
    ],
    name: "RequestCancelled", type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: "uint256", name: "requestId", type: "uint256" }],
    name: "RequestExpired", type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256", name: "requestId",  type: "uint256" },
      { indexed: true,  internalType: "address", name: "borrower",   type: "address" },
      { indexed: false, internalType: "uint256", name: "amount",     type: "uint256" },
      { indexed: false, internalType: "uint256", name: "validUntil", type: "uint256" },
    ],
    name: "RequestPosted", type: "event",
  },

  // Write Functions — Mechanism A
  {
    inputs: [{ internalType: "uint256", name: "offerId", type: "uint256" }],
    name: "acceptOffer",
    outputs: [{ internalType: "uint256", name: "loanId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "requestId", type: "uint256" }],
    name: "cancelRequest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "offerId", type: "uint256" }],
    name: "expireOffer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "requestId", type: "uint256" }],
    name: "expireRequest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "requestId",    type: "uint256" },
      { internalType: "uint256", name: "aprBps",       type: "uint256" },
      { internalType: "uint256", name: "durationSecs", type: "uint256" },
      { internalType: "uint256", name: "validUntil",   type: "uint256" },
    ],
    name: "fundOffer",
    outputs: [{ internalType: "uint256", name: "offerId", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "offerId", type: "uint256" }],
    name: "invalidateOffer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amount",     type: "uint256" },
      { internalType: "uint256", name: "validUntil", type: "uint256" },
    ],
    name: "postRequest",
    outputs: [{ internalType: "uint256", name: "requestId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "offerId", type: "uint256" }],
    name: "rejectOffer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // Write Functions — Mechanism B
  {
    inputs: [{ internalType: "uint256", name: "offerId", type: "uint256" }],
    name: "cancelPublicOffer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "offerId", type: "uint256" }],
    name: "expirePublicOffer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amount",         type: "uint256" },
      { internalType: "uint256", name: "aprBps",         type: "uint256" },
      { internalType: "uint256", name: "durationSecs",   type: "uint256" },
      { internalType: "uint256", name: "validUntil",     type: "uint256" },
      { internalType: "uint256", name: "minCreditScore", type: "uint256" },
    ],
    name: "postPublicOffer",
    outputs: [{ internalType: "uint256", name: "offerId", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "offerId", type: "uint256" }],
    name: "takeOffer",
    outputs: [{ internalType: "uint256", name: "loanId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },

  // Write Functions — Mechanism C
  {
    inputs: [{ internalType: "uint256", name: "loanId", type: "uint256" }],
    name: "markDefault",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "loanId", type: "uint256" }],
    name: "repay",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdrawRefund",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // View Functions
  {
    inputs: [],
    name: "MAX_AMOUNT",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view", type: "function",
  },
  {
    inputs: [],
    name: "MAX_DURATION",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view", type: "function",
  },
  {
    inputs: [],
    name: "MAX_RATE",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view", type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "lender", type: "address" }],
    name: "getPendingRefund",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view", type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "loanId", type: "uint256" }],
    name: "getRepayDue",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view", type: "function",
  },
  {
    inputs: [], name: "totalLoans",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view", type: "function",
  },
  {
    inputs: [], name: "totalOffers",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view", type: "function",
  },
  {
    inputs: [], name: "totalPublicOffers",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view", type: "function",
  },
  {
    inputs: [], name: "totalRequests",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view", type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "pendingRefunds",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view", type: "function",
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
    name: "RecordDeleted", type: "event",
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
    name: "RecordMinted", type: "event",
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