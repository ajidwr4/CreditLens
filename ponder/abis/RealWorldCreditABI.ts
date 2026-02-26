export const RealWorldCreditABI = [
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
] as const;
