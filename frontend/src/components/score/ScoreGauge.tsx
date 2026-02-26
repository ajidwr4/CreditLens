"use client";

import { getTierColor, getTierBg } from "@/lib/utils";

interface ScoreGaugeProps {
  score: number;
  tier: string;
  size?: "sm" | "lg";
}

export function ScoreGauge({ score, tier, size = "lg" }: ScoreGaugeProps) {
  const pct = score / 1000;
  const radius = size === "lg" ? 90 : 60;
  const stroke = size === "lg" ? 12 : 8;
  const circumference = Math.PI * radius; // semicircle
  const offset = circumference * (1 - pct);
  const dim = (radius + stroke) * 2;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        width={dim}
        height={radius + stroke + 20}
        viewBox={`0 0 ${dim} ${radius + stroke + 20}`}
      >
        {/* Track */}
        <path
          d={`M ${stroke} ${radius + stroke} A ${radius} ${radius} 0 0 1 ${dim - stroke} ${radius + stroke}`}
          fill="none"
          stroke="#1f2937"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Progress */}
        <path
          d={`M ${stroke} ${radius + stroke} A ${radius} ${radius} 0 0 1 ${dim - stroke} ${radius + stroke}`}
          fill="none"
          stroke={
            tier === "AAA"
              ? "#4ade80"
              : tier === "AA"
                ? "#60a5fa"
                : tier === "A"
                  ? "#22d3ee"
                  : tier === "B"
                    ? "#facc15"
                    : "#f87171"
          }
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        {/* Score text */}
        <text
          x={dim / 2}
          y={radius + stroke - 10}
          textAnchor="middle"
          fill="white"
          fontSize={size === "lg" ? 36 : 24}
          fontWeight="bold"
        >
          {score}
        </text>
        <text
          x={dim / 2}
          y={radius + stroke + 12}
          textAnchor="middle"
          fill="#9ca3af"
          fontSize={12}
        >
          / 1000
        </text>
      </svg>
      <span
        className={`px-3 py-1 rounded-full border text-sm font-bold ${getTierBg(tier)}`}
      >
        {tier}
      </span>
    </div>
  );
}
