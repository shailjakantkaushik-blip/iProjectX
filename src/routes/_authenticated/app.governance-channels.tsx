import { createFileRoute } from "@tanstack/react-router";
import { PageHeading, SectionFrame, SectionTitle, KpiCard } from "@/components/streamlit";

export const Route = createFileRoute("/_authenticated/app/governance-channels")({
  component: GovernanceChannelsPage,
});

const CHANNELS = [
  { name: "Portfolio Steering Committee", cadence: "Monthly", audience: "Executives & Sponsors", purpose: "Approve investments, review portfolio health" },
  { name: "Program Board", cadence: "Fortnightly", audience: "Program & BU Leads", purpose: "Program-level RAG, dependencies, escalations" },
  { name: "Project Review Forum", cadence: "Weekly", audience: "Project Managers", purpose: "Milestones, risks, actions" },
  { name: "Change Advisory Board", cadence: "Weekly", audience: "CAB Members", purpose: "Assess and approve change requests" },
  { name: "Architecture Review", cadence: "Bi-weekly", audience: "Architects & Tech Leads", purpose: "Solution design, standards, non-functional review" },
  { name: "Benefits Realisation Review", cadence: "Quarterly", audience: "Sponsors & Finance", purpose: "Track benefits vs target post go-live" },
];

function GovernanceChannelsPage() {
  return (
    <div className="space-y-6">
      <PageHeading title="Governance Channels" subtitle="Forums, cadence, and decision rights across the portfolio" />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Active Forums" value={CHANNELS.length} />
        <KpiCard label="Weekly Cadence" value={CHANNELS.filter(c => c.cadence === "Weekly").length} />
        <KpiCard label="Executive Forums" value={CHANNELS.filter(c => c.audience.includes("Executive")).length} />
      </div>

      <SectionFrame>
        <SectionTitle>Governance Framework</SectionTitle>
        <div className="overflow-x-auto">
          <table className="st-table">
            <thead>
              <tr><th>Channel</th><th>Cadence</th><th>Audience</th><th>Purpose</th></tr>
            </thead>
            <tbody>
              {CHANNELS.map((c) => (
                <tr key={c.name}>
                  <td className="font-medium">{c.name}</td>
                  <td>{c.cadence}</td>
                  <td>{c.audience}</td>
                  <td>{c.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionFrame>
    </div>
  );
}
