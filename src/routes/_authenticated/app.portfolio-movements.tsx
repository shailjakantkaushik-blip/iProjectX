import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { exportPageCsv } from "@/lib/excel";
import { supabase } from "@/integrations/supabase/client";
import { useDomainData, fmtMoney, PORTFOLIO_CATEGORIES, portfolioCategory } from "@/lib/portfolio-engine";
import {
  ChartCaption, EmptyState, ExportBar, KpiCard, PageHeading, PageSkeleton, RagChip, SectionFrame,
} from "@/components/streamlit";

export const Route = createFileRoute("/_authenticated/app/portfolio-movements")({
  component: MovementsPage,
});

type Movement = {
  id: string;
  project_id: string | null;
  project_name: string;
  from_category: string;
  to_category: string;
  moved_by: string;
  moved_on: string;
  reason: string;
};

function MovementsPage() {
  const { organization, profile } = useAuth();
  const { projects, isLoading } = useDomainData(organization?.id);

  const [projectId, setProjectId] = useState("");
  const [toCategory, setToCategory] = useState<string>(PORTFOLIO_CATEGORIES[0]);
  const [reason, setReason] = useState("");
  const [movedBy, setMovedBy] = useState(profile?.full_name || "");
  const [movements, setMovements] = useState<Movement[]>([]);
  const [busy, setBusy] = useState(false);

  const selected = projects.find((p) => p.id === projectId) || projects[0];
  const currentCat = selected ? (selected.portfolio_category || portfolioCategory(selected)) : "";

  const varianceRows = useMemo(() => {
    return projects.map((p) => {
      const budget = Number(p.budget || 0);
      const forecast =
        Number(p.forecast_at_completion || 0) ||
        Number(p.capex_approved || 0) + Number(p.opex_approved || 0) ||
        budget;
      const delta = forecast - budget;
      return {
        id: p.id,
        name: p.name,
        program: p.program || "—",
        rag: p.rag || "Green",
        category: p.portfolio_category || portfolioCategory(p),
        budget,
        forecast,
        delta,
        pct: budget ? (delta / budget) * 100 : 0,
      };
    });
  }, [projects]);

  const kpis = useMemo(() => {
    const totalBudget = varianceRows.reduce((s, r) => s + r.budget, 0);
    const totalForecast = varianceRows.reduce((s, r) => s + r.forecast, 0);
    const delta = totalForecast - totalBudget;
    const up = varianceRows.filter((r) => r.delta > 0).length;
    const down = varianceRows.filter((r) => r.delta < 0).length;
    return { totalBudget, totalForecast, delta, up, down };
  }, [varianceRows]);

  const topMovers = useMemo(() => {
    return [...varianceRows]
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 10);
  }, [varianceRows]);

  const waterfall = useMemo(() => {
    const totalBudget = kpis.totalBudget;
    const ups = varianceRows.filter((r) => r.delta > 0).reduce((s, r) => s + r.delta, 0);
    const downs = varianceRows.filter((r) => r.delta < 0).reduce((s, r) => s + r.delta, 0);
    return [
      { name: "Budget", value: totalBudget, fill: "#1d4ed8" },
      { name: "Increases", value: ups, fill: "#dc2626" },
      { name: "Decreases", value: downs, fill: "#16a34a" },
      { name: "Forecast", value: kpis.totalForecast, fill: "#0f766e" },
    ];
  }, [varianceRows, kpis]);

  const submitMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !organization?.id) return;
    if (toCategory === currentCat) {
      toast.warning("Already in that category.");
      return;
    }
    if (!reason.trim()) {
      toast.error("Reason is required.");
      return;
    }
    setBusy(true);
    const row: Movement = {
      id: `local-${Date.now()}`,
      project_id: selected.id,
      project_name: selected.name,
      from_category: currentCat,
      to_category: toCategory,
      moved_by: movedBy.trim() || "admin",
      moved_on: new Date().toISOString().slice(0, 10),
      reason: reason.trim(),
    };
    setMovements((prev) => [row, ...prev]);

    try {
      const { error } = await (supabase as any).from("portfolio_movements").insert({
        org_id: organization.id,
        project_id: selected.id,
        project_name: selected.name,
        from_category: currentCat,
        to_category: toCategory,
        moved_by: row.moved_by,
        moved_on: row.moved_on,
        reason: row.reason,
      });
      if (error) {
        toast.error(`Saved locally; DB insert failed: ${error.message}`);
      } else {
        toast.success(`Moved ${selected.name}: ${currentCat} → ${toCategory}`);
      }
    } catch (err) {
      toast.error(`Saved locally; DB unavailable: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
      setReason("");
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <PageHeading
        icon="🔁"
        title="Portfolio Movements"
        subtitle="Budget vs forecast variance · reclassify initiatives with audit trail"
      />

      <SectionFrame title="Variance KPIs">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <KpiCard label="Total Budget" value={fmtMoney(kpis.totalBudget)} />
          <KpiCard label="Total Forecast" value={fmtMoney(kpis.totalForecast)} />
          <KpiCard
            label="Portfolio Delta"
            value={fmtMoney(kpis.delta)}
            accent={kpis.delta > 0 ? "#dc2626" : kpis.delta < 0 ? "#16a34a" : undefined}
          />
          <KpiCard label="Increasing" value={kpis.up} accent="#dc2626" />
          <KpiCard label="Decreasing" value={kpis.down} accent="#16a34a" />
        </div>
      </SectionFrame>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SectionFrame>
          <ChartCaption title="Top movers" caption="Largest absolute budget → forecast variance">
            <div className="h-[320px]">
              {topMovers.length === 0 ? (
                <EmptyState title="No variance data" />
              ) : (
                <ResponsiveContainer>
                  <BarChart data={topMovers} layout="vertical" margin={{ left: 8, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.10)" />
                    <XAxis type="number" fontSize={10} tickFormatter={(v) => fmtMoney(Number(v))} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      fontSize={10}
                      tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 16)}…` : v)}
                    />
                    <Tooltip formatter={(v: number) => fmtMoney(v)} />
                    <Bar dataKey="delta" name="Forecast − Budget" radius={4}>
                      {topMovers.map((m) => (
                        <Cell key={m.id} fill={m.delta >= 0 ? "#dc2626" : "#16a34a"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCaption>
        </SectionFrame>

        <SectionFrame>
          <ChartCaption title="Portfolio budget change" caption="Simple waterfall: Budget → Increases → Decreases → Forecast">
            <div className="h-[320px]">
              <ResponsiveContainer>
                <BarChart data={waterfall}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.10)" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={10} tickFormatter={(v) => fmtMoney(Number(v))} />
                  <Tooltip formatter={(v: number) => fmtMoney(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="value" name="Amount" radius={4}>
                    {waterfall.map((d) => (
                      <Cell key={d.name} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCaption>
        </SectionFrame>
      </div>

      <SectionFrame title="Move a project">
        {projects.length === 0 ? (
          <EmptyState title="No projects" />
        ) : (
          <form onSubmit={submitMove} className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
              Project
              <select
                className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-heading"
                value={selected?.id || ""}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  const p = projects.find((x) => x.id === e.target.value);
                  if (p) setToCategory(p.portfolio_category || portfolioCategory(p));
                }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
              Current category
              <input
                className="h-9 rounded-md border border-border bg-muted/40 px-2 text-sm text-heading"
                value={currentCat}
                disabled
                readOnly
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
              Move to category
              <select
                className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-heading"
                value={toCategory}
                onChange={(e) => setToCategory(e.target.value)}
              >
                {PORTFOLIO_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
              Your name
              <input
                className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-heading"
                value={movedBy}
                onChange={(e) => setMovedBy(e.target.value)}
                placeholder="Name"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-muted-foreground md:col-span-2 lg:col-span-3">
              Reason
              <textarea
                className="min-h-[72px] rounded-md border border-border bg-surface px-2 py-2 text-sm text-heading"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this project moving?"
                required
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={busy}
                className="export-btn h-9 w-full disabled:opacity-50"
              >
                {busy ? "Moving…" : "Move project"}
              </button>
            </div>
          </form>
        )}
      </SectionFrame>

      <SectionFrame title="Movement history">
        {movements.length === 0 ? (
          <EmptyState title="No movements yet" description="Use the form above to reclassify a project." />
        ) : (
          <div className="overflow-x-auto">
            <table className="st-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>From</th>
                  <th>To</th>
                  <th>By</th>
                  <th>On</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td className="font-medium">{m.project_name}</td>
                    <td>{m.from_category}</td>
                    <td>{m.to_category}</td>
                    <td>{m.moved_by}</td>
                    <td>{m.moved_on}</td>
                    <td className="max-w-[280px] truncate" title={m.reason}>{m.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ExportBar
          onCsv={() =>
            exportPageCsv(
              "portfolio-movements.csv",
              movements.map((m) => ({
                project: m.project_name,
                from: m.from_category,
                to: m.to_category,
                by: m.moved_by,
                on: m.moved_on,
                reason: m.reason,
              })),
            )
          }
        />
      </SectionFrame>

      <SectionFrame title="Budget vs Forecast register">
        <div className="overflow-x-auto">
          <table className="st-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Program</th>
                <th>Category</th>
                <th>RAG</th>
                <th className="text-right">Budget</th>
                <th className="text-right">Forecast</th>
                <th className="text-right">Delta</th>
                <th className="text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {varianceRows.map((m) => (
                <tr key={m.id}>
                  <td className="font-medium">{m.name}</td>
                  <td>{m.program}</td>
                  <td>{m.category}</td>
                  <td><RagChip rag={m.rag} /></td>
                  <td className="text-right tabular-nums">{fmtMoney(m.budget)}</td>
                  <td className="text-right tabular-nums">{fmtMoney(m.forecast)}</td>
                  <td
                    className="text-right tabular-nums"
                    style={{ color: m.delta > 0 ? "#dc2626" : m.delta < 0 ? "#16a34a" : undefined }}
                  >
                    {fmtMoney(m.delta)}
                  </td>
                  <td className="text-right tabular-nums">{m.pct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionFrame>
    </div>
  );
}
