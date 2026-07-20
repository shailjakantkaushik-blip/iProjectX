import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { CHANNEL_A_STAGES, CHANNEL_B_STAGES, useDomainData } from "@/lib/domain";
import { deriveChannel, portfolioCategory } from "@/lib/portfolio-engine";
import {
  EmptyState, KpiCard, PageHeading, PageSkeleton, SectionFrame, SectionTitle,
} from "@/components/streamlit";

export const Route = createFileRoute("/_authenticated/app/configuration")({
  component: ConfigurationPage,
});

const STORAGE_KEY = "pmo-config-rules";

export type ConfigRules = {
  GOV_CHANNEL_THRESHOLD: number;
  SCHEDULE_AMBER_VARIANCE: number;
  SCHEDULE_RED_VARIANCE: number;
  FINANCIAL_AMBER_VARIANCE: number;
  FINANCIAL_RED_VARIANCE: number;
  BENEFIT_GREEN_THRESHOLD: number;
  BENEFIT_AMBER_THRESHOLD: number;
  DELIVERY_AMBER_DAYS_LATE: number;
  DELIVERY_RED_DAYS_LATE: number;
  UPCOMING_GATE_WINDOW_DAYS: number;
  PRIORITY_SCORE_WEIGHT_STRAT: number;
  PRIORITY_SCORE_WEIGHT_BENEFIT: number;
  PRIORITY_SCORE_WEIGHT_RISK: number;
  PRIORITY_SCORE_WEIGHT_COMPL: number;
  PRIORITY_SCORE_WEIGHT_CPLX: number;
};

const DEFAULT_RULES: ConfigRules = {
  GOV_CHANNEL_THRESHOLD: 200_000,
  SCHEDULE_AMBER_VARIANCE: -0.05,
  SCHEDULE_RED_VARIANCE: -0.1,
  FINANCIAL_AMBER_VARIANCE: 0.05,
  FINANCIAL_RED_VARIANCE: 0.1,
  BENEFIT_GREEN_THRESHOLD: 0.7,
  BENEFIT_AMBER_THRESHOLD: 0.3,
  DELIVERY_AMBER_DAYS_LATE: 1,
  DELIVERY_RED_DAYS_LATE: 15,
  UPCOMING_GATE_WINDOW_DAYS: 30,
  PRIORITY_SCORE_WEIGHT_STRAT: 0.3,
  PRIORITY_SCORE_WEIGHT_BENEFIT: 0.25,
  PRIORITY_SCORE_WEIGHT_RISK: 0.2,
  PRIORITY_SCORE_WEIGHT_COMPL: 0.15,
  PRIORITY_SCORE_WEIGHT_CPLX: 0.1,
};

const RULE_META: { key: keyof ConfigRules; label: string; type: "currency" | "ratio" | "int"; hint: string }[] = [
  { key: "GOV_CHANNEL_THRESHOLD", label: "Gov channel threshold", type: "currency", hint: "Approved $ at/below → Channel A" },
  { key: "SCHEDULE_AMBER_VARIANCE", label: "Schedule amber variance", type: "ratio", hint: "Schedule variance worse than this → Amber" },
  { key: "SCHEDULE_RED_VARIANCE", label: "Schedule red variance", type: "ratio", hint: "Schedule variance worse than this → Red" },
  { key: "FINANCIAL_AMBER_VARIANCE", label: "Financial amber variance", type: "ratio", hint: "(Forecast−Approved)/Approved above → Amber" },
  { key: "FINANCIAL_RED_VARIANCE", label: "Financial red variance", type: "ratio", hint: "(Forecast−Approved)/Approved above → Red" },
  { key: "BENEFIT_GREEN_THRESHOLD", label: "Benefit green threshold", type: "ratio", hint: "Realisation ≥ → Green" },
  { key: "BENEFIT_AMBER_THRESHOLD", label: "Benefit amber threshold", type: "ratio", hint: "Realisation ≥ → Amber (else Red)" },
  { key: "DELIVERY_AMBER_DAYS_LATE", label: "Delivery amber days late", type: "int", hint: "Gate days late ≥ → Amber" },
  { key: "DELIVERY_RED_DAYS_LATE", label: "Delivery red days late", type: "int", hint: "Gate days late ≥ → Red" },
  { key: "UPCOMING_GATE_WINDOW_DAYS", label: "Upcoming gate window (days)", type: "int", hint: "Window for upcoming stage-gate KPI" },
];

const WEIGHT_KEYS: { key: keyof ConfigRules; label: string }[] = [
  { key: "PRIORITY_SCORE_WEIGHT_STRAT", label: "Strategic" },
  { key: "PRIORITY_SCORE_WEIGHT_BENEFIT", label: "Benefit" },
  { key: "PRIORITY_SCORE_WEIGHT_RISK", label: "Risk reduction" },
  { key: "PRIORITY_SCORE_WEIGHT_COMPL", label: "Compliance" },
  { key: "PRIORITY_SCORE_WEIGHT_CPLX", label: "Complexity (penalty)" },
];

