import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useAuth } from "@/lib/auth-context";
import { CHANNEL_A_STAGES, CHANNEL_B_STAGES, useDomainData, type Project } from "@/lib/domain";
import { fmtMoney } from "@/lib/portfolio-engine";
import {
  ChartCaption, EmptyState, ExportBar, KpiCard, PageHeading, PageSkeleton,
  RagChip, SectionFrame, StatusChip,
} from "@/components/streamlit";
import { exportPageCsv } from "@/lib/ppt-export";

export const Route = createFileRoute("/_authenticated/app/governance-channels")({
  component: GovernanceChannelsPage,
});

function projectChannel(p: Project): "Channel A" | "Channel B" {
  if (p.governance_channel) {
    return p.governance_channel.startsWith("Channel A") ? "Channel A" : "Channel B";
  }
  const funding = Number(p.approved_funding || p.capex_approved || p.budget || 0);
  return funding > 0 && funding <= 200_000 ? "Channel A" : "Channel B";
}

function fundingOf(p: Project) {
  return Number(p.approved_funding || p.capex_approved || p.budget || 0);
}

function ProjectTable({ rows }: { rows: Project[] }) {
  if (rows.length === 0) {
    return <EmptyState title="No projects in this channel" />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="st-table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Sponsor</th>
            <th className="text-right">Approved Funding</th>
            <th className="text-right">Progress</th>
            <th>Status</th>
            <th>RAG</th>
            <th>Phase</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td className="font-medium">{p.name}</td>
              <td>{p.sponsor || "—"}</td>
              <td className="text-right tabular-nums">{fmtMoney(fundingOf(p))}</td>
              <td className="text-right tabular-nums">{Number(p.progress_pct || 0)}%</td>
              <td><StatusChip status={p.status} /></td>
              <td><RagChip rag={p.rag} /></td>
              <td>{p.current_phase || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StageTimeline({
  title,
  stages,
  lockFullFunding,
}: {
  title: string;
  stages: string[];
  lockFullFunding?: boolean;
}) {
  return (
    <div className="rounded-[10px] border border-border bg-surface p-4">
      <h3 className="mb-4 text-[15px] font-semibold text-heading">{title}</h3>
      <ol className="relative space-y-0 border-l-2 border-border pl-5">
        {stages.map((stage, i) => {
          const locked = !!lockFullFunding && stage.includes("Full Funding");
          return (
            <li key={stage} className="relative pb-5 last:pb-0">
              <span
                className="absolute -left-[1.4rem] top-1 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-[11px]"
                aria-hidden
              >
                {locked ? "🔒" : "•"}
              </span>
              <div className="text-sm font-medium text-heading">
                {stage}
                {locked ? " — mandatory lock before Build" : ""}
              </div>
              <div className="text-[11px] text-muted-foreground">Step {i + 1} of {stages.length}</div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function GovernanceChannelsPage() {
  const { organization } = useAuth();
  const { projects, isLoading } = useDomainData(organization?.id);
  const [channelView, setChannelView] = useState<"Both" | "Channel A" | "Channel B">("Both");

  const withChannel = useMemo(() => {
    return projects.map((p) => ({ ...p, _channel: projectChannel(p) }));
  }, [projects]);

  const channelA = withChannel.filter((p) => p._channel === "Channel A");
  const channelB = withChannel.filter((p) => p._channel === "Channel B");

  const barData = [
    { channel: "Channel A", count: channelA.length, fill: "#1d4ed8" },
    { channel: "Channel B", count: channelB.length, fill: "#0f766e" },
  ];

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <PageHeading
        icon="🛂"
        title="Governance Channels"
        subtitle="Channel A = expedite path under $200K · Channel B = standard path with mandatory Full-Funding gate before Build"
      />

      <SectionFrame title="Channel filter">
        <div className="flex flex-wrap gap-4 text-sm">
          {(["Both", "Channel A", "Channel B"] as const).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-heading">
              <input
                type="radio"
                name="gov-channel"
                checked={channelView === opt}
                onChange={() => setChannelView(opt)}
                className="h-4 w-4"
              />
              {opt}
            </label>
          ))}
        </div>
      </SectionFrame>

      <SectionFrame title="Channel overview">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Channel A" value={channelA.length} accent="#1d4ed8" />
          <KpiCard label="Channel B" value={channelB.length} accent="#0f766e" />
          <KpiCard label="Total Projects" value={projects.length} />
          <KpiCard
            label="A Funding"
            value={fmtMoney(channelA.reduce((s, p) => s + fundingOf(p), 0))}
          />
        </div>
      </SectionFrame>

      {(channelView === "Both" || channelView === "Channel A" || channelView === "Channel B") && (
        <div className={`grid grid-cols-1 gap-3 ${channelView === "Both" ? "lg:grid-cols-2" : ""}`}>
          {(channelView === "Both" || channelView === "Channel A") && (
            <StageTimeline
              title="🅰️ Channel A — Expedite (<$200K)"
              stages={CHANNEL_A_STAGES}
            />
          )}
          {(channelView === "Both" || channelView === "Channel B") && (
            <StageTimeline
              title="🅱️ Channel B — Standard (>$200K)"
              stages={CHANNEL_B_STAGES}
              lockFullFunding
            />
          )}
        </div>
      )}

      <SectionFrame>
        <ChartCaption title="Projects per governance channel" caption="Distribution of portfolio by channel path">
          {projects.length === 0 ? (
            <EmptyState title="No projects" description="Load projects to see channel distribution." />
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.10)" />
                  <XAxis dataKey="channel" fontSize={11} />
                  <YAxis allowDecimals={false} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" name="Projects" radius={[4, 4, 0, 0]}>
                    {barData.map((d) => (
                      <Cell key={d.channel} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCaption>
      </SectionFrame>

      {(channelView === "Both" || channelView === "Channel A") && (
        <SectionFrame title={`Channel A projects (${channelA.length})`}>
          <ProjectTable rows={channelA} />
          <ExportBar
            onCsv={() =>
              exportPageCsv(
                "channel-a-projects.csv",
                channelA.map((p) => ({
                  name: p.name,
                  sponsor: p.sponsor,
                  funding: fundingOf(p),
                  progress: p.progress_pct,
                  status: p.status,
                  rag: p.rag,
                  phase: p.current_phase,
                })),
              )
            }
          />
        </SectionFrame>
      )}

      {(channelView === "Both" || channelView === "Channel B") && (
        <SectionFrame title={`Channel B projects (${channelB.length})`}>
          <ProjectTable rows={channelB} />
          <ExportBar
            onCsv={() =>
              exportPageCsv(
                "channel-b-projects.csv",
                channelB.map((p) => ({
                  name: p.name,
                  sponsor: p.sponsor,
                  funding: fundingOf(p),
                  progress: p.progress_pct,
                  status: p.status,
                  rag: p.rag,
                  phase: p.current_phase,
                })),
              )
            }
          />
        </SectionFrame>
      )}
    </div>
  );
}
