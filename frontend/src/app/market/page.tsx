"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther } from "viem";
import { GET_MARKET } from "@/lib/ponder";
import { LENDING_MARKET_ADDRESS, LENDING_MARKET_ABI } from "@/lib/contracts";
import { shortenAddress, formatAmount } from "@/lib/utils";

export default function MarketPage() {
  const { address } = useAccount();
  const [tab, setTab] = useState<"bids" | "asks">("bids");
  const [postType, setPostType] = useState<"bid" | "ask">("ask");
  const [amount, setAmount] = useState("");
  const [interest, setInterest] = useState("");
  const [duration, setDuration] = useState("");

  const { data, loading, refetch } = useQuery(GET_MARKET);
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const bids = data?.bidOrders?.items || [];
  const asks = data?.askOrders?.items || [];

  async function handlePost() {
    if (!address || !amount) return;
    if (postType === "ask") {
      writeContract({
        address: LENDING_MARKET_ADDRESS,
        abi: LENDING_MARKET_ABI,
        functionName: "postAsk",
        args: [parseEther(amount)],
      });
    } else {
      writeContract({
        address: LENDING_MARKET_ADDRESS,
        abi: LENDING_MARKET_ABI,
        functionName: "postBid",
        args: [
          parseEther(amount),
          BigInt(Number(interest) * 100),
          BigInt(Number(duration) * 86400),
        ],
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Lending Market</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Order list */}
        <div className="md:col-span-2 bg-gray-900 border border-gray-800 rounded-xl">
          <div className="flex border-b border-gray-800">
            {(["bids", "asks"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors ${tab === t ? "text-white border-b-2 border-green-500" : "text-gray-500 hover:text-gray-300"}`}
              >
                {t} ({t === "bids" ? bids.length : asks.length})
              </button>
            ))}
          </div>
          <div className="divide-y divide-gray-800">
            {loading && <p className="text-gray-500 text-sm p-6">Loading...</p>}
            {(tab === "bids" ? bids : asks).map((order: any) => (
              <div
                key={order.id}
                className="p-4 flex items-center justify-between hover:bg-gray-800/50"
              >
                <div>
                  <p className="font-mono text-sm text-gray-300">
                    {shortenAddress(order.lender || order.borrower)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {tab === "bids"
                      ? `${order.interestRate / 100}% · ${order.duration / 86400}d`
                      : "Seeking funds"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-white">
                    {formatAmount(order.amount)} tCTC
                  </p>
                </div>
              </div>
            ))}
            {!loading && (tab === "bids" ? bids : asks).length === 0 && (
              <p className="text-gray-500 text-sm p-6">No open orders.</p>
            )}
          </div>
        </div>

        {/* Post order form */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4 h-fit">
          <h3 className="font-semibold text-white">Post Order</h3>
          <div className="flex gap-2">
            {(["ask", "bid"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setPostType(t)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-semibold capitalize transition-colors ${postType === t ? "bg-green-500 text-black" : "bg-gray-800 text-gray-400"}`}
              >
                {t === "ask" ? "Borrow" : "Lend"}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400">Amount (tCTC)</label>
              <input
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                placeholder="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            {postType === "bid" && (
              <>
                <div>
                  <label className="text-xs text-gray-400">
                    Interest Rate (%)
                  </label>
                  <input
                    className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                    placeholder="5"
                    value={interest}
                    onChange={(e) => setInterest(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">
                    Duration (days)
                  </label>
                  <input
                    className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                    placeholder="30"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <button
            onClick={handlePost}
            disabled={!address || isPending || isConfirming}
            className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold py-2.5 rounded-lg transition-colors"
          >
            {!address
              ? "Connect Wallet"
              : isPending
                ? "Confirming..."
                : isConfirming
                  ? "Processing..."
                  : `Post ${postType === "ask" ? "Borrow Request" : "Lend Offer"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
