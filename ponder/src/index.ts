import { eq, and } from "drizzle-orm";
import { ponder } from "ponder:registry";
import {
  request, offer, publicOffer, loan,
  realWorldRecord, creditScore, scoreHistory,
} from "ponder:schema";
import { calculateScore } from "./scorer";
import { pushScoreToOracle } from "./pusher";

// ═══════════════════════════════════════
// HELPER — find primary key by domain id
// ═══════════════════════════════════════

async function findRequestPk(db: any, requestId: bigint): Promise<string | null> {
  const rows = await db.sql.select().from(request).where(eq(request.requestId, requestId));
  return rows[0]?.id ?? null;
}

async function findOfferPk(db: any, offerId: bigint): Promise<string | null> {
  const rows = await db.sql.select().from(offer).where(eq(offer.offerId, offerId));
  return rows[0]?.id ?? null;
}

async function findPublicOfferPk(db: any, offerId: bigint): Promise<string | null> {
  const rows = await db.sql.select().from(publicOffer).where(eq(publicOffer.offerId, offerId));
  return rows[0]?.id ?? null;
}

async function findLoanPk(db: any, loanId: bigint): Promise<string | null> {
  const rows = await db.sql.select().from(loan).where(eq(loan.loanId, loanId));
  return rows[0]?.id ?? null;
}

// ═══════════════════════════════════════
// HELPER — recalculate & upsert score
// ═══════════════════════════════════════

async function updateBorrowerScore(
  borrower: `0x${string}`,
  db: any,
  timestamp: bigint,
) {
  const allLoans = await db.sql.select().from(loan).where(eq(loan.borrower, borrower));

  const totalLoans    = allLoans.length;
  const repaidOnTime  = allLoans.filter((l: any) => l.status === "Repaid" && l.repaidOnTime === true).length;
  const repaidLate    = allLoans.filter((l: any) => l.status === "Repaid" && l.repaidOnTime === false).length;
  const defaulted     = allLoans.filter((l: any) => l.status === "Defaulted").length;

  const rwRecords = await db.sql
    .select()
    .from(realWorldRecord)
    .where(and(eq(realWorldRecord.borrower, borrower), eq(realWorldRecord.isDeleted, false)));

  const totalRealWorldRecords = rwRecords.length;
  const realWorldOnTime       = rwRecords.filter((r: any) => r.repaidOnTime === true).length;
  const realWorldLate         = rwRecords.filter((r: any) => r.repaidOnTime === false).length;

  const score = calculateScore({
    totalLoans, repaidOnTime, repaidLate, defaulted,
    totalRealWorldRecords, realWorldOnTime, realWorldLate,
  });

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

  await pushScoreToOracle(borrower, score, {
    totalLoans, repaidOnTime, repaidLate, defaulted,
    totalRealWorldRecords, realWorldOnTime, realWorldLate,
  });
}

// ═══════════════════════════════════════
// MECHANISM A — REQUEST / OFFER
// ═══════════════════════════════════════

ponder.on("LendingMarket:RequestPosted", async ({ event, context }) => {
  await context.db.insert(request).values({
    id:         event.id,
    requestId:  event.args.requestId,
    borrower:   event.args.borrower,
    amount:     event.args.amount,
    validUntil: event.args.validUntil,
    status:     "Open",
    createdAt:  event.block.timestamp,
  });
});

ponder.on("LendingMarket:RequestCancelled", async ({ event, context }) => {
  const id = await findRequestPk(context.db, event.args.requestId);
  if (!id) { console.warn(`RequestCancelled: requestId ${event.args.requestId} not found`); return; }
  await context.db.update(request, { id }).set({ status: "Cancelled" });
});

ponder.on("LendingMarket:RequestExpired", async ({ event, context }) => {
  const id = await findRequestPk(context.db, event.args.requestId);
  if (!id) { console.warn(`RequestExpired: requestId ${event.args.requestId} not found`); return; }
  await context.db.update(request, { id }).set({ status: "Expired" });
});

ponder.on("LendingMarket:OfferFunded", async ({ event, context }) => {
  await context.db.insert(offer).values({
    id:          event.id,
    offerId:     event.args.offerId,
    requestId:   event.args.requestId,
    lender:      event.args.lender,
    amount:      event.args.amount,
    aprBps:      event.args.aprBps,
    durationSecs:event.args.durationSecs,
    validUntil:  event.args.validUntil,
    status:      "Open",
    createdAt:   event.block.timestamp,
  });
});

ponder.on("LendingMarket:OfferAccepted", async ({ event, context }) => {
  const id = await findOfferPk(context.db, event.args.offerId);
  if (!id) { console.warn(`OfferAccepted: offerId ${event.args.offerId} not found`); return; }
  await context.db.update(offer, { id }).set({ status: "Accepted" });

  // Also mark the request as Matched
  const offerRow = await context.db.sql.select().from(offer).where(eq(offer.id, id));
  if (offerRow[0]) {
    const reqId = await findRequestPk(context.db, offerRow[0].requestId);
    if (reqId) await context.db.update(request, { id: reqId }).set({ status: "Matched" });
  }
});

