"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@apollo/client";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import { GET_MARKET, GET_CREDIT_SCORE } from "@/lib/ponder";
import { LENDING_MARKET_ADDRESS, LENDING_MARKET_ABI } from "@/lib/contracts";
import { shortenAddress } from "@/lib/utils";

// ─── Tier badge ────────────────────────────────────────────
const TIER_COLOR: Record<string, string> = {
  AAA: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  AA:  "bg-blue-500/20   text-blue-400   border border-blue-500/30",
  A:   "bg-cyan-500/20   text-cyan-400   border border-cyan-500/30",
  B:   "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  C:   "bg-red-500/20    text-red-400    border border-red-500/30",
};

function TierBadge({ tier }: { tier: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold ${TIER_COLOR[tier] ?? TIER_COLOR["C"]}`}>
      {tier}
    </span>
  );
}

// ─── Format helpers ─────────────────────────────────────────
function formatAmount(wei: bigint | string): string {
  try {
    const val = formatEther(BigInt(wei.toString()));
    const num = parseFloat(val);
    return num < 0.001 ? num.toExponential(2) : num.toLocaleString(undefined, { maximumFractionDigits: 4 });
  } catch {
    return "0";
  }
}

function formatDeadline(ts: bigint | string): string {
  try {
    const date = new Date(Number(ts) * 1000);
    return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "-";
  }
}

function formatRate(bps: bigint | string): string {
  return `${(Number(bps) / 100).toFixed(1)}%`;
}

function formatDuration(secs: bigint | string): string {
  const days = Math.round(Number(secs) / 86400);
  return `${days}d`;
}

// ─── Score cell for ask table ───────────────────────────────
function ScoreCell({ address }: { address: string }) {
  const { data } = useQuery(GET_CREDIT_SCORE, {
    variables: { address: address.toLowerCase() },
    skip: !address,
  });

  const score = data?.creditScore;
  if (!score) return <span className="text-gray-500 text-sm">—</span>;

  return (
    <div className="flex items-center gap-2">
      <span className="font-bold text-white">{score.totalScore}</span>
      <TierBadge tier={score.tier} />
    </div>
  );
}

// ─── Fund modal (lender accepts ask) ───────────────────────
function FundModal({
  ask,
  myBids,
  onClose,
}: {
  ask: any;
  myBids: any[];
  onClose: () => void;
}) {
  const [selectedBidId, setSelectedBidId] = useState<string>("");
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess) onClose();
  }, [isSuccess]);

  const selectedBid = myBids.find((b) => b.orderId === selectedBidId);

  async function handleFund() {
    if (!selectedBid) return;
    writeContract({
      address: LENDING_MARKET_ADDRESS,
      abi: LENDING_MARKET_ABI,
      functionName: "acceptAsk",
      args: [BigInt(selectedBid.orderId), BigInt(ask.orderId)],
      value: BigInt(ask.amount),
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Fund Borrow Request</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>

        {/* Ask summary */}
        <div className="bg-gray-800 rounded-xl p-4 space-y-1">
          <p className="text-xs text-gray-400">Borrower</p>
          <p className="font-mono text-sm text-white">{shortenAddress(ask.borrower)}</p>
          <p className="text-xs text-gray-400 mt-2">Amount requested</p>
          <p className="text-xl font-bold text-green-400">{formatAmount(ask.amount)} tCTC</p>
        </div>

        {/* Select bid */}
        <div>
          <label className="text-xs text-gray-400 mb-2 block">Select your Bid to use</label>
          {myBids.length === 0 ? (
            <p className="text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              You have no open bids. Post a Lend Offer first.
            </p>
          ) : (
            <div className="space-y-2">
              {myBids.map((bid) => (
                <button
                  key={bid.orderId}
                  onClick={() => setSelectedBidId(bid.orderId)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    selectedBidId === bid.orderId
                      ? "border-green-500 bg-green-500/10"
                      : "border-gray-700 bg-gray-800 hover:border-gray-600"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-white font-semibold">{formatAmount(bid.amount)} tCTC</span>
                    <span className="text-gray-400 text-sm">
                      {formatRate(bid.interestRate)} · {formatDuration(bid.duration)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedBid && BigInt(selectedBid.amount) !== BigInt(ask.amount) && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            ⚠ Selected bid amount ({formatAmount(selectedBid.amount)} tCTC) must match ask amount ({formatAmount(ask.amount)} tCTC).
          </p>
        )}

        <button
          onClick={handleFund}
          disabled={
            !selectedBid ||
            isPending ||
            isConfirming ||
            myBids.length === 0 ||
            BigInt(selectedBid?.amount ?? 0) !== BigInt(ask.amount)
          }
          className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-bold py-3 rounded-xl transition-colors"
        >
          {isPending ? "Confirm in wallet..." : isConfirming ? "Processing..." : `Fund ${formatAmount(ask.amount)} tCTC`}
        </button>
      </div>
    </div>
  );
}

// ─── Take modal (borrower takes bid) ───────────────────────
function TakeModal({
  bid,
  onClose,
}: {
  bid: any;
  onClose: () => void;
}) {
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess) onClose();
  }, [isSuccess]);

  // Borrower posts an Ask that matches this Bid, then lender accepts
  // For UX simplicity: post Ask with same amount/currency automatically
  async function handleTake() {
    writeContract({
      address: LENDING_MARKET_ADDRESS,
      abi: LENDING_MARKET_ABI,
      functionName: "postAsk",
      args: [BigInt(bid.amount), bid.currency],
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Take Lend Offer</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>

        {/* Bid summary */}
        <div className="bg-gray-800 rounded-xl p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">Lender</span>
            <span className="font-mono text-sm text-white">{shortenAddress(bid.lender)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">Amount</span>
            <span className="font-bold text-green-400">{formatAmount(bid.amount)} tCTC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">Interest Rate</span>
            <span className="text-white">{formatRate(bid.interestRate)} APR</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">Duration</span>
            <span className="text-white">{formatDuration(bid.duration)}</span>
          </div>
        </div>

        <p className="text-xs text-gray-400 bg-gray-800 rounded-lg p-3">
          This will post a Borrow Request matching this offer. The lender will then fund your request.
        </p>

        <button
          onClick={handleTake}
          disabled={isPending || isConfirming}
          className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-bold py-3 rounded-xl transition-colors"
        >
          {isPending ? "Confirm in wallet..." : isConfirming ? "Processing..." : `Request ${formatAmount(bid.amount)} tCTC`}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export default function MarketPage() {
  const { address } = useAccount();
  const [tab, setTab] = useState<"bids" | "asks" | "deals">("bids");
  const [postType, setPostType] = useState<"ask" | "bid">("ask");
  const [amount, setAmount] = useState("");
  const [interest, setInterest] = useState("");
  const [duration, setDuration] = useState("");
  const [fundTarget, setFundTarget] = useState<any>(null);
  const [takeTarget, setTakeTarget] = useState<any>(null);

  const { data, loading, refetch } = useQuery(GET_MARKET);
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess) {
      setAmount("");
      setInterest("");
      setDuration("");
      refetch();
    }
  }, [isSuccess]);

  const bids  = (data?.bidOrders?.items  ?? []).filter((b: any) => b.status === "Open");
  const asks  = (data?.askOrders?.items  ?? []).filter((a: any) => a.status === "Open");
  const deals = (data?.deals?.items      ?? []);

  // My open bids (for Fund modal)
  const myBids = bids.filter((b: any) => b.lender?.toLowerCase() === address?.toLowerCase());

  // ── Post handler ───────────────────────────────────────────
  async function handlePost() {
    if (!address || !amount) return;

    let parsedAmount: bigint;
    try {
      parsedAmount = parseEther(amount);
      if (parsedAmount <= BigInt(0)) return;
    } catch {
      return;
    }

    if (postType === "ask") {
      writeContract({
        address: LENDING_MARKET_ADDRESS,
        abi: LENDING_MARKET_ABI,
        functionName: "postAsk",
        args: [parsedAmount, "tCTC"],
      });
    } else {
      if (!interest || !duration) return;
      try {
        writeContract({
          address: LENDING_MARKET_ADDRESS,
          abi: LENDING_MARKET_ABI,
          functionName: "postBid",
          args: [
            parsedAmount,
            "tCTC",
            BigInt(Math.round(Number(interest) * 100)),
            BigInt(Math.round(Number(duration) * 86400)),
          ],
        });
      } catch (err) {
        console.error("writeContract error:", err);
      }
    }
  }

  // ── Repay handler ─────────────────────────────────────────
  async function handleRepay(d: any) {
  writeContract({
    address: LENDING_MARKET_ADDRESS,
    abi: LENDING_MARKET_ABI,
    functionName: "repayLoan",
    args: [BigInt(d.dealId)],           //  dealId
    value: BigInt(d.repaymentDue),      // tCTC sen for msg.value
  });
}

  // ── Mark default handler ──────────────────────────────────
  async function handleDefault(d: any) {
    writeContract({
      address: LENDING_MARKET_ADDRESS,
      abi: LENDING_MARKET_ABI,
      functionName: "markDefault" as unknown as any,
      args: [BigInt(d.dealId), BigInt(0)],
    });
  }

  // ── Cancel handlers ───────────────────────────────────────
  async function handleCancelBid(bid: any) {
    writeContract({
      address: LENDING_MARKET_ADDRESS,
      abi: LENDING_MARKET_ABI,
      functionName: "cancelBid" as unknown as any,
      args: [BigInt(bid.orderId)],
    });
  }

  async function handleCancelAsk(ask: any) {
    writeContract({
      address: LENDING_MARKET_ADDRESS,
      abi: LENDING_MARKET_ABI,
      functionName: "cancelAsk" as unknown as any,
      args: [BigInt(ask.orderId)],
    });
  }

  const nowSecs = Math.floor(Date.now() / 1000);

  return (
    <div className="space-y-6">
      {/* Modals */}
      {fundTarget && (
        <FundModal
          ask={fundTarget}
          myBids={myBids}
          onClose={() => { setFundTarget(null); refetch(); }}
        />
      )}
      {takeTarget && (
        <TakeModal
          bid={takeTarget}
          onClose={() => { setTakeTarget(null); refetch(); }}
        />
      )}

      <h1 className="text-2xl font-bold text-white">Lending Market</h1>

      <div className="grid md:grid-cols-3 gap-6">
        {/* ── Order / Deal list ──────────────────────────── */}
        <div className="md:col-span-2 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            {(["bids", "asks", "deals"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors ${
                  tab === t
                    ? "text-white border-b-2 border-green-500"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {t === "bids" ? `Bids (${bids.length})` : t === "asks" ? `Asks (${asks.length})` : `Active Deals (${deals.filter((d: any) => d.status === "Active").length})`}
              </button>
            ))}
          </div>

          {loading && <p className="text-gray-500 text-sm p-6">Loading...</p>}

          {/* ── Bids table ─────────────────────────────── */}
          {tab === "bids" && !loading && (
            <div className="overflow-x-auto">
              {bids.length === 0 ? (
                <p className="text-gray-500 text-sm p-6">No open bids.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs border-b border-gray-800">
                      <th className="text-left px-4 py-3">Lender</th>
                      <th className="text-right px-4 py-3">Amount</th>
                      <th className="text-right px-4 py-3">Rate</th>
                      <th className="text-right px-4 py-3">Duration</th>
                      <th className="text-right px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {bids.map((bid: any) => {
                      const isOwn = bid.lender?.toLowerCase() === address?.toLowerCase();
                      return (
                        <tr key={bid.id} className="hover:bg-gray-800/40 transition-colors">
                          <td className="px-4 py-3 font-mono text-gray-300">
                            {shortenAddress(bid.lender)}
                            {isOwn && <span className="ml-2 text-xs text-green-400">(you)</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-white">
                            {formatAmount(bid.amount)} <span className="text-gray-500 font-normal">tCTC</span>
                          </td>
                          <td className="px-4 py-3 text-right text-green-400 font-semibold">
                            {formatRate(bid.interestRate)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-300">
                            {formatDuration(bid.duration)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {!isOwn && (
                              <button
                                onClick={() => setTakeTarget(bid)}
                                className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-semibold rounded-lg transition-colors"
                              >
                                Take
                              </button>
                            )}
                            {isOwn && (
                              <button
                                onClick={() => handleCancelBid(bid)}
                                disabled={isPending || isConfirming}
                                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
                              >
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Asks table ─────────────────────────────── */}
          {tab === "asks" && !loading && (
            <div className="overflow-x-auto">
              {asks.length === 0 ? (
                <p className="text-gray-500 text-sm p-6">No open asks.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs border-b border-gray-800">
                      <th className="text-left px-4 py-3">Borrower</th>
                      <th className="text-right px-4 py-3">Amount</th>
                      <th className="text-center px-4 py-3">Credit Score</th>
                      <th className="text-right px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {asks.map((ask: any) => {
                      const isOwn = ask.borrower?.toLowerCase() === address?.toLowerCase();
                      return (
                        <tr key={ask.id} className="hover:bg-gray-800/40 transition-colors">
                          <td className="px-4 py-3 font-mono text-gray-300">
                            {shortenAddress(ask.borrower)}
                            {isOwn && <span className="ml-2 text-xs text-green-400">(you)</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-white">
                            {formatAmount(ask.amount)} <span className="text-gray-500 font-normal">tCTC</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <ScoreCell address={ask.borrower} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            {!isOwn && (
                              <button
                                onClick={() => setFundTarget(ask)}
                                className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-semibold rounded-lg transition-colors"
                              >
                                Fund
                              </button>
                            )}
                            {isOwn && (
                              <button
                                onClick={() => handleCancelAsk(ask)}
                                disabled={isPending || isConfirming}
                                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
                              >
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Active Deals table ────────────────────── */}
          {tab === "deals" && !loading && (
            <div className="overflow-x-auto">
              {deals.length === 0 ? (
                <p className="text-gray-500 text-sm p-6">No deals yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs border-b border-gray-800">
                      <th className="text-left px-4 py-3">ID</th>
                      <th className="text-left px-4 py-3">Borrower</th>
                      <th className="text-left px-4 py-3">Lender</th>
                      <th className="text-right px-4 py-3">Principal</th>
                      <th className="text-right px-4 py-3">Repay Due</th>
                      <th className="text-right px-4 py-3">Deadline</th>
                      <th className="text-right px-4 py-3">Status</th>
                      <th className="text-right px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {deals.map((d: any) => {
                      const isBorrower = d.borrower?.toLowerCase() === address?.toLowerCase();
                      const isOverdue  = nowSecs > Number(d.deadline) && d.status === "Active";

                      return (
                        <tr key={d.id} className="hover:bg-gray-800/40 transition-colors">
                          <td className="px-4 py-3 text-gray-400">#{d.dealId}</td>
                          <td className="px-4 py-3 font-mono text-gray-300">
                            {shortenAddress(d.borrower)}
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-300">
                            {shortenAddress(d.lender)}
                          </td>
                          <td className="px-4 py-3 text-right text-white font-semibold">
                            {formatAmount(d.amount)} tCTC
                          </td>
                          <td className="px-4 py-3 text-right text-yellow-400 font-semibold">
                            {d.repaymentDue ? formatAmount(d.repaymentDue) : "—"} tCTC
                          </td>
                          <td className={`px-4 py-3 text-right ${isOverdue ? "text-red-400" : "text-gray-300"}`}>
                            {formatDeadline(d.deadline)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              d.status === "Active"
                                ? isOverdue
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-green-500/20 text-green-400"
                                : d.status === "Repaid"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : "bg-gray-500/20 text-gray-400"
                            }`}>
                              {isOverdue && d.status === "Active" ? "Overdue" : d.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isBorrower && d.status === "Active" && !isOverdue && (
                              <button
                                onClick={() => handleRepay(d)}
                                disabled={isPending || isConfirming}
                                className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
                              >
                                Repay
                              </button>
                            )}
                            {isOverdue && d.status === "Active" && (
                              <button
                                onClick={() => handleDefault(d)}
                                disabled={isPending || isConfirming}
                                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
                              >
                                Mark Default
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* ── Post Order Form ────────────────────────────── */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4 h-fit">
          <h3 className="font-semibold text-white">Post Order</h3>

          {/* Borrow / Lend toggle */}
          <div className="flex gap-2">
            {(["ask", "bid"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setPostType(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  postType === t
                    ? "bg-green-500 text-black"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {t === "ask" ? "Borrow" : "Lend"}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {/* Amount */}
            <div>
              <label className="text-xs text-gray-400">Amount (tCTC)</label>
              <input
                type="number"
                min="0"
                step="any"
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="100"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^\d*\.?\d*$/.test(val)) setAmount(val);
                }}
              />
            </div>

            {/* Lend-only fields */}
            {postType === "bid" && (
              <>
                <div>
                  <label className="text-xs text-gray-400">Interest Rate (% APR)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="5"
                    value={interest}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^\d*\.?\d*$/.test(val)) setInterest(val);
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Duration (days)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="30"
                    value={duration}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^\d*\.?\d*$/.test(val)) setDuration(val);
                    }}
                  />
                </div>

                {/* Estimated repayment preview */}
                {amount && interest && duration && (
                  <div className="bg-gray-800 rounded-lg p-3 text-xs space-y-1">
                    <p className="text-gray-400">Estimated repayment</p>
                    <p className="text-white font-semibold">
                      {(
                        parseFloat(amount) +
                        (parseFloat(amount) * parseFloat(interest) * parseFloat(duration)) /
                          (100 * 365)
                      ).toFixed(4)}{" "}
                      tCTC
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Info note */}
          {postType === "ask" && (
            <p className="text-xs text-gray-500 bg-gray-800 rounded-lg p-3">
              Post a borrow request. Lenders will see your credit score and decide whether to fund you.
            </p>
          )}

          <button
            onClick={handlePost}
            disabled={
              !address ||
              isPending ||
              isConfirming ||
              !amount ||
              (postType === "bid" && (!interest || !duration))
            }
            className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-bold py-2.5 rounded-lg transition-colors"
          >
            {!address
              ? "Connect Wallet"
              : isPending
                ? "Confirm in wallet..."
                : isConfirming
                  ? "Processing..."
                  : postType === "ask"
                    ? "Post Borrow Request"
                    : "Post Lend Offer"}
          </button>
        </div>
      </div>
    </div>
  );
}
