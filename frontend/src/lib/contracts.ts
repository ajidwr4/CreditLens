export const LENDING_MARKET_ADDRESS =
  "0xFcAc960E5E0EB9598173229856715601f68309Fb" as `0x${string}`;
export const REAL_WORLD_CREDIT_ADDRESS =
  "0xB6A2331289F2BeB040eF29bd1932f15Ae4f3771a" as `0x${string}`;
export const CREDIT_SCORE_ORACLE_ADDRESS =
  "0xd908cb092578137b1642E84c830437a51428B874" as `0x${string}`;

export const LENDING_MARKET_ABI = [
  { inputs: [], name: "AmountMismatch", type: "error" },
  { inputs: [], name: "AskNotOpen", type: "error" },
  { inputs: [], name: "BidNotOpen", type: "error" },
  { inputs: [], name: "CannotBorrowFromYourself", type: "error" },
  { inputs: [], name: "CurrencyMismatch", type: "error" },
  { inputs: [], name: "DeadlineNotPassed", type: "error" },
  { inputs: [], name: "DealNotActive", type: "error" },
  { inputs: [], name: "DurationMismatch", type: "error" },
  { inputs: [], name: "InterestRateMismatch", type: "error" },
  { inputs: [], name: "InvalidAmount", type: "error" },
  { inputs: [], name: "InvalidDuration", type: "error" },
  { inputs: [], name: "InvalidInterestRate", type: "error" },
  { inputs: [], name: "NotBorrower", type: "error" },
  { inputs: [], name: "NotYourOrder", type: "error" },
  { inputs: [], name: "OrderNotOpen", type: "error" },
  { inputs: [], name: "Unauthorized", type: "error" },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "orderId", type: "uint256" },
      { indexed: true, internalType: "address", name: "lender", type: "address" },
    ],
    name: "AskCancelled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "orderId", type: "uint256" },
      { indexed: true, internalType: "address", name: "lender", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: false, internalType: "string", name: "currency", type: "string" },
      { indexed: false, internalType: "uint256", name: "interestRate", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "duration", type: "uint256" },
    ],
    name: "AskPosted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "orderId", type: "uint256" },
      { indexed: true, internalType: "address", name: "borrower", type: "address" },
    ],
    name: "BidCancelled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "orderId", type: "uint256" },
      { indexed: true, internalType: "address", name: "borrower", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: false, internalType: "string", name: "currency", type: "string" },
      { indexed: false, internalType: "uint256", name: "interestRate", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "duration", type: "uint256" },
    ],
    name: "BidPosted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "dealId", type: "uint256" },
      { indexed: true, internalType: "uint256", name: "bidId", type: "uint256" },
      { indexed: true, internalType: "uint256", name: "askId", type: "uint256" },
      { indexed: false, internalType: "address", name: "borrower", type: "address" },
      { indexed: false, internalType: "address", name: "lender", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: false, internalType: "string", name: "currency", type: "string" },
      { indexed: false, internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "DealMatched",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "dealId", type: "uint256" },
      { indexed: true, internalType: "address", name: "borrower", type: "address" },
      { indexed: true, internalType: "address", name: "lender", type: "address" },
    ],
    name: "LoanDefaulted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "dealId", type: "uint256" },
      { indexed: true, internalType: "address", name: "borrower", type: "address" },
      { indexed: true, internalType: "address", name: "lender", type: "address" },
      { indexed: false, internalType: "bool", name: "onTime", type: "bool" },
    ],
    name: "LoanRepaid",
    type: "event",
  },
  {
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "currency", type: "string" },
      { name: "interestRate", type: "uint256" },
      { name: "duration", type: "uint256" },
    ],
    name: "postAsk",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "currency", type: "string" },
      { name: "interestRate", type: "uint256" },
      { name: "duration", type: "uint256" },
    ],
    name: "postBid",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    name: "acceptAsk",
    type: "function",
    inputs: [
      { name: "bidId", type: "uint256" },
      { name: "askId", type: "uint256" }
    ],
    outputs: [],
    stateMutability: "payable"
  },
] as const;

export const REAL_WORLD_CREDIT_ABI = [
  { inputs: [], name: "InvalidAmount", type: "error" },
  { inputs: [], name: "InvalidCategory", type: "error" },
  { inputs: [], name: "InvalidCurrency", type: "error" },
  { inputs: [], name: "InvalidIssuerName", type: "error" },
  { inputs: [], name: "NotRecordOwner", type: "error" },
  { inputs: [], name: "RecordNotFound", type: "error" },
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
      { indexed: true, internalType: "uint256", name: "recordId", type: "uint256" },
      { indexed: true, internalType: "address", name: "borrower", type: "address" },
      { indexed: true, internalType: "address", name: "issuerWallet", type: "address" },
      { indexed: false, internalType: "string", name: "issuerName", type: "string" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: false, internalType: "string", name: "currency", type: "string" },
      { indexed: false, internalType: "string", name: "category", type: "string" },
      { indexed: false, internalType: "bool", name: "repaidOnTime", type: "bool" },
      { indexed: false, internalType: "string", name: "evidenceNote", type: "string" },
      { indexed: false, internalType: "uint256", name: "mintedAt", type: "uint256" },
    ],
    name: "RecordMinted",
    type: "event",
  },
  {
    inputs: [
      { name: "borrower", type: "address" },
      { name: "issuerName", type: "string" },
      { name: "amount", type: "uint256" },
      { name: "currency", type: "string" },
      { name: "category", type: "string" },
      { name: "repaidOnTime", type: "bool" },
      { name: "evidenceNote", type: "string" },
    ],
    name: "mintRecord",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const CREDIT_SCORE_ORACLE_ABI = [
  {
    inputs: [{ name: "borrower", type: "address" }],
    name: "getScore",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
