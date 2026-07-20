/** Advanced PMO analytics engines — Streamlit parity + SaaS enhancements. */

export function computeEvm(input: {
  funding: number;
  spend: number;
  forecast: number;
  progress: number;
  pv?: number;
  ev?: number;
}) {
  const bac = input.funding || 0;
  const ac = input.spend || 0;
  const pv = input.pv ?? bac * Math.min(1, Math.max(0, input.progress / 100));
  const ev = input.ev ?? bac * Math.min(1, Math.max(0, input.progress / 100));
  const cpi = ac > 0 ? ev / ac : 1;
  const spi = pv > 0 ? ev / pv : 1;
  const eac = cpi > 0 ? bac / cpi : input.forecast || bac;
  const etc = Math.max(0, eac - ac);
  const vac = bac - eac;
  return {
    bac,
    ac,
    pv,
    ev,
    cpi: Math.round(cpi * 100) / 100,
    spi: Math.round(spi * 100) / 100,
    eac: Math.round(eac),
    etc: Math.round(etc),
    vac: Math.round(vac),
  };
}

const VELOCITY_FACTOR: Record<string, number> = {
  Slow: 1.0,
  Medium: 1.3,
  Fast: 1.6,
  "1": 1.0,
  "2": 1.15,
  "3": 1.3,
  "4": 1.45,
  "5": 1.6,
};

export function riskScoreAdvanced(probability: number, impact: number, velocity: number | string = 2) {
  const v =
    typeof velocity === "number"
      ? VELOCITY_FACTOR[String(velocity)] || 1 + velocity * 0.15
      : VELOCITY_FACTOR[velocity] || 1.3;
  return Math.round(probability * impact * v * 10) / 10;
}

export function escalateRisk(score: number) {
  return score >= 25;
}

/** Simple Monte-Carlo cost outcomes around forecast. */
export function monteCarloCosts(
  projects: { funding: number; forecast: number; spend: number }[],
  samples = 800
) {
  const outcomes: number[] = [];
  for (let i = 0; i < samples; i++) {
    let total = 0;
    for (const p of projects) {
      const base = p.forecast || p.funding || p.spend || 0;
      const shock = 1 + (Math.random() - 0.45) * 0.35;
      total += base * shock;
    }
    outcomes.push(Math.round(total));
  }
  outcomes.sort((a, b) => a - b);
  const p50 = outcomes[Math.floor(samples * 0.5)] || 0;
  const p80 = outcomes[Math.floor(samples * 0.8)] || 0;
  const p95 = outcomes[Math.floor(samples * 0.95)] || 0;
  return { outcomes, p50, p80, p95 };
}

export function segmentSummary(
  projects: {
    portfolioCategory?: string | null;
    funding: number;
    spend: number;
    benefitsTarget: number;
    rag: string;
  }[]
) {
  const map = new Map<
    string,
    {
      seg: string;
      count: number;
      funding: number;
      spend: number;
      remaining: number;
      benefits: number;
      green: number;
      amber: number;
      red: number;
    }
  >();
  for (const p of projects) {
    const seg = p.portfolioCategory || "Unassigned";
    const cur = map.get(seg) || {
      seg,
      count: 0,
      funding: 0,
      spend: 0,
      remaining: 0,
      benefits: 0,
      green: 0,
      amber: 0,
      red: 0,
    };
    cur.count += 1;
    cur.funding += p.funding;
    cur.spend += p.spend;
    cur.remaining = cur.funding - cur.spend;
    cur.benefits += p.benefitsTarget;
    if (p.rag === "Green") cur.green += 1;
    else if (p.rag === "Amber") cur.amber += 1;
    else cur.red += 1;
    map.set(seg, cur);
  }
  return [...map.values()].sort((a, b) => b.funding - a.funding);
}

export function kpiTrends(
  months: { month: string; actual: number; forecast: number }[],
  key: "actual" | "forecast" = "actual"
) {
  return months.map((m) => m[key]);
}

