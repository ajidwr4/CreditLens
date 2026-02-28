import { eq, and } from "drizzle-orm";
import { ponder } from "ponder:registry";
import { bidOrder, askOrder, deal, realWorldRecord, creditScore, scoreHistory } from "ponder:schema";
import { calculateScore } from "./scorer";
import { pushScoreToOracle } from "./pusher";

// ═══════════════════════════════════════
// HELPER — recalculate & upsert score for a borrower
// ═══════════════════════════════════════

async function updateBorrowerScore(
  borrower: `0x${string}`,
  db: any,
  timestamp: bigint,
) {
  // Fetch all deals for this borrower
  const allDeals = await db.sql
    .select()
    .from(deal)
    .where(eq(deal.borrower, borrower));

  const totalLoans   = allDeals.length;
  const repaidOnTime = allDeals.filter((d: any) => d.status === "Repaid" && d.repaidOnTime === true).length;
  const repaidLate   = allDeals.filter((d: any) => d.status === "Repaid" && d.repaidOnTime === false).length;
  const defaulted    = allDeals.filter((d: any) => d.status === "Defaulted").length;

  // Fetch all active real world records for this borrower
  const rwRecords = await db.sql
    .select()
    .from(realWorldRecord)
    .where(and(
      eq(realWorldRecord.borrower, borrower),
      eq(realWorldRecord.isDeleted, false),
    ));

  const totalRealWorldRecords = rwRecords.length;
  const realWorldOnTime       = rwRecords.filter((r: any) => r.repaidOnTime === true).length;
  const realWorldLate         = rwRecords.filter((r: any) => r.repaidOnTime === false).length;

  const input = {
    totalLoans,
    repaidOnTime,
    repaidLate,
    defaulted,
    totalRealWorldRecords,
    realWorldOnTime,
    realWorldLate,
  };

  const score = calculateScore(input);

  // Upsert credit_score row
  await db
    .insert(creditScore)
    .values({
      address:              borrower,
      totalScore:           score.totalScore,
      onChainScore:         score.onChainScore,
      realWorldScore:       score.realWorldScore,
      tier:                 score.tier,
      totalLoans,
      repaidOnTime,
      repaidLate,
      defaulted,
      totalRealWorldRecords,
      lastUpdated:          timestamp,
    })
    .onConflictDoUpdate({
      totalScore:           score.totalScore,
      onChainScore:         score.onChainScore,
      realWorldScore:       score.realWorldScore,
      tier:                 score.tier,
      totalLoans,
      repaidOnTime,
      repaidLate,
      defaulted,
      totalRealWorldRecords,
      lastUpdated:          timestamp,
    });

  // Append to score_history
  await db.insert(scoreHistory).values({
    id:             `${borrower}-${timestamp}`,
    address:        borrower,
    totalScore:     score.totalScore,
    onChainScore:   score.onChainScore,
    realWorldScore: score.realWorldScore,
    tier:           score.tier,
    recordedAt:     timestamp,
  });

  // Push to CreditScoreOracle on-chain
  await pushScoreToOracle(borrower, score, input);
}


// ═══════════════════════════════════════
// LENDING MARKET HANDLERS
// ═══════════════════════════════════════

// Lender posts a bid with full terms
ponder.on("LendingMarket:BidPosted", async ({ event, context }) => {
  await context.db.insert(bidOrder).values({
    id:           event.id,
    orderId:      event.args.orderId,
    lender:       event.args.lender,       // fix: was "borrower" in old version
    amount:       event.args.amount,
    currency:     event.args.currency,
    interestRate: event.args.interestRate,
    duration:     event.args.duration,
    status:       "Open",
    createdAt:    event.block.timestamp,
  });
});

// Borrower posts an ask — amount and currency only (no terms in v2)
ponder.on("LendingMarket:AskPosted", async ({ event, context }) => {
  await context.db.insert(askOrder).values({
    id:        event.id,
    orderId:   event.args.orderId,
    borrower:  event.args.borrower,        // fix: was "lender" in old version
    amount:    event.args.amount,
    currency:  event.args.currency,
    // interestRate removed — not part of Ask in v2
    // duration removed    — not part of Ask in v2
    status:    "Open",
    createdAt: event.block.timestamp,
  });
});

// Lender cancels their bid
ponder.on("LendingMarket:BidCancelled", async ({ event, context }) => {
  await context.db
    .update(bidOrder, { orderId: event.args.orderId }) // fix: use orderId not event.id
    .set({ status: "Cancelled" });
});

// Borrower cancels their ask
ponder.on("LendingMarket:AskCancelled", async ({ event, context }) => {
  await context.db
    .update(askOrder, { orderId: event.args.orderId }) // fix: use orderId not event.id
    .set({ status: "Cancelled" });
});

// Lender accepts ask — deal formed with terms from bid
ponder.on("LendingMarket:DealMatched", async ({ event, context }) => {
  await context.db.insert(deal).values({
    id:           event.id,
    dealId:       event.args.dealId,
    bidId:        event.args.bidId,
    askId:        event.args.askId,
    borrower:     event.args.borrower,
    lender:       event.args.lender,
    amount:       event.args.amount,
    currency:     event.args.currency,
    interestRate: event.args.interestRate, // fix: now comes from event (inherited from bid)
    duration:     event.args.duration,     // fix: now comes from event (inherited from bid)
    startTime:    event.block.timestamp,
    deadline:     event.args.deadline,
    repaymentDue: event.args.repaymentDue, // new in v2
    status:       "Active",
    repaidOnTime: null,
  });
});

// Borrower repays — update deal status and recalculate score
ponder.on("LendingMarket:LoanRepaid", async ({ event, context }) => {
  await context.db
    .update(deal, { dealId: event.args.dealId }) // fix: use dealId not event.id
    .set({
      status:       "Repaid",
      repaidOnTime: event.args.onTime,
    });

  await updateBorrowerScore(
    event.args.borrower,
    context.db,
    event.block.timestamp,
  );
});

// Loan defaulted — update deal status and recalculate score
ponder.on("LendingMarket:LoanDefaulted", async ({ event, context }) => {
  await context.db
    .update(deal, { dealId: event.args.dealId }) // fix: use dealId not event.id
    .set({ status: "Defaulted" });

  await updateBorrowerScore(
    event.args.borrower,
    context.db,
    event.block.timestamp,
  );
});


// ═══════════════════════════════════════
// REAL WORLD CREDIT HANDLERS
// ═══════════════════════════════════════

ponder.on("RealWorldCredit:RecordMinted", async ({ event, context }) => {
  await context.db.insert(realWorldRecord).values({
    id:           event.id,
    recordId:     event.args.recordId,
    borrower:     event.args.borrower,
    issuerWallet: event.args.issuerWallet,
    issuerName:   event.args.issuerName,
    amount:       event.args.amount,
    currency:     event.args.currency,
    category:     event.args.category,
    repaidOnTime: event.args.repaidOnTime,
    evidenceNote: event.args.evidenceNote,
    mintedAt:     event.args.mintedAt,
    isDeleted:    false,
  });

  await updateBorrowerScore(
    event.args.borrower,
    context.db,
    event.block.timestamp,
  );
});

ponder.on("RealWorldCredit:RecordDeleted", async ({ event, context }) => {
  await context.db
    .update(realWorldRecord, { recordId: event.args.recordId })
    .set({ isDeleted: true });

  await updateBorrowerScore(
    event.args.borrower,
    context.db,
    event.block.timestamp,
  );
});
