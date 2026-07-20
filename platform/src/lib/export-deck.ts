import PptxGenJS from "pptxgenjs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { db } from "./db";
import { formatCurrency, formatPct, riskScore } from "./utils";

export type ExportBundle = Awaited<ReturnType<typeof loadExportBundle>>;

export async function loadExportBundle(organizationId: string) {
  const [
    organization,
    projects,
    programs,
    risks,
    decisions,
    actions,
    pipeline,
    resources,
    sprints,
    releases,
    updates,
  ] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: organizationId } }),
    db.project.findMany({
      where: { organizationId },
      include: { program: true, brief: true, stageGates: true, milestones: true },
      orderBy: { code: "asc" },
    }),
    db.program.findMany({ where: { organizationId }, orderBy: { name: "asc" } }),
    db.risk.findMany({ where: { organizationId }, include: { project: true } }),
    db.decision.findMany({ where: { organizationId }, include: { project: true } }),
    db.action.findMany({ where: { organizationId }, include: { project: true } }),
    db.pipelineItem.findMany({ where: { organizationId }, orderBy: { priorityScore: "desc" } }),
    db.resource.findMany({ where: { organizationId }, include: { project: true } }),
    db.sprint.findMany({ where: { organizationId }, include: { project: true } }),
    db.release.findMany({ where: { organizationId }, include: { project: true } }),
    db.update.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const funding = projects.reduce((s, p) => s + p.funding, 0);
  const spend = projects.reduce((s, p) => s + p.spend, 0);
  const forecast = projects.reduce((s, p) => s + p.forecast, 0);

  return {
    organization,
    projects,
    programs,
    risks,
    decisions,
    actions,
    pipeline,
    resources,
    sprints,
    releases,
    updates,
    kpis: {
      funding,
      spend,
      forecast,
      active: projects.filter((p) => p.status === "Active").length,
      red: projects.filter((p) => p.rag === "Red").length,
      amber: projects.filter((p) => p.rag === "Amber").length,
      green: projects.filter((p) => p.rag === "Green").length,
      openRisks: risks.filter((r) => r.status !== "Closed").length,
    },
  };
}

function brand(org: ExportBundle["organization"]) {
  return {
    name: org.brandName || org.name,
    primary: org.primaryColor || "0F766E",
    accent: org.accentColor || "0284C7",
  };
}

function t(text: string, bold = false) {
  return bold ? { text, options: { bold: true } } : { text };
}

