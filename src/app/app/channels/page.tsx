import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { channelForFunding, filterByFy, groupCount } from "@/lib/pmo/engines";
import { formatCurrency, formatPct } from "@/lib/utils";
import { CategoryBarChart } from "@/components/dashboard-charts";

export default async function ChannelsPage({
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
  ).map((p) => ({
    ...p,
    channel: p.governanceChannel || channelForFunding(p.funding),
  }));

  const byChannel = groupCount(projects, (p) => p.channel);
  const chart = byChannel.map(([category, funding]) => ({
    category,
    funding: projects.filter((p) => p.channel === category).reduce((s, p) => s + p.funding, 0) || funding,
  }));

  const channelA = projects.filter((p) => p.channel.toLowerCase().includes("a"));
  const channelB = projects.filter((p) => p.channel.toLowerCase().includes("b"));
  const other = projects.filter(
    (p) => !p.channel.toLowerCase().includes("a") && !p.channel.toLowerCase().includes("b")
  );

  function ChannelTable({ rows }: { rows: typeof projects }) {
    return (
      <div className="table-wrap mt-4">
        <table className="data">
          <thead>
            <tr>
              <th>Project</th>
              <th>Sponsor</th>
              <th>Funding</th>
              <th>Progress</th>
              <th>Status</th>
              <th>RAG</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/app/projects/${p.id}`} className="font-medium text-[var(--brand-primary)]">
                    {p.code}
                  </Link>
                  <p className="text-xs text-[var(--ink-soft)]">{p.name}</p>
                </td>
                <td>{p.sponsor || "—"}</td>
                <td>{formatCurrency(p.funding)}</td>
                <td>{formatPct(p.progress)}</td>
                <td>{p.status}</td>
                <td>
                  <Badge tone={p.rag === "Green" ? "green" : p.rag === "Amber" ? "amber" : "red"}>
                    {p.rag}
                  </Badge>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={6} className="text-[var(--ink-soft)]">
                  No projects in this channel.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Governance Channels"
        description="Channel A (&lt;$200k) vs Channel B — Streamlit Governance Channels parity."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Channel A</p>
          <p className="kpi-value mt-2 text-3xl">{channelA.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Channel B</p>
          <p className="kpi-value mt-2 text-3xl">{channelB.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Other / unassigned</p>
          <p className="kpi-value mt-2 text-3xl">{other.length}</p>
        </Card>
      </div>
      <Card className="mt-6">
        <h3 className="font-[family-name:var(--font-display)] text-xl">Projects per channel (funding)</h3>
        <CategoryBarChart data={chart} />
      </Card>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">Channel A</h3>
          <ChannelTable rows={channelA} />
        </Card>
        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">Channel B</h3>
          <ChannelTable rows={channelB} />
        </Card>
      </div>
      {other.length ? (
        <Card className="mt-6">
          <h3 className="font-[family-name:var(--font-display)] text-xl">Other channels</h3>
          <ChannelTable rows={other} />
        </Card>
      ) : null}
    </div>
  );
}
