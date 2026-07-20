import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { resourceHeatmap } from "@/lib/pmo/analytics";
import { HeatmapChart, HorizontalBarChart } from "@/components/pmo/plotly-charts";

export default async function ResourcesPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const resources = await db.resource.findMany({
    where: { organizationId: ctx.organization.id },
    include: { project: true },
    orderBy: { name: "asc" },
  });

  const heatmapData = resourceHeatmap(
    resources.map((r) => ({
      name: r.name,
      month: r.month,
      allocationPct: r.allocationPct,
    }))
  );

  const overAllocated = resources.filter((r) => r.allocationPct > r.capacityPct);
  const totalCapacity = resources.reduce((s, r) => s + r.capacityPct, 0);
  const totalAllocation = resources.reduce((s, r) => s + r.allocationPct, 0);
  const utilisation = totalCapacity > 0 ? Math.round((totalAllocation / totalCapacity) * 100) : 0;

  const uniqueNames = [...new Set(resources.map((r) => r.name))];
  const utilisationByPerson = uniqueNames.map((name) => {
    const personResources = resources.filter((r) => r.name === name);
    const cap = personResources.reduce((s, r) => s + r.capacityPct, 0) || 100;
    const alloc = personResources.reduce((s, r) => s + r.allocationPct, 0);
    return { name, util: Math.round((alloc / cap) * 100) };
  }).sort((a, b) => b.util - a.util);

  return (
    <div>
      <PageHeader
        title="Resources"
        description="Capacity heat-map, utilisation analysis, and overallocation alerts — Streamlit Resources parity."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Resource records</p>
          <p className="kpi-value mt-2 text-3xl">{resources.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">People tracked</p>
          <p className="kpi-value mt-2 text-3xl">{uniqueNames.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Portfolio utilisation</p>
          <p className="kpi-value mt-2 text-3xl">{utilisation}%</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Overallocated</p>
          <p
            className={`kpi-value mt-2 text-3xl ${
              overAllocated.length > 0 ? "text-rose-700" : "text-emerald-700"
            }`}
          >
            {overAllocated.length}
          </p>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        {heatmapData.names.length > 0 ? (
          <Card className="xl:col-span-2">
            <h3 className="font-[family-name:var(--font-display)] text-xl">
              Allocation heatmap
            </h3>
            <HeatmapChart
              z={heatmapData.z}
              x={heatmapData.months}
              y={heatmapData.names}
              title="Allocation % by person × month"
              colorscale="RdYlGn"
            />
          </Card>
        ) : null}

        {utilisationByPerson.length > 0 ? (
          <Card>
            <h3 className="font-[family-name:var(--font-display)] text-xl">
              Utilisation by person
            </h3>
            <HorizontalBarChart
              labels={utilisationByPerson.map((p) => p.name)}
              values={utilisationByPerson.map((p) => p.util)}
              title="Utilisation % (allocation / capacity)"
              colorScale
            />
          </Card>
        ) : null}

        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">Resource cards</h3>
          <div className="mt-4 space-y-3">
            {resources.slice(0, 8).map((r) => {
              const over = r.allocationPct > r.capacityPct;
              const util = Math.min(140, (r.allocationPct / Math.max(1, r.capacityPct)) * 100);
              return (
                <div key={r.id} className="rounded-xl bg-white/70 p-3 ring-1 ring-black/5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-xs text-[var(--ink-soft)]">
                        {r.role || "Contributor"} · {r.skill || "General"} ·{" "}
                        {r.project?.name || "Unassigned"} · {r.month || "Current"}
                      </p>
                    </div>
                    <Badge tone={over ? "red" : "green"}>
                      {over ? "Over" : "Healthy"}
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <div className="mb-1 flex justify-between text-xs text-[var(--ink-soft)]">
                      <span>Alloc {r.allocationPct}%</span>
                      <span>Cap {r.capacityPct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-black/5">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${util}%`,
                          background: over ? "var(--rag-red)" : "var(--brand-primary)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {resources.length > 8 && (
              <p className="text-xs text-[var(--ink-soft)]">
                +{resources.length - 8} more resource records in table below
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="font-[family-name:var(--font-display)] text-xl">Full resource register</h3>
        <div className="table-wrap mt-4">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Skill</th>
                <th>Project</th>
                <th>Month</th>
                <th>Allocation %</th>
                <th>Capacity %</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => {
                const over = r.allocationPct > r.capacityPct;
                return (
                  <tr key={r.id}>
                    <td className="font-medium">{r.name}</td>
                    <td>{r.role || "—"}</td>
                    <td>{r.skill || "—"}</td>
                    <td>{r.project?.name || "Unassigned"}</td>
                    <td>{r.month || "—"}</td>
                    <td>{r.allocationPct}%</td>
                    <td>{r.capacityPct}%</td>
                    <td>
                      <Badge tone={over ? "red" : "green"}>
                        {over ? "Overallocated" : "Healthy"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              {!resources.length && (
                <tr>
                  <td colSpan={8} className="text-[var(--ink-soft)]">
                    No resource records. Import the Excel Resources sheet or add via API.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
