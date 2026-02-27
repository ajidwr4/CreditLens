"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLazyQuery } from "@apollo/client";
import { useAccount } from "wagmi";
import { GET_SCORE } from "@/lib/ponder";
import { ScoreGauge } from "@/components/score/ScoreGauge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type HistoryItem = {
  recordedAt: string;
  totalScore: number;
  onChainScore: number;
  realWorldScore: number;
};

export default function ScorePage() {
  const { address: connectedAddress } = useAccount(); // connected address from connector [web:46]

  const [inputAddress, setInputAddress] = useState("");
  // The address that was actually used for the latest lookup (keeps the label stable while typing)
  const [lastLookupAddress, setLastLookupAddress] = useState("");

  const [fetchScore, { data, loading, error }] = useLazyQuery(GET_SCORE);

  // Guard to avoid duplicate auto-lookups (e.g., React 18 Strict Mode in dev).
  const lastAutoLookupRef = useRef<string>("");

  useEffect(() => {
    // If disconnected, clear the field to "follow" connection state.
    if (!connectedAddress) {
      setInputAddress("");
      setLastLookupAddress("");
      lastAutoLookupRef.current = "";
      return;
    }

    const lower = connectedAddress.toLowerCase();

    // Always keep the input synced with the connected wallet.
    setInputAddress(lower);

    // Always auto-lookup when the connected wallet changes (only once per address).
    if (lastAutoLookupRef.current !== lower) {
      lastAutoLookupRef.current = lower;
      setLastLookupAddress(lower);
      fetchScore({ variables: { address: lower } });
    }
  }, [connectedAddress, fetchScore]); // runs on mount and whenever connectedAddress changes [web:31]

  function handleLookup(addr?: string) {
    const target = (addr ?? inputAddress).trim().toLowerCase();
    if (!target) return;

    setLastLookupAddress(target);
    fetchScore({ variables: { address: target } });
  }

  const score = data?.creditScore;
  const rawHistory: HistoryItem[] = data?.scoreHistorys?.items || [];

  const history = useMemo(() => {
    return [...rawHistory].sort((a, b) => {
      const ta = new Date(a.recordedAt).getTime();
      const tb = new Date(b.recordedAt).getTime();
      return ta - tb;
    });
  }, [rawHistory]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Credit Score Lookup</h1>

      {/* Search */}
      <div className="flex gap-2">
        <input
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
          placeholder="Connect wallet to auto-fill, or type address (0x...)"
          value={inputAddress}
          onChange={(e) => setInputAddress(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLookup()}
          // Select all text on focus so user can replace quickly. (Uses HTMLInputElement.select()) [web:24]
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          onClick={() => handleLookup()}
          className="bg-green-500 hover:bg-green-400 text-black font-semibold px-5 py-2.5 rounded-lg transition-colors"
          disabled={!inputAddress.trim() || loading}
        >
          Lookup
        </button>
      </div>

      {loading && (
        <p className="text-gray-400 text-center py-8">Loading score...</p>
      )}

      {error && !loading && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <p className="text-red-400 text-sm">Failed to fetch score.</p>
          <p className="text-gray-500 text-xs mt-2 font-mono break-all">
            {error.message}
          </p>
        </div>
      )}

      {score && (
        <div className="space-y-4">
          {/* Gauge */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 flex flex-col items-center">
            <ScoreGauge score={score.totalScore} tier={score.tier} />
            <p className="font-mono text-gray-400 text-sm mt-4 break-all text-center">
              {lastLookupAddress}
            </p>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">
                On-Chain Score
              </p>
              <p className="text-3xl font-bold text-blue-400">
                {score.onChainScore}
              </p>
              <p className="text-gray-500 text-xs mt-1">max 700</p>
              <div className="mt-3 h-1.5 bg-gray-800 rounded-full">
                <div
                  className="h-full bg-blue-400 rounded-full"
                  style={{ width: `${(score.onChainScore / 700) * 100}%` }}
                />
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">
                Real World Score
              </p>
              <p className="text-3xl font-bold text-purple-400">
                {score.realWorldScore}
              </p>
              <p className="text-gray-500 text-xs mt-1">max 300</p>
              <div className="mt-3 h-1.5 bg-gray-800 rounded-full">
                <div
                  className="h-full bg-purple-400 rounded-full"
                  style={{ width: `${(score.realWorldScore / 300) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* History Chart */}
          {history.length > 1 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">
                Score History
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={history}>
                  <XAxis dataKey="recordedAt" hide />
                  <YAxis
                    domain={[0, 1000]}
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#111827",
                      border: "1px solid #374151",
                      borderRadius: 8,
                    }}
                    labelStyle={{ display: "none" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalScore"
                    stroke="#4ade80"
                    strokeWidth={2}
                    dot={false}
                    name="Total Score"
                  />
                  <Line
                    type="monotone"
                    dataKey="onChainScore"
                    stroke="#60a5fa"
                    strokeWidth={1.5}
                    dot={false}
                    name="On-Chain"
                  />
                  <Line
                    type="monotone"
                    dataKey="realWorldScore"
                    stroke="#c084fc"
                    strokeWidth={1.5}
                    dot={false}
                    name="Real World"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {lastLookupAddress && !loading && !score && !error && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400">No score found for this address.</p>
          <p className="text-gray-600 text-sm mt-1">
            They may not have any lending activity yet.
          </p>
          <p className="text-gray-700 text-xs mt-3 font-mono break-all">
            {lastLookupAddress}
          </p>
        </div>
      )}
    </div>
  );
}
