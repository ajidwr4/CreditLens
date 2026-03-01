import { eq, and } from "drizzle-orm";
import { ponder } from "ponder:registry";
import { bidOrder, askOrder, deal, realWorldRecord, creditScore, scoreHistory } from "ponder:schema";
import { calculateScore } from "./scorer";
import { pushScoreToOracle } from "./pusher";

// ═══════════════════════════════════════
// HELPER — find primary key id by orderId
// ═══════════════════════════════════════

async function findBidId(db: any, orderId: bigint): Promise<string | null> {
  const records = await db.sql
    .select()
    .from(bidOrder)
    .where(eq(bidOrder.orderId, orderId));
  return records.length > 0 ? records[0].id : null;
}

async function findAskId(db: any, orderId: bigint): Promise<string | null> {
  const records = await db.sql
    .select()
    .from(askOrder)
    .where(eq(askOrder.orderId, orderId));
  return records.length > 0 ? records[0].id : null;
}

async function findDealId(db: any, dealId: bigint): Promise<string | null> {
  const records = await db.sql
    .select()
    .from(deal)
    .where(eq(deal.dealId, dealId));
  return records.length > 0 ? records[0].id : null;
}

// ═══════════════════════════════════════
// HELPER — recalculate & upsert score
// ═══════════════════════════════════════

async function updateBorrowerScore(
  borrower: `0x${string}`,
  db: any,
  timestamp: bigint,
) {
  const allDeals = await db.sql
    .select()
    .from(deal)
    .where(eq(deal.borrower, borrower));

  const totalLoans   = allDeals.length;
  const repaidOnTime = allDeals.filter((d: any) => d.status === "Repaid" && d.repaidOnTime === true).length;
  const repaidLate   = allDeals.filter((d: any) => d.status === "Repaid" && d.repaidOnTime === false).length;
  const defaulted    = allDeals.filter((d: any) => d.status === "Defaulted").length;

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

  await db.insert(scoreHistory).values({
    id:             `${borrower}-${timestamp}`,
    address:        borrower,
    totalScore:     score.totalScore,
    onChainScore:   score.onChainScore,
    realWorldScore: score.realWorldScore,
    tier:           score.tier,
    recordedAt:     timestamp,
  });

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
    lender:       event.args.lender,
    amount:       event.args.amount,
    currency:     event.args.currency,
    interestRate: event.args.interestRate,
    duration:     event.args.duration,
    status:       "Open",
    createdAt:    event.block.timestamp,
  });
});

// Borrower posts an ask — amount and currency only
ponder.on("LendingMarket:AskPosted", async ({ event, context }) => {
  await context.db.insert(askOrder).values({
    id:        event.id,
    orderId:   event.args.orderId,
    borrower:  event.args.borrower,
    amount:    event.args.amount,
    currency:  event.args.currency,
    status:    "Open",
    createdAt: event.block.timestamp,
  });
});

// Lender cancels bid — lookup by orderId first, then update by primary key
ponder.on("LendingMarket:BidCancelled", async ({ event, context }) => {
  const id = await findBidId(context.db, event.args.orderId);
  if (!id) {
    console.warn(`BidCancelled: bid_order with orderId ${event.args.orderId} not found`);
    return;
  }
  await context.db
    .update(bidOrder, { id })
    .set({ status: "Cancelled" });
});

// Borrower cancels ask — lookup by orderId first, then update by primary key
ponder.on("LendingMarket:AskCancelled", async ({ event, context }) => {
  const id = await findAskId(context.db, event.args.orderId);
  if (!id) {
    console.warn(`AskCancelled: ask_order with orderId ${event.args.orderId} not found`);
    return;
  }
  await context.db
    .update(askOrder, { id })
    .set({ status: "Cancelled" });
});

// Lender accepts ask — deal formed, terms from bid
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
    interestRate: event.args.interestRate,
    duration:     event.args.duration,
    startTime:    event.block.timestamp,
    deadline:     event.args.deadline,
    repaymentDue: event.args.repaymentDue,
    status:       "Active",
    repaidOnTime: null,
  });
});

// Borrower repays — lookup by dealId first, then update by primary key
ponder.on("LendingMarket:LoanRepaid", async ({ event, context }) => {
  const id = await findDealId(context.db, event.args.dealId);
  if (!id) {
    console.warn(`LoanRepaid: deal with dealId ${event.args.dealId} not found`);
    return;
  }
  await context.db
    .update(deal, { id })
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

// Loan defaulted — lookup by dealId first, then update by primary key
ponder.on("LendingMarket:LoanDefaulted", async ({ event, context }) => {
  const id = await findDealId(context.db, event.args.dealId);
  if (!id) {
    console.warn(`LoanDefaulted: deal with dealId ${event.args.dealId} not found`);
    return;
  }
  await context.db
    .update(deal, { id })
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
  const records = await context.db.sql
    .select()
    .from(realWorldRecord)
    .where(eq(realWorldRecord.recordId, event.args.recordId));

  if (records.length > 0) {
    await context.db
      .update(realWorldRecord, { id: records[0].id })
      .set({ isDeleted: true });
  }

  await updateBorrowerScore(
    event.args.borrower,
    context.db,
    event.block.timestamp,
  );
});
