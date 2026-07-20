import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { filterByFy, fundingByField, groupCount, ragDistribution } from "@/lib/pmo/engines";
import { formatCurrency } from "@/lib/utils";
import { CategoryBarChart, PortfolioMixChart } from "@/components/dashboard-charts";

export default async function SegmentationPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const { fy } = await searchParams;

  const projects = filterByFy(
    await db.project.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: { name: "asc" },
    }),
    fy
  );

  const byPortfolio = fundingByField(projects, "portfolioCategory");
  const ragCounts = ragDistribution(projects);
  const segments = [...new Set(projects.map((p) => p.portfolioCategory || "Unassigned"))].sort();

  const summary = segments.map((seg) => {
    const rows = projects.filter((p) => (p.portfolioCategory || "Unassigned") === seg);
    return {
      seg,
      count: rows.length,
      funding: rows.reduce((s, p) => s + p.funding, 0),
      spend: rows.reduce((s, p) => s + p.spend, 0),
      benefits: rows.reduce((s, p) => s + p.benefitsTarget, 0),
      green: rows.filter((p) => p.rag === "Green").length,
      amber: rows.filter((p) => p.rag === "Amber").length,
      red: rows.filter((p) => p.rag === "Red").length,
    };
  });

  const slices = [
    { title: "By theme", rows: groupCount(projects, (p) => p.theme || "Unassigned") },
    { title: "By business unit", rows: groupCount(projects, (p) => p.businessUnit || "Unassigned") },
    { title: "By priority", rows: groupCount(projects, (p) => p.priority) },
    { title: "By status", rows: groupCount(projects, (p) => p.status) },
    { title: "By sponsor", rows: groupCount(projects, (p) => p.sponsor || "Unassigned") },
    { title: "By PM", rows: groupCount(projects, (p) => p.pm || "Unassigned") },
  ];

  return (
    <div>
      <PageHeader
        title="Portfolio Segmentation"
        description="Slice the portfolio by category, theme, BU, priority, and ownership — Streamlit Segmentation."
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h3 className="font-[family-name:var(--font-display)] text-xl">Approved funding by portfolio</h3>
          <CategoryBarChart data={byPortfolio} />
        </Card>
        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">RAG mix</h3>
          <PortfolioMixChart data={ragCounts} />
        </Card>
      </div>

      <Card className="mt-6">
        <h3 className="font-[family-name:var(--font-display)] text-xl">Segment summary</h3>
        <div className="table-wrap mt-4">
          <table className="data">
            <thead>
              <tr>
                <th>Portfolio</th>
                <th>Initiatives</th>
                <th>Funding</th>
                <th>Spend</th>
                <th>Remaining</th>
                <th>Benefits</th>
                <th>G / A / R</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((s) => (
                <tr key={s.seg}>
                  <td className="font-medium">{s.seg}</td>
                  <td>{s.count}</td>
                  <td>{formatCurrency(s.funding)}</td>
                  <td>{formatCurrency(s.spend)}</td>
                  <td>{formatCurrency(s.funding - s.spend)}</td>
                  <td>{formatCurrency(s.benefits)}</td>
                  <td>
                    {s.green} / {s.amber} / {s.red}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {slices.map((s) => (
          <Card key={s.title}>
            <h3 className="text-sm font-semibold">{s.title}</h3>
            <div className="mt-3 space-y-2">
              {s.rows.map(([label, count]) => (
                <div key={label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{label}</span>
                  <Badge>{count}</Badge>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <h3 className="font-[family-name:var(--font-display)] text-xl">Project register</h3>
        <div className="table-wrap mt-4">
          <table className="data">
            <thead>
              <tr>
                <th>Project</th>
                <th>Portfolio</th>
                <th>Theme</th>
                <th>BU</th>
                <th>Priority</th>
                <th>RAG</th>
                <th>Sponsor</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/app/projects/${p.id}`} className="font-medium text-[var(--brand-primary)]">
                      {p.code}
                    </Link>
                    <p className="text-xs text-[var(--ink-soft)]">{p.name}</p>
                  </td>
                  <td>{p.portfolioCategory}</td>
                  <td>{p.theme || "—"}</td>
                  <td>{p.businessUnit || "—"}</td>
                  <td>{p.priority}</td>
                  <td>
                    <Badge tone={p.rag === "Green" ? "green" : p.rag === "Amber" ? "amber" : "red"}>
                      {p.rag}
                    </Badge>
                  </td>
                  <td>{p.sponsor || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
