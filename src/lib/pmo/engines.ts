/** Portfolio KPI + health engines — parity with legacy Streamlit kpi_engine / portfolio_engine. */

export type ProjectLike = {
  id: string;
  code: string;
  name: string;
  status: string;
  rag: string;
  progress: number;
  funding: number;
  spend: number;
  forecast: number;
  benefitsTarget: number;
  benefitsRealised: number;
  theme?: string | null;
  priority?: string | null;
  portfolioCategory?: string | null;
  businessUnit?: string | null;
  programId?: string | null;
  governanceChannel?: string | null;
  financialYear?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
};

export type RiskLike = {
  likelihood: number;
  impact: number;
  status: string;
};

function toDate(v: Date | string | null | undefined) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function computeKpis(projects: Array<Partial<ProjectLike> & { status?: string; rag?: string; progress?: number; funding?: number; spend?: number; forecast?: number; benefitsTarget?: number; benefitsRealised?: number; endDate?: Date | string | null }>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const funding = projects.reduce((s, p) => s + (p.funding || 0), 0);
  const spend = projects.reduce((s, p) => s + (p.spend || 0), 0);
  const forecast = projects.reduce((s, p) => s + (p.forecast || 0), 0);
  const benefitsTarget = projects.reduce((s, p) => s + (p.benefitsTarget || 0), 0);
  const benefitsRealised = projects.reduce((s, p) => s + (p.benefitsRealised || 0), 0);
  const active = projects.filter((p) => p.status === "Active").length;
  const completed = projects.filter((p) => p.status === "Completed").length;
  const overdue = projects.filter((p) => {
    const end = toDate(p.endDate);
    return end && end < today && p.status !== "Completed";
  }).length;

  const ragMap: Record<string, number> = { Green: 4, Amber: 2.5, Red: 1 };
  const ragScore =
    projects.length > 0
      ? projects.reduce((s, p) => s + (ragMap[p.rag || ""] || 0), 0) / projects.length
      : 0;

  const avgProgress =
    projects.length > 0
      ? projects.reduce((s, p) => s + (p.progress || 0), 0) / projects.length
      : 0;

  return {
    capexApproved: funding,
    costIncurred: spend,
    forecast,
    remaining: funding - spend,
    active,
    completed,
    overdue,
    total: projects.length,
    avgRag: Math.round(ragScore * 10) / 10,
    avgProgress,
    benefitsTarget,
    benefitsRealised,
    benefitRate: benefitsTarget > 0 ? benefitsRealised / benefitsTarget : 0,
    pipelinePressure: forecast - funding,
  };
}

export function ragDistribution(projects: Array<{ rag?: string | null }>) {
  return ["Green", "Amber", "Red"].map((name) => ({
    name,
    value: projects.filter((p) => p.rag === name).length,
  }));
}

