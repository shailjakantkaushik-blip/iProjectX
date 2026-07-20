/** Port of PMO_ENTERPRISE_TOOL/utils/portfolio_engine.py for the Executive Cockpit. */

export type Rag = "Green" | "Amber" | "Red";

export type ProjectLike = {
  id: string;
  project_code?: string | null;
  name: string;
  program?: string | null;
  sponsor?: string | null;
  priority?: string | null;
  status?: string | null;
  rag?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  target_go_live?: string | null;
  budget?: number | null;
  capex_approved?: number | null;
  capex_incurred?: number | null;
  opex_approved?: number | null;
  opex_incurred?: number | null;
  benefits_target?: number | null;
  benefits_realised?: number | null;
};

export const PORTFOLIO_CATEGORIES = [
  "Business Strategic",
  "IT Strategic",
  "CAPEX",
  "Unfunded",
] as const;

const GOV_CHANNEL_A_THRESHOLD = 200_000;

export function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export function fmtMoney(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${Math.round(v).toLocaleString("en-US")}`;
}

export function portfolioCategory(p: ProjectLike): string {
  const prog = (p.program || "").trim();
  if ((PORTFOLIO_CATEGORIES as readonly string[]).includes(prog)) return prog;
  const budget = n(p.budget);
  if (budget <= 0) return "Unfunded";
  if (budget >= 1_000_000) return "CAPEX";
  const pri = (p.priority || "").toLowerCase();
  if (pri === "critical" || pri === "high") return "Business Strategic";
  return "IT Strategic";
}

export function deriveChannel(approvedFunding: number): string {
  return approvedFunding > 0 && approvedFunding < GOV_CHANNEL_A_THRESHOLD
    ? "Channel A (<$200K)"
    : "Channel B (>$200K)";
}

export function progressPct(p: ProjectLike): number {
  const status = (p.status || "").toLowerCase();
  if (status === "completed") return 100;
  if (status === "not started" || status === "cancelled") return 0;
  if (!p.start_date || !p.end_date) {
    if (status === "in progress") return 40;
    if (status === "on hold") return 25;
    return 0;
  }
  const start = new Date(p.start_date).getTime();
  const end = new Date(p.end_date).getTime();
  const today = Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  const pct = ((today - start) / (end - start)) * 100;
  return Math.max(0, Math.min(99, Math.round(pct)));
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export type ProjectHealth = {
  id: string;
  projectId: string;
  projectName: string;
  portfolioCategory: string;
  governanceChannel: string;
  sponsor: string;
  deliveryLead: string;
  progress: number;
  scheduleHealth: Rag;
  financialHealth: Rag;
  deliveryHealth: Rag;
  benefitHealth: Rag;
  overallRag: Rag;
};

function worstRag(...rags: Rag[]): Rag {
  const order: Record<Rag, number> = { Green: 0, Amber: 1, Red: 2 };
  return rags.reduce((a, b) => (order[b] > order[a] ? b : a), "Green" as Rag);
}

export function computeProjectHealth(projects: ProjectLike[]): ProjectHealth[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return projects.map((p) => {
    const approved = n(p.budget) || n(p.capex_approved) + n(p.opex_approved);
    const actual = n(p.capex_incurred) + n(p.opex_incurred);
    const forecast = Math.max(approved, actual) * (actual > approved ? 1.05 : 1);
    const progress = progressPct(p);
    const benefitsF = n(p.benefits_target);
    const benefitsR = n(p.benefits_realised);

    let scheduleHealth: Rag = "Green";
    if (p.start_date && p.end_date) {
      const start = new Date(p.start_date);
      const end = new Date(p.end_date);
      const duration = Math.max(1, daysBetween(start, end));
      const elapsed = Math.max(0, daysBetween(start, today));
      const schedVar = progress / 100 - elapsed / duration;
      if (schedVar < -0.1) scheduleHealth = "Red";
      else if (schedVar < -0.05) scheduleHealth = "Amber";
    } else if ((p.rag || "") === "Red") scheduleHealth = "Red";
    else if ((p.rag || "") === "Amber") scheduleHealth = "Amber";

    let financialHealth: Rag = "Green";
    if (approved > 0) {
      const finVar = (forecast - approved) / approved;
      if (finVar > 0.1) financialHealth = "Red";
      else if (finVar > 0.05) financialHealth = "Amber";
    }

    let benefitHealth: Rag = "Green";
    if (benefitsF > 0) {
      const rate = benefitsR / benefitsF;
      if (rate < 0.3) benefitHealth = "Red";
      else if (rate < 0.7) benefitHealth = "Amber";
    } else if (benefitsF === 0 && benefitsR === 0) {
      benefitHealth = "Amber";
    }

    const deliveryHealth = ((p.rag as Rag) || "Green") as Rag;
    const overallRag = worstRag(scheduleHealth, financialHealth, deliveryHealth, benefitHealth);

    return {
      id: p.id,
      projectId: p.project_code || p.id.slice(0, 8).toUpperCase(),
      projectName: p.name,
      portfolioCategory: portfolioCategory(p),
      governanceChannel: deriveChannel(approved),
      sponsor: p.sponsor || "—",
      deliveryLead: p.sponsor || "—",
      progress,
      scheduleHealth,
      financialHealth,
      deliveryHealth,
      benefitHealth,
      overallRag,
    };
  });
}

export type ExecKpis = {
  totalPortfolioValue: number;
  totalCapexBudget: number;
  totalOpexBudget: number;
  approvedFunding: number;
  actualSpend: number;
  remainingBudget: number;
  forecastAtCompletion: number;
  projectsOnTrackPct: number;
  projectsAtRiskPct: number;
  projectsDelayedPct: number;
  totalPortfolioProjects: number;
  totalActivePrograms: number;
  totalInitiativesInPipeline: number;
  benefitsForecast: number;
  benefitsRealised: number;
  decisionsAwaiting: number;
  averageActions: number;
  upcomingStageGates: number;
};

export function executiveKpis(projects: ProjectLike[]): ExecKpis {
  const total = projects.length;
  const approved = projects.reduce((s, p) => s + (n(p.budget) || n(p.capex_approved) + n(p.opex_approved)), 0);
  const capex = projects.reduce((s, p) => s + n(p.capex_approved), 0);
  const opex = projects.reduce((s, p) => s + n(p.opex_approved), 0);
  const actual = projects.reduce((s, p) => s + n(p.capex_incurred) + n(p.opex_incurred), 0);
  const forecast = projects.reduce((s, p) => {
    const a = n(p.budget) || n(p.capex_approved) + n(p.opex_approved);
    const spent = n(p.capex_incurred) + n(p.opex_incurred);
    return s + Math.max(a, spent || a);
  }, 0);

  const green = projects.filter((p) => p.rag === "Green").length;
  const amber = projects.filter((p) => p.rag === "Amber").length;
  const red = projects.filter((p) => p.rag === "Red").length;

  const programs = new Set(
    projects.map((p) => (p.program || "").trim()).filter((x) => x && x !== "Unfunded"),
  );
  const pipeline = projects.filter((p) => {
    const s = (p.status || "").toLowerCase();
    return s === "not started" || s === "on hold";
  }).length;

  const benefitsForecast = projects.reduce((s, p) => s + n(p.benefits_target), 0);
  const benefitsRealised = projects.reduce((s, p) => s + n(p.benefits_realised), 0);

  const today = new Date();
  const upcomingGates = projects.filter((p) => {
    if (!p.target_go_live && !p.end_date) return false;
    const d = new Date(p.target_go_live || p.end_date || "");
    if (!Number.isFinite(d.getTime())) return false;
    const diff = daysBetween(today, d);
    return diff >= 0 && diff <= 30;
  }).length;

  return {
    totalPortfolioValue: approved,
    totalCapexBudget: capex,
    totalOpexBudget: opex,
    approvedFunding: approved,
    actualSpend: actual,
    remainingBudget: approved - actual,
    forecastAtCompletion: forecast || capex,
    projectsOnTrackPct: total ? Math.round((1000 * green) / total) / 10 : 0,
    projectsAtRiskPct: total ? Math.round((1000 * amber) / total) / 10 : 0,
    projectsDelayedPct: total ? Math.round((1000 * red) / total) / 10 : 0,
    totalPortfolioProjects: total,
    totalActivePrograms: programs.size,
    totalInitiativesInPipeline: pipeline,
    benefitsForecast,
    benefitsRealised,
    decisionsAwaiting: Math.min(1, Math.floor(total / 10) || (total ? 1 : 0)),
    averageActions: 0,
    upcomingStageGates: upcomingGates || Math.min(5, total),
  };
}

export type SegmentRow = {
  portfolio: string;
  initiatives: number;
  approvedFunding: number;
  actualSpend: number;
  remaining: number;
  benefitsForecast: number;
  green: number;
  amber: number;
  red: number;
};

export function segmentSummary(projects: ProjectLike[]): SegmentRow[] {
  const rows: SegmentRow[] = [];
  for (const label of PORTFOLIO_CATEGORIES) {
    const subset = projects.filter((p) => portfolioCategory(p) === label);
    const approved = subset.reduce((s, p) => s + (n(p.budget) || n(p.capex_approved) + n(p.opex_approved)), 0);
    const actual = subset.reduce((s, p) => s + n(p.capex_incurred) + n(p.opex_incurred), 0);
    rows.push({
      portfolio: label,
      initiatives: subset.length,
      approvedFunding: approved,
      actualSpend: actual,
      remaining: approved - actual,
      benefitsForecast: subset.reduce((s, p) => s + n(p.benefits_target), 0),
      green: subset.filter((p) => p.rag === "Green").length,
      amber: subset.filter((p) => p.rag === "Amber").length,
      red: subset.filter((p) => p.rag === "Red").length,
    });
  }
  const approved = projects.reduce((s, p) => s + (n(p.budget) || n(p.capex_approved) + n(p.opex_approved)), 0);
  const actual = projects.reduce((s, p) => s + n(p.capex_incurred) + n(p.opex_incurred), 0);
  rows.push({
    portfolio: "All Portfolios",
    initiatives: projects.length,
    approvedFunding: approved,
    actualSpend: actual,
    remaining: approved - actual,
    benefitsForecast: projects.reduce((s, p) => s + n(p.benefits_target), 0),
    green: projects.filter((p) => p.rag === "Green").length,
    amber: projects.filter((p) => p.rag === "Amber").length,
    red: projects.filter((p) => p.rag === "Red").length,
  });
  return rows;
}

/** Map project dates into FY labels like FY27 (calendar year of end/start). */
export function fyKeyFromDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  // Australian-style FY: Jul–Jun → FY of ending calendar year
  const year = d.getMonth() >= 6 ? d.getFullYear() + 1 : d.getFullYear();
  return `FY${String(year).slice(-2)}`;
}

export type FyTotals = { fy: string; budget: number; forecast: number };

export function budgetForecastByFy(projects: ProjectLike[]): {
  series: FyTotals[];
  allocatedProjects: number;
  coveragePct: number;
} {
  const map = new Map<string, FyTotals>();
  let allocated = 0;
  for (const p of projects) {
    const fy = fyKeyFromDate(p.end_date) || fyKeyFromDate(p.start_date) || fyKeyFromDate(p.target_go_live);
    if (!fy) continue;
    allocated += 1;
    const budget = n(p.budget) || n(p.capex_approved) + n(p.opex_approved);
    const forecast = Math.max(budget, n(p.capex_approved) * 1.05 || budget);
    const cur = map.get(fy) || { fy, budget: 0, forecast: 0 };
    cur.budget += budget;
    cur.forecast += forecast;
    map.set(fy, cur);
  }
  const series = Array.from(map.values()).sort((a, b) => a.fy.localeCompare(b.fy));
  return {
    series,
    allocatedProjects: allocated,
    coveragePct: projects.length ? Math.round((100 * allocated) / projects.length) : 0,
  };
}
