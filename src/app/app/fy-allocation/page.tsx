import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { filterByFy, fyTagOptions, parseFyFilter } from "@/lib/pmo/engines";
import { formatCurrency } from "@/lib/utils";

export default async function FyAllocationPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const { fy } = await searchParams;
  const fyFilter = parseFyFilter(fy);

  const projects = await db.project.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: { name: "asc" },
  });

  const fyOptions = fyTagOptions(projects.map((p) => p.financialYear));
  const rows = fyOptions.map((tag) => {
    const tagged = projects.filter((p) => p.financialYear === tag);
    const budget = tagged.reduce((s, p) => s + p.funding, 0);
    const actual = tagged.reduce((s, p) => s + p.spend, 0);
    const forecast = tagged.reduce((s, p) => s + p.forecast, 0);
    return {
      tag,
      count: tagged.length,
      budget,
      actual,
      forecast,
      variance: budget - actual,
      coverage: budget > 0 ? Math.round((actual / budget) * 100) : 0,
    };
  });

  const detail = filterByFy(projects, fyFilter);

  const totals = {
    budget: projects.reduce((s, p) => s + p.funding, 0),
    actual: projects.reduce((s, p) => s + p.spend, 0),
    forecast: projects.reduce((s, p) => s + p.forecast, 0),
  };

  return (
    <div>
      <PageHeader
        title="FY Allocation"
        description="Budget, actual, and forecast by financial year — Streamlit FY Allocation portfolio view."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Total budget</p>
          <p className="kpi-value mt-2 text-2xl">{formatCurrency(totals.budget)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Actual spend</p>
          <p className="kpi-value mt-2 text-2xl">{formatCurrency(totals.actual)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Forecast</p>
          <p className="kpi-value mt-2 text-2xl">{formatCurrency(totals.forecast)}</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((r) => (
          <Card key={r.tag} className={fyFilter === r.tag ? "ring-2 ring-[var(--brand-primary)]" : undefined}>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{r.tag}</p>
            <p className="mt-2 text-2xl font-semibold">{r.count}</p>
            <p className="text-xs text-[var(--ink-soft)]">projects · {r.coverage}% spent</p>
            <dl className="mt-3 space-y-1 text-xs text-[var(--ink-soft)]">
              <div className="flex justify-between gap-2">
                <dt>Budget</dt>
                <dd className="font-medium text-[var(--ink)]">{formatCurrency(r.budget)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Actual</dt>
                <dd className="font-medium text-[var(--ink)]">{formatCurrency(r.actual)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Forecast</dt>
                <dd className="font-medium text-[var(--ink)]">{formatCurrency(r.forecast)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Variance</dt>
                <dd className={`font-medium ${r.variance < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                  {formatCurrency(r.variance)}
                </dd>
              </div>
            </dl>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <h3 className="font-[family-name:var(--font-display)] text-xl">
          Project FY tags {fyFilter ? `(filtered: ${fyFilter})` : ""}
        </h3>
        <div className="table-wrap mt-4">
          <table className="data">
            <thead>
              <tr>
                <th>Project</th>
                <th>FY</th>
                <th>Budget</th>
                <th>Actual</th>
                <th>Forecast</th>
                <th>RAG</th>
              </tr>
            </thead>
            <tbody>
              {detail.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/app/projects/${p.id}`} className="font-medium text-[var(--brand-primary)]">
                      {p.code}
                    </Link>
                    <p className="text-xs text-[var(--ink-soft)]">{p.name}</p>
                  </td>
                  <td>{p.financialYear || "—"}</td>
                  <td>{formatCurrency(p.funding)}</td>
                  <td>{formatCurrency(p.spend)}</td>
                  <td>{formatCurrency(p.forecast)}</td>
                  <td>
                    <Badge tone={p.rag === "Green" ? "green" : p.rag === "Amber" ? "amber" : "red"}>
                      {p.rag}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