export function byField<T extends Record<string, unknown>>(projects: T[], field: keyof T) {
  const map = new Map<string, number>();
  for (const p of projects) {
    const key = String(p[field] || "Unassigned");
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function fundingByField<T extends { funding?: number } & Record<string, unknown>>(
  projects: T[],
  field: keyof T
) {
  const map = new Map<string, number>();
  for (const p of projects) {
    const key = String(p[field] || "Unassigned");
    map.set(key, (map.get(key) || 0) + (p.funding || 0));
  }
  return [...map.entries()]
    .map(([category, funding]) => ({ category, funding }))
    .sort((a, b) => b.funding - a.funding);
}

export type ProjectHealth = {
  id: string;
  code: string;
  name: string;
  status: string;
  rag: string;
  progress: number;
  funding: number;
  spend: number;
  forecast: number;
  benefitsTarget: number;
  benefitsRealised: number;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  scheduleHealth: string;
  financialHealth: string;
  benefitHealth: string;
  deliveryHealth: string;
  overallHealth: string;
};

function worstRag(...rags: string[]) {
  if (rags.includes("Red")) return "Red";
  if (rags.includes("Amber")) return "Amber";
  return "Green";
}

export function computeProjectHealth(
  projects: Array<
    Partial<ProjectLike> & {
      id: string;
      code: string;
      name: string;
      status: string;
      rag: string;
      progress: number;
      funding: number;
      spend: number;
      forecast: number;
      benefitsTarget: number;
      benefitsRealised: number;
      startDate?: Date | string | null;
      endDate?: Date | string | null;
    }
  >
): ProjectHealth[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return projects.map((p) => {
    const start = toDate(p.startDate);
    const end = toDate(p.endDate);
    let scheduleHealth = p.rag || "Green";
    if (start && end) {
      const duration = Math.max(1, (end.getTime() - start.getTime()) / 86400000);
      const elapsed = Math.max(0, (today.getTime() - start.getTime()) / 86400000);
      const schedVar = p.progress / 100 - elapsed / duration;
      scheduleHealth = schedVar >= -0.05 ? "Green" : schedVar >= -0.1 ? "Amber" : "Red";
    }

    const finVar = p.funding > 0 ? (p.forecast - p.funding) / p.funding : 0;
    const financialHealth = finVar <= 0.05 ? "Green" : finVar <= 0.1 ? "Amber" : "Red";

    const realRate = p.benefitsTarget > 0 ? p.benefitsRealised / p.benefitsTarget : 0;
    const benefitHealth = realRate >= 0.7 ? "Green" : realRate >= 0.3 ? "Amber" : "Red";

    const deliveryHealth = p.rag || "Green";
    const overallHealth = worstRag(
      scheduleHealth,
      financialHealth,
      benefitHealth,
      deliveryHealth
    );

    return {
      ...p,
      scheduleHealth,
      financialHealth,
      benefitHealth,
      deliveryHealth,
      overallHealth,
    };
  });
}

export function filterByFy<T extends { financialYear?: string | null }>(
  projects: T[],
  fy: string | null | undefined
) {
  if (!fy || fy === "All") return projects;
  return projects.filter((p) => !p.financialYear || p.financialYear === fy);
}

export function riskScore(r: RiskLike) {
  return (r.likelihood || 1) * (r.impact || 1);
}

export function channelForFunding(funding: number) {
  return funding < 200_000 ? "Channel A" : "Channel B";
}

export function costBenefitSummary(
  projects: Array<{ funding?: number; benefitsTarget?: number; benefitsRealised?: number }>
) {
  const cost = projects.reduce((s, p) => s + (p.funding || 0), 0);
  const benefit = projects.reduce((s, p) => s + (p.benefitsTarget || 0), 0);
  const realised = projects.reduce((s, p) => s + (p.benefitsRealised || 0), 0);
  const net = benefit - cost;
  const roi = cost > 0 ? net / cost : 0;
  const bcr = cost > 0 ? benefit / cost : 0;
  return { cost, benefit, realised, net, roi, bcr };
}

/** Alias used by FY query-string pages (`?fy=`). */
export function parseFyFilter(fy?: string | null) {
  if (!fy || fy === "All") return null;
  return fy;
}

export function fyTagOptions(fromYears: (string | null | undefined)[] = []) {
  const years = [...new Set(fromYears.filter(Boolean) as string[])].sort();
  if (years.length) return years;
  return ["FY24", "FY25", "FY26", "FY27"];
}

const PRIORITY_WEIGHT: Record<string, number> = {
  Critical: 5,
  High: 4,
  Medium: 3,
  Low: 2,
};

/** Heuristic project ranking when a dedicated prioritisation sheet is absent. */
export function priorityScore(input: {
  priority?: string | null;
  strategicAlignment?: number | null;
  openRiskCount?: number;
  benefitValue?: number;
  budget?: number;
}) {
  const p = PRIORITY_WEIGHT[input.priority || ""] || 3;
  const align = Number(input.strategicAlignment || 3);
  const riskPenalty = Math.min(2, (input.openRiskCount || 0) * 0.25);
  const benefitBoost = Math.min(2, Math.log10(Math.max(1, input.benefitValue || 0) + 1));
  const budgetSignal = Math.min(1.5, Math.log10(Math.max(1, input.budget || 0) + 1) * 0.4);
  return Math.round((p * 1.2 + align * 0.8 + benefitBoost + budgetSignal - riskPenalty) * 10) / 10;
}

export function groupCount<T>(items: T[], keyFn: (item: T) => string) {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = keyFn(item) || "Unassigned";
    map.set(k, (map.get(k) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}
