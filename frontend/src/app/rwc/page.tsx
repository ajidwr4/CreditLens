"use client";

import { useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { REAL_WORLD_CREDIT_ADDRESS } from "@/lib/contracts";

const RWC_ABI = [
  {
    inputs: [
      { name: "borrower", type: "address" },
      { name: "onTimePayments", type: "uint256" },
      { name: "latePayments", type: "uint256" },
    ],
    name: "mintRecord",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export default function RWCPage() {
  const { address } = useAccount();
  const [borrower, setBorrower] = useState("");
  const [onTime, setOnTime] = useState("");
  const [late, setLate] = useState("");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  function handleMint() {
    if (!address || !borrower) return;
    writeContract({
      address: REAL_WORLD_CREDIT_ADDRESS,
      abi: RWC_ABI,
      functionName: "mintRecord",
      args: [borrower as `0x${string}`, BigInt(onTime || 0), BigInt(late || 0)],
    });
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Real World Credit</h1>
        <p className="text-gray-400 text-sm mt-1">
          Import off-chain credit history on-chain. Records are marked as
          self-reported.
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-white">Mint Credit Record</h3>

        <div>
          <label className="text-xs text-gray-400">Borrower Address</label>
          <input
            className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-green-500"
            placeholder="0x..."
            value={borrower}
            onChange={(e) => setBorrower(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400">On-Time Payments</label>
            <input
              className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
              placeholder="12"
              value={onTime}
              onChange={(e) => setOnTime(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Late Payments</label>
            <input
              className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
              placeholder="2"
              value={late}
              onChange={(e) => setLate(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3">
          <p className="text-yellow-400 text-xs">
            ⚠ Records are self-reported. Issuer verification is a roadmap
            feature.
          </p>
        </div>

        <button
          onClick={handleMint}
          disabled={!address || isPending || isConfirming || !borrower}
          className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold py-2.5 rounded-lg transition-colors"
        >
          {!address
            ? "Connect Wallet"
            : isPending
              ? "Confirming..."
              : isConfirming
                ? "Processing..."
                : "Mint Record"}
        </button>

        {isSuccess && (
          <p className="text-green-400 text-sm text-center">
            ✓ Record minted! Score will update when Ponder processes the event.
          </p>
        )}
      </div>
    </div>
  );
}
