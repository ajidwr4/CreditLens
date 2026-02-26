import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function getTierColor(tier: string) {
  switch (tier) {
    case "AAA":
      return "text-green-400";
    case "AA":
      return "text-blue-400";
    case "A":
      return "text-cyan-400";
    case "B":
      return "text-yellow-400";
    case "C":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
}

export function getTierBg(tier: string) {
  switch (tier) {
    case "AAA":
      return "bg-green-400/10 border-green-400/30 text-green-400";
    case "AA":
      return "bg-blue-400/10 border-blue-400/30 text-blue-400";
    case "A":
      return "bg-cyan-400/10 border-cyan-400/30 text-cyan-400";
    case "B":
      return "bg-yellow-400/10 border-yellow-400/30 text-yellow-400";
    case "C":
      return "bg-red-400/10 border-red-400/30 text-red-400";
    default:
      return "bg-gray-400/10 border-gray-400/30 text-gray-400";
  }
}

export function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatAmount(amount: string | bigint) {
  const num =
    typeof amount === "bigint" ? Number(amount) / 1e18 : Number(amount) / 1e18;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
    num,
  );
}