export async function buildPptBuffer(organizationId: string) {
  const data = await loadExportBundle(organizationId);
  const b = brand(data.organization);
  const pptx = new PptxGenJS();
  pptx.author = "iProjectX";
  pptx.title = `${b.name} Executive Pack`;
  pptx.subject = "Portfolio executive presentation";

  const cover = pptx.addSlide();
  cover.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: "100%",
    h: "100%",
    fill: { color: b.primary.replace("#", "") },
  });
  cover.addText(b.name, {
    x: 0.6,
    y: 1.8,
    w: 8.5,
    h: 0.6,
    color: "FFFFFF",
    fontSize: 18,
  });
  cover.addText("Executive Portfolio Pack", {
    x: 0.6,
    y: 2.4,
    w: 8.5,
    h: 0.8,
    color: "FFFFFF",
    fontSize: 32,
    bold: true,
  });
  cover.addText(new Date().toLocaleDateString(), {
    x: 0.6,
    y: 3.4,
    w: 8.5,
    h: 0.4,
    color: "D1FAE5",
    fontSize: 14,
  });

  const dash = pptx.addSlide();
  dash.addText("Executive Cockpit", { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 22, bold: true, color: b.primary.replace("#", "") });
  dash.addTable(
    [
      [t("Active projects", true), t(String(data.kpis.active)), t("Funded", true), t(formatCurrency(data.kpis.funding))],
      [t("Spend", true), t(formatCurrency(data.kpis.spend)), t("Forecast", true), t(formatCurrency(data.kpis.forecast))],
      [
        t("RAG G/A/R", true),
        t(`${data.kpis.green}/${data.kpis.amber}/${data.kpis.red}`),
        t("Open risks", true),
        t(String(data.kpis.openRisks)),
      ],
    ],
    { x: 0.5, y: 1.0, w: 9, colW: [2.2, 2.3, 2.2, 2.3], border: [{ pt: 0.5, color: "D5E3DE" }, { pt: 0.5, color: "D5E3DE" }, { pt: 0.5, color: "D5E3DE" }, { pt: 0.5, color: "D5E3DE" }], fontSize: 12 }
  );

  const projects = pptx.addSlide();
  projects.addText("Projects", { x: 0.5, y: 0.3, w: 9, h: 0.4, fontSize: 22, bold: true, color: b.primary.replace("#", "") });
  projects.addTable(
    [
      [t("Code", true), t("Name", true), t("RAG", true), t("Stage", true), t("Progress", true), t("Funding", true)],
      ...data.projects.slice(0, 12).map((p) => [
        t(p.code),
        t(p.name),
        t(p.rag),
        t(p.stage),
        t(formatPct(p.progress)),
        t(formatCurrency(p.funding)),
      ]),
    ],
    { x: 0.4, y: 0.9, w: 9.2, fontSize: 10, border: [{ pt: 0.4, color: "D5E3DE" }, { pt: 0.4, color: "D5E3DE" }, { pt: 0.4, color: "D5E3DE" }, { pt: 0.4, color: "D5E3DE" }], colW: [1.1, 2.8, 0.9, 1.6, 1.1, 1.7] }
  );

  const programs = pptx.addSlide();
  programs.addText("Programs", { x: 0.5, y: 0.3, w: 9, h: 0.4, fontSize: 22, bold: true, color: b.primary.replace("#", "") });
  programs.addTable(
    [
      [t("Program", true), t("Owner", true), t("Budget", true), t("Forecast", true), t("Status", true)],
      ...data.programs.map((p) => [
        t(p.name),
        t(p.owner || "—"),
        t(formatCurrency(p.budget)),
        t(formatCurrency(p.forecast)),
        t(p.status),
      ]),
    ],
    { x: 0.5, y: 0.9, w: 9, fontSize: 11, border: [{ pt: 0.4, color: "D5E3DE" }, { pt: 0.4, color: "D5E3DE" }, { pt: 0.4, color: "D5E3DE" }, { pt: 0.4, color: "D5E3DE" }] }
  );

  const risks = pptx.addSlide();
  risks.addText("Risks", { x: 0.5, y: 0.3, w: 9, h: 0.4, fontSize: 22, bold: true, color: b.primary.replace("#", "") });
  risks.addTable(
    [
      [t("Code", true), t("Title", true), t("P×I×V", true), t("RAG", true), t("Owner", true)],
      ...data.risks.slice(0, 12).map((r) => [
        t(r.code),
        t(r.title),
        t(String(riskScore(r.probability, r.impact, r.velocity))),
        t(r.rag),
        t(r.owner || "—"),
      ]),
    ],
    { x: 0.4, y: 0.9, w: 9.2, fontSize: 10, border: [{ pt: 0.4, color: "D5E3DE" }, { pt: 0.4, color: "D5E3DE" }, { pt: 0.4, color: "D5E3DE" }, { pt: 0.4, color: "D5E3DE" }] }
  );

  const finance = pptx.addSlide();
  finance.addText("Financials", { x: 0.5, y: 0.3, w: 9, h: 0.4, fontSize: 22, bold: true, color: b.primary.replace("#", "") });
  finance.addTable(
    [
      [t("Project", true), t("Funding", true), t("Spend", true), t("Forecast", true), t("Benefits", true)],
      ...data.projects.slice(0, 12).map((p) => [
        t(p.name),
        t(formatCurrency(p.funding)),
        t(formatCurrency(p.spend)),
        t(formatCurrency(p.forecast)),
        t(`${formatCurrency(p.benefitsRealised)} / ${formatCurrency(p.benefitsTarget)}`),
      ]),
    ],
    { x: 0.4, y: 0.9, w: 9.2, fontSize: 10, border: [{ pt: 0.4, color: "D5E3DE" }, { pt: 0.4, color: "D5E3DE" }, { pt: 0.4, color: "D5E3DE" }, { pt: 0.4, color: "D5E3DE" }] }
  );

  const pipeline = pptx.addSlide();
  pipeline.addText("Demand Pipeline", { x: 0.5, y: 0.3, w: 9, h: 0.4, fontSize: 22, bold: true, color: b.primary.replace("#", "") });
  pipeline.addTable(
    [
      [t("Code", true), t("Title", true), t("Score", true), t("Budget", true), t("Decision", true)],
      ...data.pipeline.slice(0, 12).map((i) => [
        t(i.code),
        t(i.title),
        t(i.priorityScore.toFixed(2)),
        t(formatCurrency(i.estBudget)),
        t(i.decision),
      ]),
    ],
    { x: 0.4, y: 0.9, w: 9.2, fontSize: 10, border: [{ pt: 0.4, color: "D5E3DE" }, { pt: 0.4, color: "D5E3DE" }, { pt: 0.4, color: "D5E3DE" }, { pt: 0.4, color: "D5E3DE" }] }
  );

  const gov = pptx.addSlide();
  gov.addText("Governance — Decisions & Actions", {
    x: 0.5,
    y: 0.3,
    w: 9,
    h: 0.4,
    fontSize: 20,
    bold: true,
    color: b.primary.replace("#", ""),
  });
  gov.addTable(
    [
      [t("Decision", true), t("Status", true), t("Owner", true)],
      ...data.decisions.slice(0, 6).map((d) => [t(d.title), t(d.status), t(d.owner || "—")]),
    ],
    { x: 0.4, y: 0.9, w: 9.2, fontSize: 10, border: [{ pt: 0.4, color: "D5E3DE" }, { pt: 0.4, color: "D5E3DE" }, { pt: 0.4, color: "D5E3DE" }, { pt: 0.4, color: "D5E3DE" }] }
  );
  gov.addTable(
    [
      [t("Action", true), t("Priority", true), t("Status", true)],
      ...data.actions.slice(0, 6).map((a) => [t(a.title), t(a.priority), t(a.status)]),
    ],
    { x: 0.4, y: 3.3, w: 9.2, fontSize: 10, border: [{ pt: 0.4, color: "D5E3DE" }, { pt: 0.4, color: "D5E3DE" }, { pt: 0.4, color: "D5E3DE" }, { pt: 0.4, color: "D5E3DE" }] }
  );

  // Business case / infographic slides
  for (const project of data.projects.filter((p) => p.brief).slice(0, 8)) {
    const slide = pptx.addSlide();
    slide.addText(`${project.code} — Business Case`, {
      x: 0.4,
      y: 0.25,
      w: 9.2,
      h: 0.4,
      fontSize: 18,
      bold: true,
      color: b.primary.replace("#", ""),
    });
    slide.addText(project.name, { x: 0.4, y: 0.65, w: 9.2, h: 0.3, fontSize: 12, color: "4B635C" });
    const brief = project.brief!;
    const blocks: [string, string][] = [
      ["Problem", brief.problemStatement || "—"],
      ["Solution", brief.proposedSolution || "—"],
      ["Scope", brief.scope || "—"],
      ["Benefits", brief.expectedBenefits || "—"],
      ["Key risks", brief.keyRisks || "—"],
      ["Recommendation", brief.recommendation || "—"],
    ];
    let y = 1.1;
    for (const [label, body] of blocks) {
      slide.addText(label, { x: 0.4, y, w: 9.2, h: 0.25, fontSize: 11, bold: true, color: b.accent.replace("#", "") });
      slide.addText(body, { x: 0.4, y: y + 0.22, w: 9.2, h: 0.45, fontSize: 10, color: "10241F" });
      y += 0.7;
    }
    slide.addText(`Funding ask: ${formatCurrency(brief.fundingAsk || project.funding)}`, {
      x: 0.4,
      y: 5.1,
      w: 9.2,
      h: 0.3,
      fontSize: 12,
      bold: true,
    });
  }

  const agile = pptx.addSlide();
  agile.addText("Agile & Releases", { x: 0.5, y: 0.3, w: 9, h: 0.4, fontSize: 22, bold: true, color: b.primary.replace("#", "") });
  agile.addTable(
    [
      [t("Sprint", true), t("Project", true), t("Velocity", true), t("Status", true)],
      ...data.sprints.slice(0, 8).map((s) => [
        t(s.name),
        t(s.project?.name || "—"),
        t(`${s.completedPts}/${s.committedPts}`),
        t(s.status),
      ]),
    ],
    { x: 0.4, y: 0.9, w: 9.2, fontSize: 10, border: [{ pt: 0.4, color: "D5E3DE" }, { pt: 0.4, color: "D5E3DE" }, { pt: 0.4, color: "D5E3DE" }, { pt: 0.4, color: "D5E3DE" }] }
  );

  const buffer = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return buffer;
}

