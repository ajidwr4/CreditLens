import { createWalletClient, createPublicClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { ScoreResult, ScoreInput } from "./scorer";

const oracleAbi = parseAbi([
  "function updateScore(address borrower, uint256 totalScore, uint256 onChainScore, uint256 realWorldScore, string tier, uint256 totalLoans, uint256 repaidOnTime, uint256 repaidLate, uint256 defaulted, uint256 totalRealWorldRecords) external",
]);

const creditcoinChain = {
  id: 102031,
  name: "Creditcoin Testnet",
  nativeCurrency: { name: "CTC", symbol: "CTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] },
  },
} as const;

export async function pushScoreToOracle(
  borrower: `0x${string}`,
  score: ScoreResult,
  input: ScoreInput,
): Promise<void> {
  const privateKey = process.env.PONDER_PRIVATE_KEY;
  const oracleAddress = process.env.ORACLE_CONTRACT_ADDRESS;

  if (!privateKey || !oracleAddress) {
    console.log(`[pusher] skipping — PONDER_PRIVATE_KEY or ORACLE_CONTRACT_ADDRESS not set`);
    return;
  }

  try {
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const walletClient = createWalletClient({ account, chain: creditcoinChain, transport: http() });
    const publicClient = createPublicClient({ chain: creditcoinChain, transport: http() });

    const { request } = await publicClient.simulateContract({
      address: oracleAddress as `0x${string}`,
      abi: oracleAbi,
      functionName: "updateScore",
      args: [
        borrower,
        BigInt(score.totalScore),
        BigInt(score.onChainScore),
        BigInt(score.realWorldScore),
        score.tier,
        BigInt(input.totalLoans),
        BigInt(input.repaidOnTime),
        BigInt(input.repaidLate),
        BigInt(input.defaulted),
        BigInt(input.totalRealWorldRecords),
      ],
      account,
    });

    const hash = await walletClient.writeContract(request);
    console.log(`[pusher] score updated for ${borrower} — tx: ${hash}`);
  } catch (err) {
    console.error(`[pusher] failed to push score for ${borrower}:`, err);
  }
}
