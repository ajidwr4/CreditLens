// ═══════════════════════════════════════
// CREDIT SCORE CALCULATION LOGIC
// ═══════════════════════════════════════

export type ScoreInput = {
  totalLoans:            number;
  repaidOnTime:          number;
  repaidLate:            number;
  defaulted:             number;
  totalRealWorldRecords: number;
  realWorldOnTime:       number;
  realWorldLate:         number;
};

export type ScoreResult = {
  totalScore:      number;
  onChainScore:    number;
  realWorldScore:  number;
  tier:            string;
};

export function calculateScore(input: ScoreInput): ScoreResult {
  const {
    totalLoans,
    repaidOnTime,
    repaidLate,
    defaulted,
    totalRealWorldRecords,
    realWorldOnTime,
    realWorldLate,
  } = input;

  // ── ON-CHAIN SCORE (max 700) ──────────────────────────────────────

  let onChainScore = 0;

  if (totalLoans > 0) {
    // repayment ratio component (max 400)
    const repaymentRatio = repaidOnTime / totalLoans;
    const repaymentComponent = Math.round(repaymentRatio * 400);

    // loan count component — reward activity (max 150)
    const activityComponent = Math.min(totalLoans * 15, 150);

    // volume component — reward repaid volume (max 150)
    const volumeComponent = Math.min(repaidOnTime * 20, 150);

    // penalties
    const latePenalty    = repaidLate * 30;
    const defaultPenalty = defaulted  * 150;

    onChainScore = Math.max(
      0,
      repaymentComponent + activityComponent + volumeComponent
      - latePenalty - defaultPenalty
    );

    onChainScore = Math.min(onChainScore, 700);
  }

  // ── REAL WORLD SCORE (max 300) ────────────────────────────────────

  let realWorldScore = 0;

  if (totalRealWorldRecords > 0) {
    const onTimePoints = realWorldOnTime * 40;
    const latePoints   = realWorldLate   * 60; // penalty

    realWorldScore = Math.max(0, onTimePoints - latePoints);
    realWorldScore = Math.min(realWorldScore, 300);
  }

  // ── TOTAL SCORE ───────────────────────────────────────────────────

  const totalScore = onChainScore + realWorldScore;

  // ── TIER ──────────────────────────────────────────────────────────

  let tier: string;
  if      (totalScore >= 800) tier = "AAA";
  else if (totalScore >= 650) tier = "AA";
  else if (totalScore >= 500) tier = "A";
  else if (totalScore >= 300) tier = "B";
  else                        tier = "C";

  return { totalScore, onChainScore, realWorldScore, tier };
}
