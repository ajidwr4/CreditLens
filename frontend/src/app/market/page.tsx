"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@apollo/client";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseEther, formatEther } from "viem";
import { GET_MARKET, GET_CREDIT_SCORE } from "@/lib/ponder";
import { LENDING_MARKET_ADDRESS, LENDING_MARKET_ABI } from "@/lib/contracts";
import { shortenAddress } from "@/lib/utils";

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

// Badge for offer status in My Funded tab
function OfferStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Open:        "bg-blue-500/20 text-blue-400",
    Accepted:    "bg-green-500/20 text-green-400",
    Rejected:    "bg-red-500/20 text-red-400",
    Invalidated: "bg-orange-500/20 text-orange-400",
    Expired:     "bg-gray-500/20 text-gray-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${styles[status] ?? styles["Expired"]}`}>
      {status}
    </span>
  );
}

function formatAmount(wei: bigint | string): string {
  try {
    const val = formatEther(BigInt(wei.toString()));
    const num = parseFloat(val);
    return num < 0.001
      ? num.toExponential(2)
      : num.toLocaleString(undefined, { maximumFractionDigits: 4 });
  } catch { return "0"; }
}

function formatDeadline(ts: bigint | string): string {
  try {
    return new Date(Number(ts) * 1000).toLocaleDateString("en-US", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return "-"; }
}

function formatRate(bps: bigint | string): string {
  return `${(Number(bps) / 100).toFixed(1)}%`;
}

function formatDuration(secs: bigint | string): string {
  return `${Math.round(Number(secs) / 86400)}d`;
}

function ScoreCell({ address }: { address: string }) {
  const { data } = useQuery(GET_CREDIT_SCORE, {
    variables: { address: address.toLowerCase() },
    skip: !address,
  });
  const score = data?.creditScore;
  if (!score) return <span className="text-gray-500 text-sm">—</span>;
  return (
    <div className="flex items-center justify-center gap-2">
      <span className="font-bold text-white">{score.totalScore}</span>
      <TierBadge tier={score.tier} />
    </div>
  );
}

// Cap offer validUntil to req.validUntil — contract rejects if offer expiry > request expiry
function FundModal({ req, onClose }: { req: any; onClose: () => void }) {
  const [aprInput, setAprInput]           = useState("");
  const [durationInput, setDurationInput] = useState("");
  const [validDays, setValidDays]         = useState("7");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess }     = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => { if (isSuccess) setTimeout(() => onClose(), 3000); }, [isSuccess]);

  const estimatedRepay =
    aprInput && durationInput && req?.amount
      ? parseFloat(formatEther(BigInt(req.amount))) +
        parseFloat(formatEther(BigInt(req.amount))) *
          (parseFloat(aprInput) / 100) *
          (parseFloat(durationInput) / 365)
      : null;

  async function handleFund() {
    if (!aprInput || !durationInput || !validDays) return;
    const aprBps       = BigInt(Math.round(parseFloat(aprInput) * 100));
    const durationSecs = BigInt(Math.round(parseFloat(durationInput) * 86400));
    const offerValidUntil = BigInt(
      Math.floor(Date.now() / 1000) + Math.round(parseFloat(validDays) * 86400)
    );
    const reqValidUntil = BigInt(req.validUntil);
    const validUntil = offerValidUntil < reqValidUntil ? offerValidUntil : reqValidUntil;
    writeContract({
      address: LENDING_MARKET_ADDRESS,
      abi: LENDING_MARKET_ABI,
      functionName: "fundOffer",
      args: [BigInt(req.requestId), aprBps, durationSecs, validUntil],
      value: BigInt(req.amount),
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Fund Borrow Request</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Borrower</span>
            <span className="font-mono text-white">{shortenAddress(req.borrower)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Amount</span>
            <span className="font-bold text-green-400">{formatAmount(req.amount)} tCTC</span>
          </div>
          <div className="flex justify-between text-sm items-center">
            <span className="text-gray-400">Credit Score</span>
            <ScoreCell address={req.borrower} />
          </div>
        </div>
        <div className="space-y-3">
          {[
            { label: "APR (% per year)",      val: aprInput,      set: setAprInput,      ph: "10" },
            { label: "Duration (days)",        val: durationInput, set: setDurationInput, ph: "30" },
            { label: "Offer valid for (days)", val: validDays,     set: setValidDays,     ph: "7"  },
          ].map(({ label, val, set, ph }) => (
            <div key={label}>
              <label className="text-xs text-gray-400">{label}</label>
              <input
                type="number" min="0" step="any" placeholder={ph} value={val}
                onChange={(e) => { if (e.target.value === "" || /^\d*\.?\d*$/.test(e.target.value)) set(e.target.value); }}
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          ))}
        </div>
        {estimatedRepay && (
          <div className="bg-gray-800 rounded-lg p-3 text-xs">
            <p className="text-gray-400">Borrower repays (estimated)</p>
            <p className="text-white font-semibold mt-1">{estimatedRepay.toFixed(4)} tCTC</p>
          </div>
        )}
        <p className="text-xs text-gray-500 bg-gray-800 rounded-lg p-3">
          Your tCTC locks immediately. Offer expiry is capped to request deadline ({formatDeadline(req.validUntil)}).
        </p>
        {isSuccess && <p className="text-green-400 text-sm text-center">✓ Offer sent! Waiting for borrower to accept.</p>}
        <button
          onClick={handleFund}
          disabled={!aprInput || !durationInput || !validDays || isPending || isConfirming || isSuccess}
          className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-bold py-3 rounded-xl transition-colors"
        >
          {isPending ? "Confirm in wallet..." : isConfirming ? "Processing..." : `Fund ${formatAmount(req.amount)} tCTC`}
        </button>
      </div>
    </div>
  );
}

function TakeModal({ po, onClose }: { po: any; onClose: () => void }) {
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess }     = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => { if (isSuccess) setTimeout(() => onClose(), 3000); }, [isSuccess]);

  const repayEstimate = po
    ? parseFloat(formatEther(BigInt(po.amount))) +
      parseFloat(formatEther(BigInt(po.amount))) *
        (Number(po.aprBps) / 10000) *
        (Number(po.durationSecs) / (365 * 86400))
    : 0;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Take Public Offer</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
          {[
            { label: "Lender",        val: shortenAddress(po.lender), mono: true  },
            { label: "Amount",        val: `${formatAmount(po.amount)} tCTC`, green: true },
            { label: "APR",           val: formatRate(po.aprBps) },
            { label: "Duration",      val: formatDuration(po.durationSecs) },
            { label: "Min Score",     val: po.minCreditScore.toString(), yellow: true },
            { label: "Offer expires", val: formatDeadline(po.validUntil) },
          ].map(({ label, val, mono, green, yellow }) => (
            <div key={label} className="flex justify-between">
              <span className="text-gray-400">{label}</span>
              <span className={`${mono ? "font-mono" : ""} ${green ? "font-bold text-green-400" : ""} ${yellow ? "font-semibold text-yellow-400" : "text-white"}`}>{val}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-gray-700 pt-2 mt-1">
            <span className="text-gray-400">You repay (estimated)</span>
            <span className="text-yellow-400 font-semibold">{repayEstimate.toFixed(4)} tCTC</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 bg-gray-800 rounded-lg p-3">
          First come first served. Your credit score is checked on-chain at this moment.
        </p>
        {isSuccess && <p className="text-green-400 text-sm text-center">✓ Confirmed! Loan is now active.</p>}
        <button
          onClick={() => writeContract({ address: LENDING_MARKET_ADDRESS, abi: LENDING_MARKET_ABI, functionName: "takeOffer", args: [BigInt(po.offerId)] })}
          disabled={isPending || isConfirming || isSuccess}
          className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-bold py-3 rounded-xl transition-colors"
        >
          {isPending ? "Confirm in wallet..." : isConfirming ? "Processing..." : `Take ${formatAmount(po.amount)} tCTC`}
        </button>
      </div>
    </div>
  );
}

type Tab      = "requests" | "public" | "myoffers" | "myfunded" | "loans";
type PostType = "borrow"   | "lend";

export default function MarketPage() {
  const { address } = useAccount();
  const [tab, setTab]               = useState<Tab>("requests");
  const [postType, setPostType]     = useState<PostType>("borrow");
  const [fundTarget, setFundTarget] = useState<any>(null);
  const [takeTarget, setTakeTarget] = useState<any>(null);
  const [amount, setAmount]         = useState("");
  const [apr, setApr]               = useState("");
  const [duration, setDuration]     = useState("");
  const [validDays, setValidDays]   = useState("7");
  const [minScore, setMinScore]     = useState("0");

  const { data, loading, refetch }                 = useQuery(GET_MARKET);
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess }     = useWaitForTransactionReceipt({ hash: txHash });

  // Poll pending refund on-chain every 5s — used as source of truth for Withdraw/Withdrawn button state
  // No banner; all refund actions are handled inside the My Funded tab
  const { data: pendingRefund, refetch: refetchRefund } = useReadContract({
    address: LENDING_MARKET_ADDRESS,
    abi: LENDING_MARKET_ABI,
    functionName: "getPendingRefund",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 5000,
    },
  });

  useEffect(() => {
    if (isSuccess) {
      setAmount(""); setApr(""); setDuration(""); setValidDays("7"); setMinScore("0");
      setTimeout(() => { refetch(); refetchRefund(); }, 3000);
    }
  }, [isSuccess]);

  const nowSecs = Math.floor(Date.now() / 1000);

  const allRequests     = data?.requests?.items     ?? [];
  const allOffers       = data?.offers?.items        ?? [];
  const allPublicOffers = data?.publicOffers?.items  ?? [];
  const allLoans        = data?.loans?.items          ?? [];

  const openRequests     = allRequests.filter((r: any) => r.status === "Open");
  const openPublicOffers = allPublicOffers.filter((p: any) => p.status === "Open");

  const myOpenRequestIds = new Set(
    allRequests
      .filter((r: any) => r.borrower?.toLowerCase() === address?.toLowerCase() && r.status === "Open")
      .map((r: any) => r.requestId.toString())
  );
  const myInboxOffers = allOffers.filter(
    (o: any) => o.status === "Open" && myOpenRequestIds.has(o.requestId.toString())
  );

  // All offers sent by this wallet as a lender, all statuses
  const myFundedOffers = allOffers.filter(
    (o: any) => o.lender?.toLowerCase() === address?.toLowerCase()
  );

  // Lookup map requestId → request for My Funded tab
  const requestMap = Object.fromEntries(
    allRequests.map((r: any) => [r.requestId.toString(), r])
  );

  // Count offers that require action — request matched but offer still open
  const myfundedActionCount = myFundedOffers.filter((o: any) => {
    const req = requestMap[o.requestId.toString()];
    return o.status === "Open" && req?.status === "Matched";
  }).length;

  const activeLoans = allLoans.filter((l: any) => l.status === "Active");

  const hasPendingRefund = pendingRefund !== undefined && pendingRefund > BigInt(0);

  async function handlePost() {
    if (!address || !amount || !validDays) return;
    let parsedAmount: bigint;
    try {
      parsedAmount = parseEther(amount);
      if (parsedAmount <= BigInt(0)) return;
    } catch { return; }
    const validUntilTs = BigInt(Math.floor(Date.now() / 1000) + Math.round(parseFloat(validDays) * 86400));
    if (postType === "borrow") {
      writeContract({ address: LENDING_MARKET_ADDRESS, abi: LENDING_MARKET_ABI, functionName: "postRequest", args: [parsedAmount, validUntilTs] });
    } else {
      if (!apr || !duration) return;
      writeContract({
        address: LENDING_MARKET_ADDRESS, abi: LENDING_MARKET_ABI, functionName: "postPublicOffer",
        args: [parsedAmount, BigInt(Math.round(parseFloat(apr) * 100)), BigInt(Math.round(parseFloat(duration) * 86400)), validUntilTs, BigInt(Math.round(parseFloat(minScore || "0")))],
        value: parsedAmount,
      });
    }
  }

  function handleRepay(loan: any) {
    writeContract({ address: LENDING_MARKET_ADDRESS, abi: LENDING_MARKET_ABI, functionName: "repay", args: [BigInt(loan.loanId)], value: BigInt(loan.repayDue) });
  }
  function handleDefault(loan: any) {
    writeContract({ address: LENDING_MARKET_ADDRESS, abi: LENDING_MARKET_ABI, functionName: "markDefault", args: [BigInt(loan.loanId)] });
  }
  function handleCancelRequest(req: any) {
    writeContract({ address: LENDING_MARKET_ADDRESS, abi: LENDING_MARKET_ABI, functionName: "cancelRequest", args: [BigInt(req.requestId)] });
  }
  function handleCancelPubOffer(po: any) {
    writeContract({ address: LENDING_MARKET_ADDRESS, abi: LENDING_MARKET_ABI, functionName: "cancelPublicOffer", args: [BigInt(po.offerId)] });
  }
  function handleAcceptOffer(offer: any) {
    writeContract({ address: LENDING_MARKET_ADDRESS, abi: LENDING_MARKET_ABI, functionName: "acceptOffer", args: [BigInt(offer.offerId)] });
  }
  function handleRejectOffer(offer: any) {
    writeContract({ address: LENDING_MARKET_ADDRESS, abi: LENDING_MARKET_ABI, functionName: "rejectOffer", args: [BigInt(offer.offerId)] });
  }
  // Called by lender when the request has been matched by another lender
  function handleInvalidateOffer(offer: any) {
    writeContract({ address: LENDING_MARKET_ADDRESS, abi: LENDING_MARKET_ABI, functionName: "invalidateOffer", args: [BigInt(offer.offerId)] });
  }
  function handleWithdrawRefund() {
    writeContract({ address: LENDING_MARKET_ADDRESS, abi: LENDING_MARKET_ABI, functionName: "withdrawRefund", args: [] });
  }

  const repayPreview = amount && apr && duration
    ? (parseFloat(amount) + parseFloat(amount) * (parseFloat(apr) / 100) * (parseFloat(duration) / 365)).toFixed(4)
    : null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "requests", label: `Requests (${openRequests.length})`          },
    { key: "public",   label: `Public Offers (${openPublicOffers.length})` },
    { key: "myoffers", label: `My Offers (${myInboxOffers.length})`        },
    // Label changes to warning if there are offers that need to be invalidated
    { key: "myfunded", label: myfundedActionCount > 0
        ? `My Funded ⚠ ${myfundedActionCount}`
        : `My Funded (${myFundedOffers.length})` },
    { key: "loans",    label: `Active Loans (${activeLoans.length})`       },
  ];

  return (
    <div className="space-y-6">
      {fundTarget && <FundModal req={fundTarget} onClose={() => { setFundTarget(null); setTimeout(() => refetch(), 3000); }} />}
      {takeTarget && <TakeModal po={takeTarget}  onClose={() => { setTakeTarget(null); setTimeout(() => refetch(), 3000); }} />}

      <h1 className="text-2xl font-bold text-white">Lending Market</h1>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-gray-800 overflow-x-auto">
            {tabs.map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex-1 min-w-fit px-3 py-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                  tab === key ? "text-white border-b-2 border-green-500" : "text-gray-500 hover:text-gray-300"
                } ${key === "myfunded" && myfundedActionCount > 0 && tab !== key ? "text-orange-400" : ""}`}>
                {label}
              </button>
            ))}
          </div>

          {loading && <p className="text-gray-500 text-sm p-6">Loading...</p>}

          {/* ── Requests Tab ─────────────────────────── */}
          {tab === "requests" && !loading && (
            <div className="overflow-x-auto">
              {openRequests.length === 0 ? <p className="text-gray-500 text-sm p-6">No open borrow requests.</p> : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs border-b border-gray-800">
                      <th className="text-left px-4 py-3">Borrower</th>
                      <th className="text-right px-4 py-3">Amount</th>
                      <th className="text-center px-4 py-3">Credit Score</th>
                      <th className="text-right px-4 py-3">Expires</th>
                      <th className="text-right px-4 py-3">Offers</th>
                      <th className="text-right px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {openRequests.map((req: any) => {
                      const isOwn = req.borrower?.toLowerCase() === address?.toLowerCase();
                      const offerCount = allOffers.filter((o: any) => o.requestId.toString() === req.requestId.toString() && o.status === "Open").length;
                      return (
                        <tr key={req.id} className="hover:bg-gray-800/40 transition-colors">
                          <td className="px-4 py-3 font-mono text-gray-300">
                            {shortenAddress(req.borrower)}
                            {isOwn && <span className="ml-2 text-xs text-green-400">(you)</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-white">{formatAmount(req.amount)} <span className="text-gray-500 font-normal">tCTC</span></td>
                          <td className="px-4 py-3 text-center"><ScoreCell address={req.borrower} /></td>
                          <td className="px-4 py-3 text-right text-gray-400 text-xs">{formatDeadline(req.validUntil)}</td>
                          <td className="px-4 py-3 text-right">
                            {offerCount > 0
                              ? <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full font-semibold">{offerCount}</span>
                              : <span className="text-gray-600 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {!isOwn && address && (
                              <button onClick={() => setFundTarget(req)} className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-semibold rounded-lg transition-colors">Fund</button>
                            )}
                            {isOwn && (
                              <button onClick={() => handleCancelRequest(req)} disabled={isPending || isConfirming} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40">Cancel</button>
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

          {/* ── Public Offers Tab ────────────────────── */}
          {tab === "public" && !loading && (
            <div className="overflow-x-auto">
              {openPublicOffers.length === 0 ? <p className="text-gray-500 text-sm p-6">No open public offers.</p> : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs border-b border-gray-800">
                      <th className="text-left px-4 py-3">Lender</th>
                      <th className="text-right px-4 py-3">Amount</th>
                      <th className="text-right px-4 py-3">APR</th>
                      <th className="text-right px-4 py-3">Duration</th>
                      <th className="text-right px-4 py-3">Min Score</th>
                      <th className="text-right px-4 py-3">Expires</th>
                      <th className="text-right px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {openPublicOffers.map((po: any) => {
                      const isOwn = po.lender?.toLowerCase() === address?.toLowerCase();
                      return (
                        <tr key={po.id} className="hover:bg-gray-800/40 transition-colors">
                          <td className="px-4 py-3 font-mono text-gray-300">
                            {shortenAddress(po.lender)}
                            {isOwn && <span className="ml-2 text-xs text-green-400">(you)</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-white">{formatAmount(po.amount)} <span className="text-gray-500 font-normal">tCTC</span></td>
                          <td className="px-4 py-3 text-right text-green-400 font-semibold">{formatRate(po.aprBps)}</td>
                          <td className="px-4 py-3 text-right text-gray-300">{formatDuration(po.durationSecs)}</td>
                          <td className="px-4 py-3 text-right text-yellow-400 font-semibold">{po.minCreditScore.toString()}</td>
                          <td className="px-4 py-3 text-right text-gray-400 text-xs">{formatDeadline(po.validUntil)}</td>
                          <td className="px-4 py-3 text-right">
                            {!isOwn && address && (
                              <button onClick={() => setTakeTarget(po)} className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-semibold rounded-lg transition-colors">Take</button>
                            )}
                            {isOwn && (
                              <button onClick={() => handleCancelPubOffer(po)} disabled={isPending || isConfirming} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40">Cancel</button>
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

          {/* ── My Offers Tab (borrower inbox) ───────── */}
          {tab === "myoffers" && !loading && (
            <div className="overflow-x-auto">
              {!address
                ? <p className="text-gray-500 text-sm p-6">Connect wallet to see offers for your requests.</p>
                : myInboxOffers.length === 0
                  ? <p className="text-gray-500 text-sm p-6">No pending offers for your open requests.</p>
                  : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs border-b border-gray-800">
                      <th className="text-left px-4 py-3">Lender</th>
                      <th className="text-right px-4 py-3">Amount</th>
                      <th className="text-right px-4 py-3">APR</th>
                      <th className="text-right px-4 py-3">Duration</th>
                      <th className="text-right px-4 py-3">Offer Expires</th>
                      <th className="text-right px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {myInboxOffers.map((offer: any) => {
                      const isExpired = nowSecs > Number(offer.validUntil);
                      return (
                        <tr key={offer.id} className="hover:bg-gray-800/40 transition-colors">
                          <td className="px-4 py-3 font-mono text-gray-300">{shortenAddress(offer.lender)}</td>
                          <td className="px-4 py-3 text-right font-bold text-white">{formatAmount(offer.amount)} <span className="text-gray-500 font-normal">tCTC</span></td>
                          <td className="px-4 py-3 text-right text-green-400 font-semibold">{formatRate(offer.aprBps)}</td>
                          <td className="px-4 py-3 text-right text-gray-300">{formatDuration(offer.durationSecs)}</td>
                          <td className={`px-4 py-3 text-right text-xs ${isExpired ? "text-red-400" : "text-gray-400"}`}>
                            {isExpired ? "Expired" : formatDeadline(offer.validUntil)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {!isExpired && (
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => handleAcceptOffer(offer)} disabled={isPending || isConfirming} className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40">Accept</button>
                                <button onClick={() => handleRejectOffer(offer)} disabled={isPending || isConfirming} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40">Reject</button>
                              </div>
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

          {/* ── My Funded Tab (lender view) ──────────────────────────────────
               Shows all offers sent by this wallet as a lender.
               - Open + request Matched → Invalidate (moves tCTC to pendingRefunds)
               - Rejected or Invalidated + pendingRefund > 0 → Withdraw (yellow)
               - Rejected or Invalidated + pendingRefund == 0 → Withdrawn (gray)
               pendingRefund is the single source of truth, accurate after refresh. */}
          {tab === "myfunded" && !loading && (
            <div className="overflow-x-auto">
              {!address
                ? <p className="text-gray-500 text-sm p-6">Connect wallet to see your funded offers.</p>
                : myFundedOffers.length === 0
                  ? <p className="text-gray-500 text-sm p-6">You have not funded any requests yet.</p>
                  : (
                <>
                  {myfundedActionCount > 0 && (
                    <div className="mx-4 mt-4 mb-2 bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-xs text-orange-400">
                      ⚠ {myfundedActionCount} offer{myfundedActionCount > 1 ? "s were" : " was"} not selected — the borrower chose another lender.
                      Click <strong>Invalidate</strong> to unlock your tCTC, then click <strong>Withdraw</strong> to reclaim it.
                    </div>
                  )}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 text-xs border-b border-gray-800">
                        <th className="text-left px-4 py-3">Borrower</th>
                        <th className="text-right px-4 py-3">Amount</th>
                        <th className="text-right px-4 py-3">APR</th>
                        <th className="text-right px-4 py-3">Duration</th>
                        <th className="text-center px-4 py-3">Offer</th>
                        <th className="text-center px-4 py-3">Request</th>
                        <th className="text-right px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {myFundedOffers.map((offer: any) => {
                        const req            = requestMap[offer.requestId.toString()];
                        const needInvalidate = offer.status === "Open" && req?.status === "Matched";
                        const canWithdraw    = (offer.status === "Rejected" || offer.status === "Invalidated") && hasPendingRefund;
                        const withdrawn      = (offer.status === "Rejected" || offer.status === "Invalidated") && !hasPendingRefund;
                        return (
                          <tr key={offer.id} className={`hover:bg-gray-800/40 transition-colors ${needInvalidate ? "bg-orange-500/5" : ""}`}>
                            <td className="px-4 py-3 font-mono text-gray-300">
                              {req ? shortenAddress(req.borrower) : "—"}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-white">
                              {formatAmount(offer.amount)} <span className="text-gray-500 font-normal">tCTC</span>
                            </td>
                            <td className="px-4 py-3 text-right text-green-400 font-semibold">{formatRate(offer.aprBps)}</td>
                            <td className="px-4 py-3 text-right text-gray-300">{formatDuration(offer.durationSecs)}</td>
                            <td className="px-4 py-3 text-center">
                              <OfferStatusBadge status={offer.status} />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                req?.status === "Open"      ? "bg-blue-500/20 text-blue-400"   :
                                req?.status === "Matched"   ? "bg-green-500/20 text-green-400" :
                                req?.status === "Cancelled" ? "bg-red-500/20 text-red-400"     :
                                                              "bg-gray-500/20 text-gray-400"
                              }`}>
                                {req?.status ?? "—"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {/* Step 1 — borrower chose someone else, unlock tCTC first */}
                              {needInvalidate && (
                                <button
                                  onClick={() => handleInvalidateOffer(offer)}
                                  disabled={isPending || isConfirming}
                                  className="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
                                >
                                  Invalidate
                                </button>
                              )}
                              {/* Step 2 / Flow 1 — tCTC is in pendingRefunds, ready to claim */}
                              {canWithdraw && (
                                <button
                                  onClick={handleWithdrawRefund}
                                  disabled={isPending || isConfirming}
                                  className="px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
                                >
                                  Withdraw
                                </button>
                              )}
                              {/* Already withdrawn — pendingRefund is 0 */}
                              {withdrawn && (
                                <span className="px-3 py-1.5 bg-gray-500/10 border border-gray-700 text-gray-500 text-xs font-semibold rounded-lg">
                                  Withdrawn
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}

          {/* ── Active Loans Tab ─────────────────────── */}
          {tab === "loans" && !loading && (
            <div className="overflow-x-auto">
              {allLoans.length === 0 ? <p className="text-gray-500 text-sm p-6">No loans yet.</p> : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs border-b border-gray-800">
                      <th className="text-left px-4 py-3">ID</th>
                      <th className="text-left px-4 py-3">Borrower</th>
                      <th className="text-left px-4 py-3">Lender</th>
                      <th className="text-right px-4 py-3">Principal</th>
                      <th className="text-right px-4 py-3">Repay Due</th>
                      <th className="text-right px-4 py-3">Deadline</th>
                      <th className="text-center px-4 py-3">Status</th>
                      <th className="text-right px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {allLoans.map((loan: any) => {
                      const isBorrower = loan.borrower?.toLowerCase() === address?.toLowerCase();
                      const isOverdue  = nowSecs > Number(loan.dueTime) && loan.status === "Active";
                      return (
                        <tr key={loan.id} className="hover:bg-gray-800/40 transition-colors">
                          <td className="px-4 py-3 text-gray-400">#{loan.loanId.toString()}</td>
                          <td className="px-4 py-3 font-mono text-gray-300">
                            {shortenAddress(loan.borrower)}
                            {isBorrower && <span className="ml-1 text-xs text-green-400">(you)</span>}
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-300">{shortenAddress(loan.lender)}</td>
                          <td className="px-4 py-3 text-right text-white font-semibold">{formatAmount(loan.principal)} tCTC</td>
                          <td className="px-4 py-3 text-right text-yellow-400 font-semibold">{formatAmount(loan.repayDue)} tCTC</td>
                          <td className={`px-4 py-3 text-right text-xs ${isOverdue ? "text-red-400" : "text-gray-300"}`}>{formatDeadline(loan.dueTime)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              loan.status === "Active"
                                ? isOverdue ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"
                                : loan.status === "Repaid" ? "bg-blue-500/20 text-blue-400" : "bg-gray-500/20 text-gray-400"
                            }`}>
                              {isOverdue && loan.status === "Active" ? "Overdue" : loan.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isBorrower && loan.status === "Active" && !isOverdue && (
                              <button onClick={() => handleRepay(loan)} disabled={isPending || isConfirming} className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40">Repay</button>
                            )}
                            {isOverdue && loan.status === "Active" && (
                              <button onClick={() => handleDefault(loan)} disabled={isPending || isConfirming} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40">Mark Default</button>
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

        {/* ── Post Order Form ──────────────────────────── */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4 h-fit">
          <h3 className="font-semibold text-white">Post Order</h3>
          <div className="flex gap-2">
            {(["borrow", "lend"] as const).map((t) => (
              <button key={t} onClick={() => setPostType(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${postType === t ? "bg-green-500 text-black" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
                {t === "borrow" ? "Borrow" : "Lend"}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400">Amount (tCTC)</label>
              <input type="number" min="0" step="any" placeholder="100" value={amount}
                onChange={(e) => { if (e.target.value === "" || /^\d*\.?\d*$/.test(e.target.value)) setAmount(e.target.value); }}
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Valid for (days)</label>
              <input type="number" min="1" step="1" placeholder="7" value={validDays}
                onChange={(e) => { if (e.target.value === "" || /^\d*$/.test(e.target.value)) setValidDays(e.target.value); }}
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            </div>
            {postType === "lend" && (
              <>
                <div>
                  <label className="text-xs text-gray-400">APR (% per year)</label>
                  <input type="number" min="0" step="any" placeholder="10" value={apr}
                    onChange={(e) => { if (e.target.value === "" || /^\d*\.?\d*$/.test(e.target.value)) setApr(e.target.value); }}
                    className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Duration (days)</label>
                  <input type="number" min="0" step="any" placeholder="30" value={duration}
                    onChange={(e) => { if (e.target.value === "" || /^\d*\.?\d*$/.test(e.target.value)) setDuration(e.target.value); }}
                    className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Min Credit Score (0 = no filter)</label>
                  <input type="number" min="0" step="1" placeholder="0" value={minScore}
                    onChange={(e) => { if (e.target.value === "" || /^\d*$/.test(e.target.value)) setMinScore(e.target.value); }}
                    className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                </div>
                {repayPreview && (
                  <div className="bg-gray-800 rounded-lg p-3 text-xs space-y-1">
                    <p className="text-gray-400">Borrower repays (estimated)</p>
                    <p className="text-white font-semibold">{repayPreview} tCTC</p>
                    <p className="text-gray-500">Your tCTC will be locked on post.</p>
                  </div>
                )}
              </>
            )}
            {postType === "borrow" && (
              <p className="text-xs text-gray-500 bg-gray-800 rounded-lg p-3">
                Lenders will see your credit score and send offers. You choose which to accept.
              </p>
            )}
          </div>
          <button onClick={handlePost}
            disabled={!address || isPending || isConfirming || !amount || !validDays || (postType === "lend" && (!apr || !duration))}
            className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-bold py-2.5 rounded-lg transition-colors">
            {!address ? "Connect Wallet" : isPending ? "Confirm in wallet..." : isConfirming ? "Processing..." : postType === "borrow" ? "Post Borrow Request" : `Post Lend Offer (${amount || "0"} tCTC locked)`}
          </button>
        </div>
      </div>
    </div>
  );
}
