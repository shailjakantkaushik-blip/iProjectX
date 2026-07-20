import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  KpiCard,
  PageHeading,
  PageSkeleton,
  RagChip,
  SectionFrame,
  SectionTitle,
  SortableSheet,
  type SheetColumn,
} from "@/components/streamlit";
import { useAuth } from "@/lib/auth-context";
import { claimOrphanProjects, seedSamplePortfolio } from "@/lib/sample-portfolio";
import { Button } from "@/components/ui/button";
import { useDomainData, budgetForecastByFy, computeProjectHealth, executiveKpis, fmtMoney, segmentSummary, type ProjectHealth, type SegmentRow } from "@/lib/portfolio-engine";

export const Route = createFileRoute("/_authenticated/app/")({
  component: ExecutiveCockpit,
});

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function isActionComplete(status: string) {
  const s = status.toLowerCase();
  return s === "complete" || s === "completed" || s === "closed" || s === "done";
}

function ExecutiveCockpit() {
  const { organization } = useAuth();
  const [seeding, setSeeding] = useState(false);

  const {
    projects,
    decisions,
    actions,
    stageGates,
    benefits,
    isLoading,
    error: loadError,
    refetch,
  } = useDomainData(organization?.id);

  const loadSample = async () => {
    if (!organization) return;
    setSeeding(true);
    try {
      try {
        const claimed = await claimOrphanProjects();
        if (claimed > 0) toast.success(`Claimed ${claimed} orphan project(s) into your org`);
      } catch {
        // RPC may not be applied yet — ignore
      }
      const { count } = await seedSamplePortfolio(organization.id);
      toast.success(`Loaded ${count} sample projects`);
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load sample data");
    } finally {
      setSeeding(false);
    }
  };

  const baseKpis = useMemo(() => executiveKpis(projects), [projects]);
  const segments = useMemo(() => segmentSummary(projects), [projects]);
  const health = useMemo(() => computeProjectHealth(projects), [projects]);
  const fy = useMemo(() => budgetForecastByFy(projects), [projects]);

  const kpis = useMemo(() => {
    const today = startOfDay();

    const decisionsAwaiting = decisions.filter((d) => {
      const s = (d.status || "").toLowerCase();
      return s === "open" || s === "in review";
    }).length;

    const overdueActions = actions.filter((a) => {
      if ((a.status || "").toLowerCase() === "overdue") return true;
      if (isActionComplete(a.status || "")) return false;
      if (!a.due_date) return false;
      return startOfDay(new Date(a.due_date)) < today;
    }).length;

    const upcomingStageGates = stageGates.filter((g) => {
      const s = (g.status || "").toLowerCase();
      if (s === "approved" || s === "complete" || s === "completed") return false;
      if (!g.planned_date) return false;
      const d = startOfDay(new Date(g.planned_date));
      if (!Number.isFinite(d.getTime())) return false;
      const diff = daysBetween(today, d);
      return diff >= 0 && diff <= 30;
    }).length;

    const benefitsForecast =
      benefits.length > 0
        ? benefits.reduce((s, b) => s + Number(b.target_value || 0), 0)
        : baseKpis.benefitsForecast;
    const benefitsRealised =
      benefits.length > 0
        ? benefits.reduce((s, b) => s + Number(b.realised_value || 0), 0)
        : baseKpis.benefitsRealised;

    return {
      ...baseKpis,
      benefitsForecast,
      benefitsRealised,
      decisionsAwaiting,
      overdueActions,
      upcomingStageGates,
    };
  }, [baseKpis, decisions, actions, stageGates, benefits]);

  const financialCards: [string, string][] = [
    ["Total Portfolio Value", fmtMoney(kpis.totalPortfolioValue)],
    ["Total Capex Budget", fmtMoney(kpis.totalCapexBudget)],
    ["Total Opex Budget", fmtMoney(kpis.totalOpexBudget)],
    ["Approved Funding", fmtMoney(kpis.approvedFunding)],
    ["Actual Spend to Date", fmtMoney(kpis.actualSpend)],
    ["Remaining Portfolio Budget", fmtMoney(kpis.remainingBudget)],
    ["Forecast at Completion", fmtMoney(kpis.forecastAtCompletion)],
  ];

  const deliveryCards: [string, string][] = [
    ["Projects On Track %", `${kpis.projectsOnTrackPct.toFixed(1)}%`],
    ["At Risk %", `${kpis.projectsAtRiskPct.toFixed(1)}%`],
    ["Delayed %", `${kpis.projectsDelayedPct.toFixed(1)}%`],
    ["Total Strategic Programs", String(kpis.totalStrategicPrograms)],
    ["Total CAPEX Programs", String(kpis.totalCapexPrograms)],
    ["Total Unfunded Initiatives", String(kpis.totalUnfundedInitiatives)],
  ];

  const benefitsCards: [string, string][] = [
    ["Benefits Forecast", fmtMoney(kpis.benefitsForecast)],
    ["Benefits Realised", fmtMoney(kpis.benefitsRealised)],
    ["Decisions Awaiting Approval", String(kpis.decisionsAwaiting)],
    ["Overdue Actions", String(kpis.overdueActions)],
    ["Upcoming Stage Gates", String(kpis.upcomingStageGates)],
  ];

  const segmentCols: SheetColumn<SegmentRow>[] = [
    { key: "portfolio", header: "Portfolio", sortValue: (r) => r.portfolio, cell: (r) => r.portfolio },
    { key: "initiatives", header: "Initiatives", sortValue: (r) => r.initiatives, cell: (r) => r.initiatives },
    {
      key: "approved",
      header: "Approved Funding",
      sortValue: (r) => r.approvedFunding,
      cell: (r) => fmtMoney(r.approvedFunding),
    },
    {
      key: "spend",
      header: "Actual Spend",
      sortValue: (r) => r.actualSpend,
      cell: (r) => fmtMoney(r.actualSpend),
    },
    {
      key: "remaining",
      header: "Remaining",
      sortValue: (r) => r.remaining,
      cell: (r) => fmtMoney(r.remaining),
    },
    {
      key: "benefits",
      header: "Benefits Forecast",
      sortValue: (r) => r.benefitsForecast,
      cell: (r) => fmtMoney(r.benefitsForecast),
    },
    { key: "green", header: "Green", sortValue: (r) => r.green, cell: (r) => r.green },
    { key: "amber", header: "Amber", sortValue: (r) => r.amber, cell: (r) => r.amber },
    { key: "red", header: "Red", sortValue: (r) => r.red, cell: (r) => r.red },
  ];

  const healthCols: SheetColumn<ProjectHealth>[] = [
    {
      key: "id",
      header: "Project ID",
      sortValue: (r) => r.projectId,
      cell: (r) => (
        <Link to="/app/projects/$id" params={{ id: r.id }} className="font-medium text-[#1d4ed8] hover:underline">
          {r.projectId}
        </Link>
      ),
    },
    {
      key: "name",
      header: "Project Name",
      sortValue: (r) => r.projectName,
      cell: (r) => <span className="max-w-[220px] truncate inline-block align-bottom">{r.projectName}</span>,
    },
    {
      key: "cat",
      header: "Portfolio Category",
      sortValue: (r) => r.portfolioCategory,
      cell: (r) => r.portfolioCategory,
    },
    {
      key: "channel",
      header: "Governance Channel",
      sortValue: (r) => r.governanceChannel,
      cell: (r) => r.governanceChannel,
    },
    { key: "sponsor", header: "Sponsor", sortValue: (r) => r.sponsor, cell: (r) => r.sponsor },
    {
      key: "lead",
      header: "Delivery Lead",
      sortValue: (r) => r.deliveryLead,
      cell: (r) => r.deliveryLead,
    },
    {
      key: "progress",
      header: "Progress %",
      sortValue: (r) => r.progress,
      cell: (r) => r.progress,
    },
    {
      key: "sched",
      header: "Schedule Health",
      sortValue: (r) => r.scheduleHealth,
      cell: (r) => <RagChip rag={r.scheduleHealth} />,
    },
    {
      key: "fin",
      header: "Financial Health",
      sortValue: (r) => r.financialHealth,
      cell: (r) => <RagChip rag={r.financialHealth} />,
    },
    {
      key: "del",
      header: "Delivery Health",
      sortValue: (r) => r.deliveryHealth,
      cell: (r) => <RagChip rag={r.deliveryHealth} />,
    },
    {
      key: "ben",
      header: "Benefit Health",
      sortValue: (r) => r.benefitHealth,
      cell: (r) => <RagChip rag={r.benefitHealth} />,
    },
    {
      key: "rag",
      header: "Overall RAG",
      sortValue: (r) => r.overallRag,
      cell: (r) => <RagChip rag={r.overallRag} />,
    },
  ];

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-1">
      <PageHeading icon="📊" title="Executive Cockpit" />
      <p className="mb-4 text-sm text-muted-foreground">
        Live data source: <strong>PMO_Master.xlsx</strong>
        {organization?.name ? ` · ${organization.name}` : null}
      </p>

      {loadError ? (
        <SectionFrame>
          <p className="text-sm font-medium text-destructive">Couldn’t load projects</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {(loadError as Error).message}
          </p>
        </SectionFrame>
      ) : projects.length === 0 ? (
        <SectionFrame>
          <h2 className="page-heading mb-2 text-[18px]">
            <span>📂</span>
            <span>No projects in your organization</span>
          </h2>
          <p className="mb-3 max-w-2xl text-sm text-muted-foreground">
            The app only shows rows in <code className="rounded bg-muted px-1">public.projects</code>{" "}
            where <code className="rounded bg-muted px-1">org_id</code> matches your signed-in org
            (RLS). Sample data under another org — or in the legacy{" "}
            <code className="rounded bg-muted px-1">"Project"</code> table — will not appear here.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={seeding} onClick={() => void loadSample()}>
              {seeding ? "Loading…" : "Load sample portfolio (16 projects)"}
            </Button>
            <Button variant="outline" asChild>
              <Link to="/app/data-editor">Import Excel</Link>
            </Button>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Or run <code className="rounded bg-muted px-1">supabase/SEED_SAMPLE_PORTFOLIO.sql</code>{" "}
            in the Supabase SQL Editor (set your email first).
          </p>
        </SectionFrame>
      ) : (
        <>
          <SectionTitle>Financial</SectionTitle>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {financialCards.map(([label, value]) => (
              <KpiCard key={label} label={label} value={value} />
            ))}
          </div>

          <SectionTitle>Delivery</SectionTitle>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {deliveryCards.map(([label, value]) => (
              <KpiCard key={label} label={label} value={value} />
            ))}
          </div>

          <SectionTitle>Benefits &amp; Governance</SectionTitle>
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {benefitsCards.map(([label, value]) => (
              <KpiCard key={label} label={label} value={value} />
            ))}
          </div>

          <SectionFrame>
            <h2 className="page-heading mb-3 text-[18px]">
              <span>🗂️</span>
              <span>Portfolio Segmentation</span>
            </h2>
            <SortableSheet
              rows={segments}
              columns={segmentCols}
              rowKey={(r) => r.portfolio}
              initialSortKey="portfolio"
            />
          </SectionFrame>

          <SectionFrame>
            <h2 className="page-heading mb-3 text-[18px]">
              <span>🚦</span>
              <span>Portfolio Health Snapshot</span>
            </h2>
            <SortableSheet
              rows={health}
              columns={healthCols}
              rowKey={(r) => r.id}
              initialSortKey="id"
              maxRows={40}
            />
          </SectionFrame>

          <SectionFrame>
            <h2 className="page-heading mb-3 text-[18px]">
              <span>📅</span>
              <span>Budget &amp; Forecast by Financial Year</span>
            </h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
              <div className="min-h-[280px] rounded-md border border-border bg-surface p-3">
                <div className="mb-2 text-sm font-semibold text-heading">Budget vs Forecast by FY</div>
                {fy.series.length === 0 ? (
                  <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
                    No FY dates on projects yet — set start/end dates to populate this chart.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={fy.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="fy" tick={{ fontSize: 12 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => fmtMoney(Number(v))}
                        width={64}
                      />
                      <Tooltip formatter={(v: number) => fmtMoney(v)} />
                      <Legend />
                      <Bar dataKey="budget" name="Budget" fill="#1d4ed8" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="forecast" name="Forecast" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="space-y-3">
                <KpiCard
                  label="Projects with FY allocation"
                  value={`${fy.allocatedProjects}/${projects.length}`}
                />
                <KpiCard label="Allocation coverage" value={`${fy.coveragePct}%`} />
              </div>
            </div>
          </SectionFrame>

          <div className="mt-2 rounded-md border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-sm text-[#1e3a8a]">
            👈 Use the sidebar to open Segmentation, Governance Channels, Stage Gates, Decisions,
            Actions, Benefits, Prioritisation, Project Infographic, FY Allocation, and more.
          </div>
        </>
      )}
    </div>
  );
}
