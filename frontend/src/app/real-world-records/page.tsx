"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client";
import { useAccount } from "wagmi";
import { gql } from "@apollo/client";
import { shortenAddress } from "@/lib/utils";

// Query all non-deleted real world records, newest first
const GET_ALL_REAL_WORLD_RECORDS = gql`
  query GetAllRealWorldRecords {
    realWorldRecords(
      where: { isDeleted: false }
      limit: 200
      orderBy: "mintedAt"
      orderDirection: "desc"
    ) {
      items {
        id
        recordId
        borrower
        issuerWallet
        issuerName
        amount
        currency
        category
        repaidOnTime
        evidenceNote
        mintedAt
      }
    }
  }
`;

const CATEGORY_STYLE: Record<string, string> = {
  Personal:  "bg-blue-500/20 text-blue-400",
  Mortgage:  "bg-purple-500/20 text-purple-400",
  Auto:      "bg-cyan-500/20 text-cyan-400",
  Student:   "bg-yellow-500/20 text-yellow-400",
  Business:  "bg-orange-500/20 text-orange-400",
  Credit:    "bg-pink-500/20 text-pink-400",
};

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${CATEGORY_STYLE[category] ?? "bg-gray-500/20 text-gray-400"}`}>
      {category}
    </span>
  );
}

function RepaymentBadge({ onTime }: { onTime: boolean }) {
  return onTime
    ? <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-500/20 text-green-400">✓ On Time</span>
    : <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-400">✗ Late</span>;
}

function formatAmount(amount: bigint | string, currency: string): string {
  try {
    const num = Number(amount);
    return `${num.toLocaleString()} ${currency}`;
  } catch { return "-"; }
}

function formatDate(ts: bigint | string): string {
  try {
    return new Date(Number(ts) * 1000).toLocaleDateString("en-US", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return "-"; }
}

type FilterMode = "all" | "mine";

export default function RealWorldRecordsPage() {
  const { address } = useAccount();
  const [filter, setFilter] = useState<FilterMode>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data, loading } = useQuery(GET_ALL_REAL_WORLD_RECORDS);

  const allRecords = data?.realWorldRecords?.items ?? [];

  // Filter by wallet if "My Records" selected
  const byWallet = filter === "mine" && address
    ? allRecords.filter((r: any) => r.borrower?.toLowerCase() === address.toLowerCase())
    : allRecords;

  // Filter by category
  const categories = ["all", ...Array.from(new Set(allRecords.map((r: any) => r.category))) as string[]];
  const filtered = categoryFilter === "all"
    ? byWallet
    : byWallet.filter((r: any) => r.category === categoryFilter);

  // Summary stats
  const totalRecords  = filtered.length;
  const onTimeCount   = filtered.filter((r: any) => r.repaidOnTime).length;
  const lateCount     = filtered.filter((r: any) => !r.repaidOnTime).length;
  const onTimePct     = totalRecords > 0 ? Math.round((onTimeCount / totalRecords) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Real World Credit Records</h1>
        {address && (
          <div className="flex gap-2">
            {(["all", "mine"] as FilterMode[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filter === f ? "bg-green-500 text-black" : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {f === "all" ? "All Records" : "My Records"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary cards */}
      {!loading && totalRecords > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Records",   value: totalRecords,         color: "text-white"        },
            { label: "On-Time Repaid",  value: onTimeCount,          color: "text-green-400"    },
            { label: "Late Repaid",     value: lateCount,            color: "text-red-400"      },
            { label: "On-Time Rate",    value: `${onTimePct}%`,      color: "text-cyan-400"     },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-gray-500 text-xs">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Category filter */}
      {!loading && categories.length > 2 && (
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                categoryFilter === cat
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-gray-800 text-gray-500 hover:text-gray-300"
              }`}
            >
              {cat === "all" ? "All Categories" : cat}
            </button>
          ))}
        </div>
      )}

      {/* Records table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading && <p className="text-gray-500 text-sm p-6">Loading records...</p>}

        {!loading && filtered.length === 0 && (
          <p className="text-gray-500 text-sm p-6">
            {filter === "mine" ? "No real world credit records for your wallet." : "No records found."}
          </p>
        )}

        {!loading && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800">
                  <th className="text-left px-4 py-3">Borrower</th>
                  <th className="text-left px-4 py-3">Issuer</th>
                  <th className="text-right px-4 py-3">Amount</th>
                  <th className="text-center px-4 py-3">Category</th>
                  <th className="text-center px-4 py-3">Repayment</th>
                  <th className="text-right px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map((rec: any) => {
                  const isOwn = rec.borrower?.toLowerCase() === address?.toLowerCase();
                  return (
                    <tr key={rec.id} className={`hover:bg-gray-800/40 transition-colors ${isOwn ? "bg-green-500/5" : ""}`}>
                      <td className="px-4 py-3 font-mono text-gray-300">
                        {shortenAddress(rec.borrower)}
                        {isOwn && <span className="ml-2 text-xs text-green-400">(you)</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-white text-xs font-semibold">{rec.issuerName || "—"}</div>
                        <div className="text-gray-500 text-xs font-mono">{shortenAddress(rec.issuerWallet)}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-white">
                        {formatAmount(rec.amount, rec.currency)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <CategoryBadge category={rec.category} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <RepaymentBadge onTime={rec.repaidOnTime} />
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400 text-xs">
                        {formatDate(rec.mintedAt)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">
                        {rec.evidenceNote || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-600 text-center">
        Records are self-reported by issuers. On-chain verification is trustless; issuer identity verification is a roadmap feature.
      </p>
    </div>
  );
}