export function resourceHeatmap(
  resources: { name: string; month: string | null; allocationPct: number }[]
) {
  const names = [...new Set(resources.map((r) => r.name))].sort();
  const months = [...new Set(resources.map((r) => r.month || "Unassigned"))];
  const monthOrder = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  months.sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
  const z = names.map((name) =>
    months.map((month) =>
      resources
        .filter((r) => r.name === name && (r.month || "Unassigned") === month)
        .reduce((s, r) => s + r.allocationPct, 0)
    )
  );
  return { names, months, z };
}

export function dependencyTopoOrder(
  deps: { fromName: string; toName: string }[],
  projects: { name: string; startDate?: Date | string | null }[]
) {
  const nodes = new Set<string>();
  for (const p of projects) nodes.add(p.name);
  for (const d of deps) {
    nodes.add(d.fromName);
    nodes.add(d.toName);
  }
  const succ = new Map<string, Set<string>>();
  const indeg = new Map<string, number>();
  for (const n of nodes) {
    succ.set(n, new Set());
    indeg.set(n, 0);
  }
  for (const d of deps) {
    if (!nodes.has(d.fromName) || !nodes.has(d.toName)) continue;
    if (!succ.get(d.fromName)!.has(d.toName)) {
      succ.get(d.fromName)!.add(d.toName);
      indeg.set(d.toName, (indeg.get(d.toName) || 0) + 1);
    }
  }
  const startMap = new Map(
    projects.map((p) => [p.name, p.startDate ? new Date(p.startDate).getTime() : Number.MAX_SAFE_INTEGER])
  );
  const ready = [...nodes].filter((n) => (indeg.get(n) || 0) === 0);
  ready.sort((a, b) => (startMap.get(a) || 0) - (startMap.get(b) || 0));
  const order: string[] = [];
  while (ready.length) {
    const n = ready.shift()!;
    order.push(n);
    for (const m of succ.get(n) || []) {
      indeg.set(m, (indeg.get(m) || 0) - 1);
      if ((indeg.get(m) || 0) === 0) {
        ready.push(m);
        ready.sort((a, b) => (startMap.get(a) || 0) - (startMap.get(b) || 0));
      }
    }
  }
  for (const n of nodes) if (!order.includes(n)) order.push(n);
  return order;
}

export function costBenefitByYear(
  rows: {
    year: number;
    capex: number;
    opex: number;
    benefitRecurring: number;
    benefitOneOff: number;
  }[]
) {
  const years = [...new Set(rows.map((r) => r.year))].sort();
  return years.map((year) => {
    const subset = rows.filter((r) => r.year === year);
    const cost = subset.reduce((s, r) => s + r.capex + r.opex, 0);
    const benefit = subset.reduce((s, r) => s + r.benefitRecurring + r.benefitOneOff, 0);
    return { year, cost, benefit, net: benefit - cost };
  });
}

export function weightedPriorityScore(input: {
  strategicAlignment: number;
  benefitValue: number;
  riskReduction: number;
  compliance: number;
  complexity: number;
}) {
  return (
    Math.round(
      (input.strategicAlignment * 0.3 +
        input.benefitValue * 0.25 +
        input.riskReduction * 0.2 +
        input.compliance * 0.15 -
        input.complexity * 0.1) *
        100
    ) / 100
  );
}

export function phaseHealth(plannedEnd?: Date | string | null, actualEnd?: Date | string | null, status?: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pe = plannedEnd ? new Date(plannedEnd) : null;
  const ae = actualEnd ? new Date(actualEnd) : null;
  const st = (status || "").toLowerCase();
  if (["complete", "closed", "done"].includes(st)) {
    if (pe && ae) {
      const delta = (ae.getTime() - pe.getTime()) / 86400000;
      if (delta <= 0) return "Green";
      if (delta <= 14) return "Amber";
      return "Red";
    }
    return "Green";
  }
  if (!pe) return "Amber";
  if (today > pe) return "Red";
  if ((pe.getTime() - today.getTime()) / 86400000 <= 14) return "Amber";
  return "Green";
}