ponder.on("LendingMarket:OfferRejected", async ({ event, context }) => {
  const id = await findOfferPk(context.db, event.args.offerId);
  if (!id) { console.warn(`OfferRejected: offerId ${event.args.offerId} not found`); return; }
  await context.db.update(offer, { id }).set({ status: "Rejected" });
});

ponder.on("LendingMarket:OfferInvalidated", async ({ event, context }) => {
  const id = await findOfferPk(context.db, event.args.offerId);
  if (!id) { console.warn(`OfferInvalidated: offerId ${event.args.offerId} not found`); return; }
  await context.db.update(offer, { id }).set({ status: "Invalidated" });
});

ponder.on("LendingMarket:OfferExpired", async ({ event, context }) => {
  const id = await findOfferPk(context.db, event.args.offerId);
  if (!id) { console.warn(`OfferExpired: offerId ${event.args.offerId} not found`); return; }
  await context.db.update(offer, { id }).set({ status: "Expired" });
});

// ═══════════════════════════════════════
// MECHANISM B — PUBLIC OFFER
// ═══════════════════════════════════════

ponder.on("LendingMarket:PublicOfferPosted", async ({ event, context }) => {
  await context.db.insert(publicOffer).values({
    id:             event.id,
    offerId:        event.args.offerId,
    lender:         event.args.lender,
    amount:         event.args.amount,
    aprBps:         event.args.aprBps,
    durationSecs:   event.args.durationSecs,
    validUntil:     event.args.validUntil,
    minCreditScore: event.args.minCreditScore,
    status:         "Open",
    createdAt:      event.block.timestamp,
  });
});

ponder.on("LendingMarket:PublicOfferTaken", async ({ event, context }) => {
  const id = await findPublicOfferPk(context.db, event.args.offerId);
  if (!id) { console.warn(`PublicOfferTaken: offerId ${event.args.offerId} not found`); return; }
  await context.db.update(publicOffer, { id }).set({ status: "Taken" });
});

ponder.on("LendingMarket:PublicOfferCancelled", async ({ event, context }) => {
  const id = await findPublicOfferPk(context.db, event.args.offerId);
  if (!id) { console.warn(`PublicOfferCancelled: offerId ${event.args.offerId} not found`); return; }
  await context.db.update(publicOffer, { id }).set({ status: "Cancelled" });
});

ponder.on("LendingMarket:PublicOfferExpired", async ({ event, context }) => {
  const id = await findPublicOfferPk(context.db, event.args.offerId);
  if (!id) { console.warn(`PublicOfferExpired: offerId ${event.args.offerId} not found`); return; }
  await context.db.update(publicOffer, { id }).set({ status: "Expired" });
});

// ═══════════════════════════════════════
// MECHANISM C — LOANS
// ═══════════════════════════════════════

ponder.on("LendingMarket:LoanCreated", async ({ event, context }) => {
  await context.db.insert(loan).values({
    id:          event.id,
    loanId:      event.args.loanId,
    borrower:    event.args.borrower,
    lender:      event.args.lender,
    principal:   event.args.principal,
    repayDue:    event.args.repayDue,
    dueTime:     event.args.dueTime,
    status:      "Active",
    repaidOnTime:null,
    createdAt:   event.block.timestamp,
  });
});

ponder.on("LendingMarket:LoanRepaid", async ({ event, context }) => {
  const id = await findLoanPk(context.db, event.args.loanId);
  if (!id) { console.warn(`LoanRepaid: loanId ${event.args.loanId} not found`); return; }
  await context.db.update(loan, { id }).set({ status: "Repaid", repaidOnTime: event.args.onTime });
  await updateBorrowerScore(event.args.borrower, context.db, event.block.timestamp);
});

ponder.on("LendingMarket:LoanDefaulted", async ({ event, context }) => {
  const id = await findLoanPk(context.db, event.args.loanId);
  if (!id) { console.warn(`LoanDefaulted: loanId ${event.args.loanId} not found`); return; }
  await context.db.update(loan, { id }).set({ status: "Defaulted" });
  await updateBorrowerScore(event.args.borrower, context.db, event.block.timestamp);
});

// ═══════════════════════════════════════
// REAL WORLD CREDIT
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
  await updateBorrowerScore(event.args.borrower, context.db, event.block.timestamp);
});

ponder.on("RealWorldCredit:RecordDeleted", async ({ event, context }) => {
  const rows = await context.db.sql
    .select()
    .from(realWorldRecord)
    .where(eq(realWorldRecord.recordId, event.args.recordId));

  const row = rows[0];
  if (row) {
    await context.db.update(realWorldRecord, { id: row.id }).set({ isDeleted: true });
  }
  await updateBorrowerScore(event.args.borrower, context.db, event.block.timestamp);
});