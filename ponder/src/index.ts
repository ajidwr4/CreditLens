import { ponder } from "ponder:registry";
import { bidOrder, askOrder, deal, realWorldRecord, creditScore, scoreHistory } from "ponder:schema";
import { calculateScore } from "./scorer";
import { pushScoreToOracle } from "./pusher";

// ═══════════════════════════════════════
// HELPER — get or build score input for a borrower
// ═══════════════════════════════════════

async function updateBorrowerScore(
  borrower: `0x${string}`,
  db: any,
  timestamp: bigint,
) {
  // fetch all deals for this borrower
  const allDeals = await db.sql
    .select()
    .from(deal)
    .where(({ eq }: any) => eq(deal.borrower, borrower));

  const totalLoans  = allDeals.length;
  const repaidOnTime = allDeals.filter((d: any) => d.status === "Repaid" && d.repaidOnTime === true).length;
  const repaidLate   = allDeals.filter((d: any) => d.status === "Repaid" && d.repaidOnTime === false).length;
  const defaulted    = allDeals.filter((d: any) => d.status === "Defaulted").length;

  // fetch all real world records for this borrower
  const rwRecords = await db.sql
    .select()
    .from(realWorldRecord)
    .where(({ eq, and }: any) => and(
      eq(realWorldRecord.borrower, borrower),
      eq(realWorldRecord.isDeleted, false),
    ));

  const totalRealWorldRecords = rwRecords.length;
  const realWorldOnTime = rwRecords.filter((r: any) => r.repaidOnTime === true).length;
  const realWorldLate   = rwRecords.filter((r: any) => r.repaidOnTime === false).length;

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

  // upsert credit score
  await db
    .insert(creditScore)
    .values({
      address:               borrower,
      totalScore:            score.totalScore,
      onChainScore:          score.onChainScore,
      realWorldScore:        score.realWorldScore,
      tier:                  score.tier,
      totalLoans,
      repaidOnTime,
      repaidLate,
      defaulted,
      totalRealWorldRecords,
      lastUpdated:           timestamp,
    })
    .onConflictDoUpdate({
      totalScore:            score.totalScore,
      onChainScore:          score.onChainScore,
      realWorldScore:        score.realWorldScore,
      tier:                  score.tier,
      totalLoans,
      repaidOnTime,
      repaidLate,
      defaulted,
      totalRealWorldRecords,
      lastUpdated:           timestamp,
    });

  // append score history
  await db.insert(scoreHistory).values({
    id:             `${borrower}-${timestamp}`,
    address:        borrower,
    totalScore:     score.totalScore,
    onChainScore:   score.onChainScore,
    realWorldScore: score.realWorldScore,
    tier:           score.tier,
    recordedAt:     timestamp,
  });

  // push to CreditScoreOracle on-chain
  await pushScoreToOracle(borrower, score, input);
}


// ═══════════════════════════════════════
// LENDING MARKET HANDLERS
// ═══════════════════════════════════════

ponder.on("LendingMarket:BidPosted", async ({ event, context }) => {
  await context.db.insert(bidOrder).values({
    id:           event.id,
    orderId:      event.args.orderId,
    borrower:     event.args.borrower,
    amount:       event.args.amount,
    currency:     event.args.currency,
    interestRate: event.args.interestRate,
    duration:     event.args.duration,
    status:       "Open",
    createdAt:    event.block.timestamp,
  });
});

ponder.on("LendingMarket:AskPosted", async ({ event, context }) => {
  await context.db.insert(askOrder).values({
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

ponder.on("LendingMarket:BidCancelled", async ({ event, context }) => {
  await context.db
    .update(bidOrder, { id: event.id })
    .set({ status: "Cancelled" });
});

ponder.on("LendingMarket:AskCancelled", async ({ event, context }) => {
  await context.db
    .update(askOrder, { id: event.id })
    .set({ status: "Cancelled" });
});

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
    interestRate: 0n,
    duration:     0n,
    startTime:    event.block.timestamp,
    deadline:     event.args.deadline,
    status:       "Active",
    repaidOnTime: null,
  });
});

ponder.on("LendingMarket:LoanRepaid", async ({ event, context }) => {
  await context.db
    .update(deal, { id: event.id })
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

ponder.on("LendingMarket:LoanDefaulted", async ({ event, context }) => {
  await context.db
    .update(deal, { id: event.id })
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
    .update(realWorldRecord, { id: event.id })
    .set({ isDeleted: true });

  await updateBorrowerScore(
    event.args.borrower,
    context.db,
    event.block.timestamp,
  );
});
