import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPct(value: number) {
  return `${Math.round(value)}%`;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function ragColor(rag: string) {
  switch (rag) {
    case "Green":
      return "var(--rag-green)";
    case "Amber":
      return "var(--rag-amber)";
    case "Red":
      return "var(--rag-red)";
    default:
      return "var(--muted)";
  }
}

export function scorePipeline(item: {
  strategicAlignment: number;
  benefitValue: number;
  riskReduction: number;
  compliance: number;
  complexity: number;
}) {
  return (
    item.strategicAlignment * 0.3 +
    item.benefitValue * 0.25 +
    item.riskReduction * 0.15 +
    item.compliance * 0.15 -
    item.complexity * 0.15
  );
}

export function riskScore(p: number, i: number, v: number) {
  return p * i * v;
}
