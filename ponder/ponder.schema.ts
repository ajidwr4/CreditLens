import { onchainTable, index } from "ponder";

// ═══════════════════════════════════════
// LENDING MARKET TABLES
// ═══════════════════════════════════════

// Posted by LENDER — full terms (amount, rate, duration)
export const bidOrder = onchainTable(
  "bid_order",
  (t) => ({
    id: t.text().primaryKey(),
    orderId: t.bigint().notNull(),
    lender: t.hex().notNull(),          // fixed: was incorrectly named "borrower"
    amount: t.bigint().notNull(),
    currency: t.text().notNull(),
    interestRate: t.bigint().notNull(),
    duration: t.bigint().notNull(),
    status: t.text().notNull(),         // "Open" | "Matched" | "Cancelled"
    createdAt: t.bigint().notNull(),
  }),
  (table) => ({
    lenderIdx: index("bid_lender_index").on(table.lender),
  }),
);

// Posted by BORROWER — amount and currency only, no terms
export const askOrder = onchainTable(
  "ask_order",
  (t) => ({
    id: t.text().primaryKey(),
    orderId: t.bigint().notNull(),
    borrower: t.hex().notNull(),        // fixed: was incorrectly named "lender"
    amount: t.bigint().notNull(),
    currency: t.text().notNull(),
    // interestRate removed — borrower does not set terms in v2
    // duration removed    — borrower does not set terms in v2
    status: t.text().notNull(),         // "Open" | "Matched" | "Cancelled"
    createdAt: t.bigint().notNull(),
  }),
  (table) => ({
    borrowerIdx: index("ask_borrower_index").on(table.borrower),
  }),
);

// Formed when lender calls acceptAsk() — terms inherited from Bid
export const deal = onchainTable(
  "deal",
  (t) => ({
    id: t.text().primaryKey(),
    dealId: t.bigint().notNull(),
    bidId: t.bigint().notNull(),
    askId: t.bigint().notNull(),
    borrower: t.hex().notNull(),
    lender: t.hex().notNull(),
    amount: t.bigint().notNull(),
    currency: t.text().notNull(),
    interestRate: t.bigint().notNull(),
    duration: t.bigint().notNull(),
    startTime: t.bigint().notNull(),
    deadline: t.bigint().notNull(),
    repaymentDue: t.bigint().notNull(), // new in v2 — principal + interest, fixed at match time
    status: t.text().notNull(),         // "Active" | "Repaid" | "Defaulted"
    repaidOnTime: t.boolean(),          // null until repaid/defaulted
  }),
  (table) => ({
    borrowerIdx: index("deal_borrower_index").on(table.borrower),
    lenderIdx: index("deal_lender_index").on(table.lender),
  }),
);

// ═══════════════════════════════════════
// REAL WORLD CREDIT TABLES
// ═══════════════════════════════════════

export const realWorldRecord = onchainTable(
  "real_world_record",
  (t) => ({
    id: t.text().primaryKey(),
    recordId: t.bigint().notNull(),
    borrower: t.hex().notNull(),
    issuerWallet: t.hex().notNull(),
    issuerName: t.text().notNull(),
    amount: t.bigint().notNull(),
    currency: t.text().notNull(),
    category: t.text().notNull(),
    repaidOnTime: t.boolean().notNull(),
    evidenceNote: t.text().notNull(),
    mintedAt: t.bigint().notNull(),
    isDeleted: t.boolean().notNull(),
  }),
  (table) => ({
    borrowerIdx: index("rwr_borrower_index").on(table.borrower),
  }),
);

// ═══════════════════════════════════════
// CREDIT SCORE TABLES
// ═══════════════════════════════════════

export const creditScore = onchainTable("credit_score", (t) => ({
  address: t.hex().primaryKey(),
  totalScore: t.integer().notNull(),
  onChainScore: t.integer().notNull(),
  realWorldScore: t.integer().notNull(),
  tier: t.text().notNull(),             // "AAA" | "AA" | "A" | "B" | "C"
  totalLoans: t.integer().notNull(),
  repaidOnTime: t.integer().notNull(),
  repaidLate: t.integer().notNull(),
  defaulted: t.integer().notNull(),
  totalRealWorldRecords: t.integer().notNull(),
  lastUpdated: t.bigint().notNull(),
}));

export const scoreHistory = onchainTable(
  "score_history",
  (t) => ({
    id: t.text().primaryKey(),
    address: t.hex().notNull(),
    totalScore: t.integer().notNull(),
    onChainScore: t.integer().notNull(),
    realWorldScore: t.integer().notNull(),
    tier: t.text().notNull(),
    recordedAt: t.bigint().notNull(),
  }),
  (table) => ({
    addressIdx: index("score_history_address_index").on(table.address),
  }),
);