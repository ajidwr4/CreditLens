import { onchainTable } from "ponder";

// ─── Mechanism A ─────────────────────────────────────────────

export const request = onchainTable("request", (t) => ({
  id:         t.text().primaryKey(),
  requestId:  t.bigint().notNull(),
  borrower:   t.hex().notNull(),
  amount:     t.bigint().notNull(),
  validUntil: t.bigint().notNull(),
  status:     t.text().notNull(), // Open | Matched | Cancelled | Expired
  createdAt:  t.bigint().notNull(),
}));

export const offer = onchainTable("offer", (t) => ({
  id:          t.text().primaryKey(),
  offerId:     t.bigint().notNull(),
  requestId:   t.bigint().notNull(),
  lender:      t.hex().notNull(),
  amount:      t.bigint().notNull(),
  aprBps:      t.bigint().notNull(),
  durationSecs:t.bigint().notNull(),
  validUntil:  t.bigint().notNull(),
  status:      t.text().notNull(), // Open | Accepted | Rejected | Invalidated | Expired
  createdAt:   t.bigint().notNull(),
}));

// ─── Mechanism B ─────────────────────────────────────────────

export const publicOffer = onchainTable("public_offer", (t) => ({
  id:             t.text().primaryKey(),
  offerId:        t.bigint().notNull(),
  lender:         t.hex().notNull(),
  amount:         t.bigint().notNull(),
  aprBps:         t.bigint().notNull(),
  durationSecs:   t.bigint().notNull(),
  validUntil:     t.bigint().notNull(),
  minCreditScore: t.bigint().notNull(),
  status:         t.text().notNull(), // Open | Taken | Cancelled | Expired
  createdAt:      t.bigint().notNull(),
}));

// ─── Mechanism C ─────────────────────────────────────────────

export const loan = onchainTable("loan", (t) => ({
  id:          t.text().primaryKey(),
  loanId:      t.bigint().notNull(),
  borrower:    t.hex().notNull(),
  lender:      t.hex().notNull(),
  principal:   t.bigint().notNull(),
  repayDue:    t.bigint().notNull(),
  dueTime:     t.bigint().notNull(),
  status:      t.text().notNull(), // Active | Repaid | Defaulted
  repaidOnTime:t.boolean(),
  createdAt:   t.bigint().notNull(),
}));

// ─── Real World Credit ────────────────────────────────────────

export const realWorldRecord = onchainTable("real_world_record", (t) => ({
  id:           t.text().primaryKey(),
  recordId:     t.bigint().notNull(),
  borrower:     t.hex().notNull(),
  issuerWallet: t.hex().notNull(),
  issuerName:   t.text().notNull(),
  amount:       t.bigint().notNull(),
  currency:     t.text().notNull(),
  category:     t.text().notNull(),
  repaidOnTime: t.boolean().notNull(),
  evidenceNote: t.text().notNull(),
  mintedAt:     t.bigint().notNull(),
  isDeleted:    t.boolean().notNull(),
}));

// ─── Credit Score ─────────────────────────────────────────────

export const creditScore = onchainTable("credit_score", (t) => ({
  address:              t.hex().primaryKey(),
  totalScore:           t.integer().notNull(),
  onChainScore:         t.integer().notNull(),
  realWorldScore:       t.integer().notNull(),
  tier:                 t.text().notNull(),
  totalLoans:           t.integer().notNull(),
  repaidOnTime:         t.integer().notNull(),
  repaidLate:           t.integer().notNull(),
  defaulted:            t.integer().notNull(),
  totalRealWorldRecords:t.integer().notNull(),
  lastUpdated:          t.bigint().notNull(),
}));

export const scoreHistory = onchainTable("score_history", (t) => ({
  id:             t.text().primaryKey(),
  address:        t.hex().notNull(),
  totalScore:     t.integer().notNull(),
  onChainScore:   t.integer().notNull(),
  realWorldScore: t.integer().notNull(),
  tier:           t.text().notNull(),
  recordedAt:     t.bigint().notNull(),
}));