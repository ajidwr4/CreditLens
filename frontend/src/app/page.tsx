"use client";

import { useQuery } from "@apollo/client";
import { GET_STATS, GET_LEADERBOARD } from "@/lib/ponder";
import { ScoreGauge } from "@/components/score/ScoreGauge";
import { getTierBg, shortenAddress, formatAmount } from "@/lib/utils";
import Link from "next/link";

export default function Dashboard() {
  const { data: stats } = useQuery(GET_STATS);
  const { data: lb } = useQuery(GET_LEADERBOARD);

  const deals = stats?.deals?.items || [];
  const totalVolume = deals.reduce(
    (acc: number, d: any) => acc + Number(d.amount || 0),
    0,
  );
  const activeDeals = deals.filter((d: any) => d.status === "ACTIVE").length;
  const leaderboard = lb?.creditScores?.items || [];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-white mb-3">
          Credit Without Collateral
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          CreditLens scores borrowers on Creditcoin using on-chain lending
          history and real-world credit records — no assets required.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <Link
            href="/score"
            className="bg-green-500 hover:bg-green-400 text-black font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            Check Score
          </Link>
          <Link
            href="/market"
            className="bg-gray-800 hover:bg-gray-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            Browse Market
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Loans", value: deals.length },
          { label: "Active Deals", value: activeDeals },
          {
            label: "Total Volume",
            value: `${formatAmount(totalVolume.toString())} tCTC`,
          },
          { label: "Scored Addresses", value: leaderboard.length },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5"
          >
            <p className="text-gray-400 text-sm">{stat.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Leaderboard */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Top Borrowers</h2>
        {leaderboard.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No scores yet. Ponder indexer may still be syncing.
          </p>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((item: any, i: number) => (
              <Link
                href={`/profile/${item.borrower}`}
                key={item.borrower}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 text-sm w-6">#{i + 1}</span>
                  <span className="font-mono text-sm text-gray-300">
                    {shortenAddress(item.borrower)}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full border text-xs font-bold ${getTierBg(item.tier)}`}
                  >
                    {item.tier}
                  </span>
                </div>
                <span className="font-bold text-white">{item.totalScore}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
