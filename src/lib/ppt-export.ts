import { toast } from "sonner";
import type { DomainBundle } from "@/lib/domain";
import { fmtMoney } from "@/lib/portfolio-engine";

/** Build a lightweight HTML→downloadable "PPT-like" briefing (HTML slides)
 *  plus a true PPTX when pptxgenjs is available. */
export async function exportPortfolioBriefing(bundle: DomainBundle) {
  try {
    const pptxgen = await import("pptxgenjs").catch(() => null);
    if (pptxgen?.default) {
      await buildPptx(pptxgen.default, bundle);
      return;
    }
  } catch {
    // fall through to HTML deck
  }
  downloadHtmlDeck(bundle);
}

async function buildPptx(
  PptxGenJS: new () => {
    author: string;
    title: string;
    addSlide: () => {
      addText: (t: string, o: Record<string, unknown>) => void;
      addShape: (t: unknown, o: Record<string, unknown>) => void;
      background: { color: string };
    };
    ShapeType: { rect: unknown };
    writeFile: (o: { fileName: string }) => Promise<void>;
  },
  bundle: DomainBundle,
) {
  const pptx = new PptxGenJS();
  pptx.author = "PMO Portfolio";
  pptx.title = "Portfolio Briefing";

  const dark = "0F172A";
  const accent = "60A5FA";
  const white = "F8FAFC";

  const slides: { title: string; lines: string[] }[] = [
    {
      title: "Executive Cockpit",
      lines: [
        `Projects: ${bundle.projects.length}`,
        `Risks (open): ${bundle.risks.filter((r) => r.status === "Open").length}`,
        `Actions overdue: ${bundle.actions.filter((a) => a.status === "Overdue").length}`,
        `Pipeline ideas: ${bundle.pipeline.length}`,
      ],
    },
    {
      title: "Financial Snapshot",
      lines: [
        `CAPEX approved: ${fmtMoney(bundle.projects.reduce((s, p) => s + Number(p.capex_approved || 0), 0))}`,
        `OPEX approved: ${fmtMoney(bundle.projects.reduce((s, p) => s + Number(p.opex_approved || 0), 0))}`,
        `Benefits target: ${fmtMoney(bundle.projects.reduce((s, p) => s + Number(p.benefits_target || 0), 0))}`,
        `Benefits realised: ${fmtMoney(bundle.projects.reduce((s, p) => s + Number(p.benefits_realised || 0), 0))}`,
      ],
    },
    {
      title: "Top Risks",
      lines: [...bundle.risks].sort((a, b) => b.score - a.score).slice(0, 8).map((r) => `${r.score} · ${r.title}`),
    },
    {
      title: "Decisions Awaiting",
      lines: bundle.decisions
        .filter((d) => d.status === "Open" || d.status === "In Review")
        .slice(0, 8)
        .map((d) => `${d.type}: ${d.title}`),
    },
    {
      title: "Upcoming Releases",
      lines: bundle.releases.slice(0, 8).map((r) => `${r.planned_date || "TBC"} · ${r.release_name} (${r.status})`),
    },
    {
      title: "Demand Pipeline",
      lines: [...bundle.pipeline]
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map((i) => `${i.score.toFixed(1)} · ${i.idea_name} (${i.status})`),
    },
    {
      title: "Governance Gates",
      lines: [
        `Total gates: ${bundle.stageGates.length}`,
        `Approved: ${bundle.stageGates.filter((g) => g.status === "Approved").length}`,
        `Pending: ${bundle.stageGates.filter((g) => g.status.includes("Pending")).length}`,
      ],
    },
    {
      title: "Agile Delivery",
      lines: [
        `Active sprints: ${bundle.sprints.filter((s) => s.status === "Active").length}`,
        `Avg velocity: ${(
          bundle.sprints.filter((s) => s.status === "Complete").reduce((a, s) => a + s.velocity, 0) /
          Math.max(1, bundle.sprints.filter((s) => s.status === "Complete").length)
        ).toFixed(1)}`,
      ],
    },
    {
      title: "Dependencies",
      lines: bundle.dependencies.slice(0, 8).map((d) => `${d.from_name} → ${d.to_name} (${d.status})`),
    },
    {
      title: "Resources",
      lines: [
        `People: ${new Set(bundle.resources.map((r) => r.resource_name)).size}`,
        `Allocations: ${bundle.resources.length}`,
        `Over-allocated: ${bundle.resources.filter((r) => r.allocation_pct > 100).length}`,
      ],
    },
    {
      title: "Portfolio Health",
      lines: [
        `Green: ${bundle.projects.filter((p) => p.rag === "Green").length}`,
        `Amber: ${bundle.projects.filter((p) => p.rag === "Amber").length}`,
        `Red: ${bundle.projects.filter((p) => p.rag === "Red").length}`,
      ],
    },
    {
      title: "Next Steps",
      lines: [
        "Review overdue actions & pending gates",
        "Re-score demand pipeline",
        "Confirm FY allocations",
        "Export board pack from Executive Reports",
      ],
    },
  ];

  for (const s of slides) {
    const slide = pptx.addSlide();
    slide.background = { color: dark };
    slide.addText(s.title, { x: 0.5, y: 0.4, w: 9, h: 0.6, color: accent, fontSize: 28, bold: true });
    slide.addText(s.lines.join("\n") || "—", {
      x: 0.5,
      y: 1.2,
      w: 9,
      h: 4.5,
      color: white,
      fontSize: 16,
      valign: "top",
    });
  }

  await pptx.writeFile({ fileName: `Portfolio_Briefing_${new Date().toISOString().slice(0, 10)}.pptx` });
  toast.success("PowerPoint briefing downloaded");
}

function downloadHtmlDeck(bundle: DomainBundle) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Portfolio Briefing</title>
<style>
body{margin:0;font-family:Inter,Segoe UI,sans-serif;background:#0f172a;color:#f8fafc}
.slide{min-height:100vh;padding:48px;box-sizing:border-box;page-break-after:always;border-bottom:1px solid #334155}
h1{color:#60a5fa;font-size:32px;margin:0 0 24px}
li{margin:8px 0;font-size:18px}
@media print{.slide{min-height:auto}}
</style></head><body>
${[
  ["Executive Cockpit", `${bundle.projects.length} projects · ${bundle.risks.length} risks · ${bundle.actions.length} actions`],
  ["Top Risks", [...bundle.risks].sort((a, b) => b.score - a.score).slice(0, 10).map((r) => `${r.score} — ${r.title}`).join("</li><li>")],
  ["Pipeline", bundle.pipeline.map((p) => `${p.score} — ${p.idea_name}`).join("</li><li>")],
  ["Releases", bundle.releases.map((r) => `${r.planned_date || "TBC"} — ${r.release_name}`).join("</li><li>")],
]
  .map(
    ([t, body]) =>
      `<section class="slide"><h1>${t}</h1><ul><li>${body || "—"}</li></ul></section>`,
  )
  .join("")}
</body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Portfolio_Briefing_${new Date().toISOString().slice(0, 10)}.html`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Briefing deck downloaded (open in browser → Print to PDF/PPT)");
}

export function exportPageCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    toast.error("No rows to export");
    return;
  }
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
