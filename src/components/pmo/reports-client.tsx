"use client";

import { Button, Card } from "@/components/ui";

function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type Risk = {
  id: string;
  code: string;
  title: string;
  project: string;
  probability: number;
  impact: number;
  score: number;
  status: string;
  owner: string;
  rag: string;
};

type Decision = {
  id: string;
  title: string;
  project: string;
  status: string;
  owner: string;
  decidedOn: string;
  outcome: string;
};

type ActionItem = {
  id: string;
  title: string;
  project: string;
  priority: string;
  status: string;
  owner: string;
  dueDate: string;
};

type StageGate = {
  id: string;
  project: string;
  projectCode: string;
  channel: string;
  stage: string;
  gateStatus: string;
  plannedDate: string;
  outcome: string;
};

type BenefitRow = {
  id: string;
  title: string;
  project: string;
  benefitType: string;
  targetValue: number;
  realisedValue: number;
  status: string;
  owner: string;
};

type CbSummary = {
  cost: number;
  benefit: number;
  net: number;
  roi: string;
  bcr: string;
  realised: number;
};

export function ReportsClient({
  risks,
  decisions,
  actions,
  stageGates,
  benefits,
  cbSummary,
}: {
  risks: Risk[];
  decisions: Decision[];
  actions: ActionItem[];
  stageGates: StageGate[];
  benefits: BenefitRow[];
  cbSummary: CbSummary;
}) {
  function exportRisks() {
    const headers = ["Code", "Title", "Project", "P", "I", "Score", "Status", "Owner", "RAG"];
    const rows = risks.map((r) => [
      r.code,
      r.title,
      r.project,
      r.probability,
      r.impact,
      r.score,
      r.status,
      r.owner,
      r.rag,
    ]);
    download("risks.csv", toCsv(headers, rows));
  }

  function exportDecisions() {
    const headers = ["Title", "Project", "Status", "Owner", "Decided On", "Outcome"];
    const rows = decisions.map((d) => [
      d.title,
      d.project,
      d.status,
      d.owner,
      d.decidedOn,
      d.outcome,
    ]);
    download("decisions.csv", toCsv(headers, rows));
  }

  function exportActions() {
    const headers = ["Title", "Project", "Priority", "Status", "Owner", "Due Date"];
    const rows = actions.map((a) => [
      a.title,
      a.project,
      a.priority,
      a.status,
      a.owner,
      a.dueDate,
    ]);
    download("actions.csv", toCsv(headers, rows));
  }

  function exportStageGates() {
    const headers = [
      "Project",
      "Code",
      "Channel",
      "Stage",
      "Gate Status",
      "Planned Date",
      "Outcome",
    ];
    const rows = stageGates.map((sg) => [
      sg.project,
      sg.projectCode,
      sg.channel,
      sg.stage,
      sg.gateStatus,
      sg.plannedDate,
      sg.outcome,
    ]);
    download("stage-gates.csv", toCsv(headers, rows));
  }

  function exportBenefits() {
    const headers = [
      "Title",
      "Project",
      "Type",
      "Target ($)",
      "Realised ($)",
      "Status",
      "Owner",
    ];
    const rows = benefits.map((b) => [
      b.title,
      b.project,
      b.benefitType,
      b.targetValue,
      b.realisedValue,
      b.status,
      b.owner,
    ]);
    download("benefits.csv", toCsv(headers, rows));
  }

  function exportCbSummary() {
    const headers = ["Metric", "Value"];
    const rows: (string | number)[][] = [
      ["Total cost", cbSummary.cost],
      ["Benefits target", cbSummary.benefit],
      ["Benefits realised", cbSummary.realised],
      ["Net value", cbSummary.net],
      ["ROI", cbSummary.roi],
      ["BCR", cbSummary.bcr],
    ];
    download("cost-benefit-summary.csv", toCsv(headers, rows));
  }

  const packs = [
    {
      label: "Risk register",
      count: risks.length,
      fn: exportRisks,
      desc: "All risks with P×I scores and RAG",
    },
    {
      label: "Decisions",
      count: decisions.length,
      fn: exportDecisions,
      desc: "Decision log with outcomes",
    },
    {
      label: "Actions",
      count: actions.length,
      fn: exportActions,
      desc: "Open and closed actions with owners",
    },
    {
      label: "Stage gates",
      count: stageGates.length,
      fn: exportStageGates,
      desc: "Gate schedule and outcomes",
    },
    {
      label: "Benefits register",
      count: benefits.length,
      fn: exportBenefits,
      desc: "Benefit targets and realisation",
    },
    {
      label: "Cost vs benefit summary",
      count: 1,
      fn: exportCbSummary,
      desc: "Portfolio ROI, BCR, net value",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {packs.map((pack) => (
        <Card key={pack.label} className="flex flex-col gap-3">
          <div>
            <h4 className="font-semibold">{pack.label}</h4>
            <p className="text-xs text-[var(--ink-soft)]">{pack.desc}</p>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--ink-soft)]">{pack.count} rows</span>
            <Button variant="secondary" onClick={pack.fn}>
              Export CSV
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