export async function buildPdfBuffer(organizationId: string) {
  const data = await loadExportBundle(organizationId);
  const b = brand(data.organization);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const primary = b.primary;

  doc.setFillColor(primary);
  doc.rect(0, 0, 595, 120, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text(b.name, 40, 50);
  doc.setFontSize(16);
  doc.text("Executive Portfolio Pack", 40, 78);
  doc.setFontSize(11);
  doc.text(new Date().toLocaleDateString(), 40, 100);

  doc.setTextColor(16, 36, 31);
  doc.setFontSize(16);
  doc.text("Executive Cockpit", 40, 160);
  autoTable(doc, {
    startY: 175,
    head: [["KPI", "Value", "KPI", "Value"]],
    body: [
      ["Active projects", String(data.kpis.active), "Funded", formatCurrency(data.kpis.funding)],
      ["Spend", formatCurrency(data.kpis.spend), "Forecast", formatCurrency(data.kpis.forecast)],
      ["RAG G/A/R", `${data.kpis.green}/${data.kpis.amber}/${data.kpis.red}`, "Open risks", String(data.kpis.openRisks)],
    ],
    theme: "grid",
    headStyles: { fillColor: [15, 118, 110] },
  });

  doc.addPage();
  doc.setFontSize(16);
  doc.text("Projects", 40, 50);
  autoTable(doc, {
    startY: 65,
    head: [["Code", "Name", "RAG", "Stage", "Progress", "Funding"]],
    body: data.projects.map((p) => [
      p.code,
      p.name,
      p.rag,
      p.stage,
      formatPct(p.progress),
      formatCurrency(p.funding),
    ]),
    theme: "striped",
    headStyles: { fillColor: [15, 118, 110] },
    styles: { fontSize: 9 },
  });

  doc.addPage();
  doc.setFontSize(16);
  doc.text("Programs", 40, 50);
  autoTable(doc, {
    startY: 65,
    head: [["Program", "Owner", "Budget", "Forecast", "Status"]],
    body: data.programs.map((p) => [
      p.name,
      p.owner || "—",
      formatCurrency(p.budget),
      formatCurrency(p.forecast),
      p.status,
    ]),
    headStyles: { fillColor: [15, 118, 110] },
  });

  doc.addPage();
  doc.setFontSize(16);
  doc.text("Risks", 40, 50);
  autoTable(doc, {
    startY: 65,
    head: [["Code", "Title", "Score", "RAG", "Status"]],
    body: data.risks.map((r) => [
      r.code,
      r.title,
      String(riskScore(r.probability, r.impact, r.velocity)),
      r.rag,
      r.status,
    ]),
    headStyles: { fillColor: [15, 118, 110] },
    styles: { fontSize: 9 },
  });

  doc.addPage();
  doc.setFontSize(16);
  doc.text("Financials", 40, 50);
  autoTable(doc, {
    startY: 65,
    head: [["Project", "Funding", "Spend", "Forecast", "Benefits"]],
    body: data.projects.map((p) => [
      p.name,
      formatCurrency(p.funding),
      formatCurrency(p.spend),
      formatCurrency(p.forecast),
      formatCurrency(p.benefitsRealised),
    ]),
    headStyles: { fillColor: [15, 118, 110] },
    styles: { fontSize: 9 },
  });

  doc.addPage();
  doc.setFontSize(16);
  doc.text("Demand Pipeline", 40, 50);
  autoTable(doc, {
    startY: 65,
    head: [["Code", "Title", "Score", "Budget", "Decision"]],
    body: data.pipeline.map((i) => [
      i.code,
      i.title,
      i.priorityScore.toFixed(2),
      formatCurrency(i.estBudget),
      i.decision,
    ]),
    headStyles: { fillColor: [15, 118, 110] },
  });

  doc.addPage();
  doc.setFontSize(16);
  doc.text("Governance", 40, 50);
  autoTable(doc, {
    startY: 65,
    head: [["Decision", "Status", "Owner"]],
    body: data.decisions.map((d) => [d.title, d.status, d.owner || "—"]),
    headStyles: { fillColor: [15, 118, 110] },
  });
  autoTable(doc, {
    head: [["Action", "Priority", "Status"]],
    body: data.actions.map((a) => [a.title, a.priority, a.status]),
    headStyles: { fillColor: [15, 118, 110] },
  });

  for (const project of data.projects.filter((p) => p.brief)) {
    doc.addPage();
    const brief = project.brief!;
    doc.setFontSize(16);
    doc.text(`${project.code} — Business Case Infographic`, 40, 50);
    doc.setFontSize(12);
    doc.text(project.name, 40, 70);
    autoTable(doc, {
      startY: 90,
      head: [["Section", "Content"]],
      body: [
        ["Strategic alignment", brief.strategicAlignment || "—"],
        ["Problem", brief.problemStatement || "—"],
        ["Solution", brief.proposedSolution || "—"],
        ["Scope", brief.scope || "—"],
        ["Out of scope", brief.outOfScope || "—"],
        ["Funding ask", formatCurrency(brief.fundingAsk || project.funding)],
        ["Expected benefits", brief.expectedBenefits || "—"],
        ["Key risks", brief.keyRisks || "—"],
        ["Success metrics", brief.successMetrics || "—"],
        ["Recommendation", brief.recommendation || "—"],
        ["Stakeholders", brief.stakeholderSummary || "—"],
      ],
      headStyles: { fillColor: [15, 118, 110] },
      columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 390 } },
      styles: { fontSize: 9, cellPadding: 4 },
    });
  }

  doc.addPage();
  doc.setFontSize(16);
  doc.text("Resources / Agile / Releases", 40, 50);
  autoTable(doc, {
    startY: 65,
    head: [["Resource", "Project", "Allocation", "Capacity"]],
    body: data.resources.map((r) => [
      r.name,
      r.project?.name || "—",
      `${r.allocationPct}%`,
      `${r.capacityPct}%`,
    ]),
    headStyles: { fillColor: [15, 118, 110] },
    styles: { fontSize: 9 },
  });
  autoTable(doc, {
    head: [["Sprint", "Pts", "Status"]],
    body: data.sprints.map((s) => [s.name, `${s.completedPts}/${s.committedPts}`, s.status]),
    headStyles: { fillColor: [15, 118, 110] },
  });
  autoTable(doc, {
    head: [["Release", "Title", "Status"]],
    body: data.releases.map((r) => [r.version, r.title, r.status]),
    headStyles: { fillColor: [15, 118, 110] },
  });

  return Buffer.from(doc.output("arraybuffer"));
}
