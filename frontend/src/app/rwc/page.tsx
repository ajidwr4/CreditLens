'use client'

import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { REAL_WORLD_CREDIT_ADDRESS, REAL_WORLD_CREDIT_ABI } from '@/lib/contracts'

export default function RWCPage() {
  const { address } = useAccount()
  const [borrower, setBorrower] = useState('')
  const [issuerName, setIssuerName] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [category, setCategory] = useState('personal')
  const [repaidOnTime, setRepaidOnTime] = useState(true)
  const [evidenceNote, setEvidenceNote] = useState('')

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  function handleMint() {
    if (!address || !borrower || !issuerName || !amount) return
    writeContract({
      address: REAL_WORLD_CREDIT_ADDRESS,
      abi: REAL_WORLD_CREDIT_ABI,
      functionName: 'mintRecord',
      args: [
        borrower as `0x${string}`,
        issuerName,
        BigInt(amount),
        currency,
        category,
        repaidOnTime,
        evidenceNote,
      ],
    })
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Real World Credit</h1>
        <p className="text-gray-400 text-sm mt-1">
          Import off-chain credit history on-chain. Records are marked as self-reported.
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
            onChange={e => setBorrower(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs text-gray-400">Issuer Name</label>
          <input
            className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
            placeholder="Koperasi Sejahtera"
            value={issuerName}
            onChange={e => setIssuerName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400">Amount</label>
            <input
              className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
              placeholder="1000000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Currency</label>
            <input
              className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
              placeholder="USD"
              value={currency}
              onChange={e => setCurrency(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400">Category</label>
          <select
            className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            <option value="personal">Personal</option>
            <option value="business">Business</option>
            <option value="mortgage">Mortgage</option>
            <option value="education">Education</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-400">Repayment Status</label>
          <div className="flex gap-3 mt-1">
            <button
              onClick={() => setRepaidOnTime(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${repaidOnTime ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-400'}`}
            >
              ✓ On Time
            </button>
            <button
              onClick={() => setRepaidOnTime(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${!repaidOnTime ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-400'}`}
            >
              ✗ Late
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400">Evidence Note (opsional)</label>
          <input
            className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
            placeholder="Loan ref #12345"
            value={evidenceNote}
            onChange={e => setEvidenceNote(e.target.value)}
          />
        </div>

        <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3">
          <p className="text-yellow-400 text-xs">⚠ Records are self-reported. Issuer verification is a roadmap feature.</p>
        </div>

        <button
          onClick={handleMint}
          disabled={!address || isPending || isConfirming || !borrower || !issuerName || !amount}
          className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold py-2.5 rounded-lg transition-colors"
        >
          {!address ? 'Connect Wallet' : isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Mint Record'}
        </button>

        {isSuccess && (
          <p className="text-green-400 text-sm text-center">
            ✓ Record minted! Score will update when Ponder processes the event.
          </p>
        )}
      </div>
    </div>
  )
}