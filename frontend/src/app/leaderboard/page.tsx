"use client";

import { useQuery } from "@apollo/client";
import Link from "next/link";
import { GET_LEADERBOARD } from "@/lib/ponder";
import { getTierBg, shortenAddress } from "@/lib/utils";
import { ScoreGauge } from "@/components/score/ScoreGauge";

export default function LeaderboardPage() {
  const { data, loading } = useQuery(GET_LEADERBOARD);
  const items = data?.creditScores?.items || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
      <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
        {loading && <p className="text-gray-500 text-sm p-6">Loading...</p>}
        {items.map((item: any, i: number) => (
          <Link
            href={`/profile/${item.borrower}`}
            key={item.borrower}
            className="flex items-center gap-4 p-4 hover:bg-gray-800/50 transition-colors"
          >
            <span className="text-gray-500 font-mono w-8 text-center">
              #{i + 1}
            </span>
            <ScoreGauge score={item.totalScore} tier={item.tier} size="sm" />
            <div className="flex-1">
              <p className="font-mono text-sm text-white">
                {shortenAddress(item.borrower)}
              </p>
              <span
                className={`px-2 py-0.5 rounded-full border text-xs font-bold ${getTierBg(item.tier)}`}
              >
                {item.tier}
              </span>
            </div>
            <p className="text-xl font-bold text-white">{item.totalScore}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