function loadRules(): ConfigRules {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_RULES };
    return { ...DEFAULT_RULES, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_RULES };
  }
}

function ConfigurationPage() {
  const { organization } = useAuth();
  const { projects, isLoading } = useDomainData(organization?.id);
  const [rules, setRules] = useState<ConfigRules>(DEFAULT_RULES);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setRules(loadRules());
  }, []);

  const programs = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of projects) {
      const k = p.program || "Unassigned";
      m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [projects]);

  const categories = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of projects) {
      const k = p.portfolio_category || portfolioCategory(p);
      m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [projects]);

  const channelSplit = useMemo(() => {
    let a = 0;
    let b = 0;
    for (const p of projects) {
      const funding = Number(p.approved_funding || p.capex_approved || p.budget || 0);
      const ch = p.governance_channel || deriveChannel(funding);
      if (ch.startsWith("Channel A") || ch.includes("<")) a++;
      else b++;
    }
    return { a, b };
  }, [projects]);

  function setRule<K extends keyof ConfigRules>(key: K, value: ConfigRules[K]) {
    setRules((prev) => ({ ...prev, [key]: value }));
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    setSavedAt(new Date().toLocaleTimeString());
  }

  function resetDefaults() {
    setRules({ ...DEFAULT_RULES });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_RULES));
    setSavedAt(new Date().toLocaleTimeString());
  }

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <PageHeading
        icon="⚙️"
        title="Configuration — Lists & Rules"
        subtitle="Org settings, governance stages, RAG thresholds, and scoring weights (admin)"
      />

      <SectionFrame title="Organisation">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <KpiCard label="Organisation" value={organization?.name || "—"} />
          <KpiCard label="Projects in scope" value={projects.length} />
          <KpiCard
            label="Channel A / B"
            value={`${channelSplit.a} / ${channelSplit.b}`}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Admin-only access is already gated by navigation. Thresholds persist in{" "}
          <code className="rounded bg-slate-100 px-1">{STORAGE_KEY}</code>.
        </p>
      </SectionFrame>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SectionFrame>
          <SectionTitle>Channel A stages (&lt; ${rules.GOV_CHANNEL_THRESHOLD.toLocaleString()})</SectionTitle>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-heading">
            {CHANNEL_A_STAGES.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </SectionFrame>
        <SectionFrame>
          <SectionTitle>Channel B stages (&gt; ${rules.GOV_CHANNEL_THRESHOLD.toLocaleString()})</SectionTitle>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-heading">
            {CHANNEL_B_STAGES.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </SectionFrame>
      </div>

      <SectionFrame title="RAG thresholds (ConfigRules)">
        <div className="grid gap-3 sm:grid-cols-2">
          {RULE_META.map((r) => (
            <label key={r.key} className="flex flex-col gap-1 text-[11px] text-muted-foreground">
              <span className="font-medium text-heading">{r.label}</span>
              <span>{r.hint}</span>
              <input
                type="number"
                step={r.type === "int" ? 1 : r.type === "currency" ? 1000 : 0.01}
                className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-heading"
                value={rules[r.key]}
                onChange={(e) => setRule(r.key, Number(e.target.value) as ConfigRules[typeof r.key])}
              />
            </label>
          ))}
        </div>
      </SectionFrame>

      <SectionFrame title="Prioritisation / demand scoring weights">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WEIGHT_KEYS.map((w) => (
            <label key={w.key} className="flex flex-col gap-1 text-[11px] text-muted-foreground">
              <span className="flex justify-between font-medium text-heading">
                {w.label}
                <span>{Number(rules[w.key]).toFixed(2)}</span>
              </span>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.01}
                value={rules[w.key]}
                onChange={(e) => setRule(w.key, Number(e.target.value) as ConfigRules[typeof w.key])}
                className="accent-[#1d4ed8]"
              />
            </label>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Score = (Strat×wS + Benefit×wB + RiskRed×wR + Compliance×wC − Complexity×wX) × 20
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="export-btn" onClick={persist}>
            💾 Save to localStorage
          </button>
          <button type="button" className="export-btn" onClick={resetDefaults}>
            Reset defaults
          </button>
          {savedAt && <span className="self-center text-[11px] text-muted-foreground">Saved at {savedAt}</span>}
        </div>
      </SectionFrame>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SectionFrame title="Programs (from projects)">
          {programs.length === 0 ? (
            <EmptyState title="No programs" />
          ) : (
            <ul className="divide-y divide-border text-sm">
              {programs.map(([name, count]) => (
                <li key={name} className="flex justify-between py-2">
                  <span className="font-medium text-heading">{name}</span>
                  <span className="tabular-nums text-muted-foreground">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionFrame>
        <SectionFrame title="Portfolio categories (from projects)">
          {categories.length === 0 ? (
            <EmptyState title="No categories" />
          ) : (
            <ul className="divide-y divide-border text-sm">
              {categories.map(([name, count]) => (
                <li key={name} className="flex justify-between py-2">
                  <span className="font-medium text-heading">{name}</span>
                  <span className="tabular-nums text-muted-foreground">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionFrame>
      </div>
    </div>
  );
}
