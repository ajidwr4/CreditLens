import { onchainTable, index } from "ponder";

// ═══════════════════════════════════════
// LENDING MARKET TABLES
// ═══════════════════════════════════════

export const bidOrder = onchainTable(
  "bid_order",
  (t) => ({
    id: t.text().primaryKey(),
    orderId: t.bigint().notNull(),
    borrower: t.hex().notNull(),
    amount: t.bigint().notNull(),
    currency: t.text().notNull(),
    interestRate: t.bigint().notNull(),
    duration: t.bigint().notNull(),
    status: t.text().notNull(), // "Open" | "Matched" | "Cancelled"
    createdAt: t.bigint().notNull(),
  }),
  (table) => ({
    borrowerIdx: index("bid_borrower_index").on(table.borrower),
  }),
);

export const askOrder = onchainTable(
  "ask_order",
  (t) => ({
    id: t.text().primaryKey(),
    orderId: t.bigint().notNull(),
    lender: t.hex().notNull(),
    amount: t.bigint().notNull(),
    currency: t.text().notNull(),
    interestRate: t.bigint().notNull(),
    duration: t.bigint().notNull(),
    status: t.text().notNull(), // "Open" | "Matched" | "Cancelled"
    createdAt: t.bigint().notNull(),
  }),
  (table) => ({
    lenderIdx: index("ask_lender_index").on(table.lender),
  }),
);

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
    status: t.text().notNull(), // "Active" | "Repaid" | "Defaulted"
    repaidOnTime: t.boolean(), // null until repaid
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
  tier: t.text().notNull(), // "AAA" | "AA" | "A" | "B" | "C"
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
