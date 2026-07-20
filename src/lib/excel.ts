import * as XLSX from "xlsx";

export interface ProjectRow {
  project_code?: string | null;
  name: string;
  program?: string | null;
  sponsor?: string | null;
  priority?: string | null;
  status?: string | null;
  rag?: string | null;
  current_phase?: string | null;
  delivery_method?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  target_go_live?: string | null;
  budget?: number;
  capex_approved?: number;
  capex_incurred?: number;
  opex_approved?: number;
  opex_incurred?: number;
  benefits_target?: number;
  benefits_realised?: number;
  roi_percent?: number;
  description?: string | null;
}

export const PROJECT_COLUMNS: (keyof ProjectRow)[] = [
  "project_code", "name", "program", "sponsor", "priority", "status", "rag",
  "current_phase", "delivery_method", "start_date", "end_date", "target_go_live",
  "budget", "capex_approved", "capex_incurred", "opex_approved", "opex_incurred",
  "benefits_target", "benefits_realised", "roi_percent", "description",
];

type SheetSpec = { name: string; headers: string[]; sample: Record<string, unknown>[] };

const TEMPLATE_SHEETS: SheetSpec[] = [
  {
    name: "Instructions",
    headers: ["Sheet", "Purpose", "Notes"],
    sample: [
      { Sheet: "Projects", Purpose: "Master project register", Notes: "Only this sheet is imported today; other sheets are for planning/reference." },
      { Sheet: "Business Units", Purpose: "Organisation → BU hierarchy", Notes: "Create BUs in the app under Business Units." },
      { Sheet: "Stage Gates", Purpose: "Gate approvals per project", Notes: "Link by project_code." },
      { Sheet: "Risks", Purpose: "Risk register (RAID – R)", Notes: "Probability & impact 1–5." },
      { Sheet: "Actions", Purpose: "Action log (RAID – A)", Notes: "Owner + due date required." },
      { Sheet: "Decisions", Purpose: "Decision log (RAID – D)", Notes: "Capture rationale." },
      { Sheet: "Dependencies", Purpose: "Cross-project dependencies", Notes: "predecessor → successor." },
      { Sheet: "Benefits", Purpose: "Benefit tracking", Notes: "Target vs realised, cash/non-cash." },
      { Sheet: "Financials", Purpose: "FY-level CAPEX/OPEX split", Notes: "One row per project × FY." },
      { Sheet: "Sprints", Purpose: "Agile sprint metrics", Notes: "Velocity, committed vs completed." },
      { Sheet: "Releases", Purpose: "Release calendar", Notes: "Target date + scope." },
      { Sheet: "Governance", Purpose: "Governance forums", Notes: "Cadence, chair, attendees." },
      { Sheet: "Demand Pipeline", Purpose: "Idea intake / scoring", Notes: "Pre-project demand." },
    ],
  },
  {
    name: "Projects",
    headers: PROJECT_COLUMNS as string[],
    sample: [
      {
        project_code: "PRJ-001", name: "Sample Project", program: "Growth", sponsor: "Jane Doe",
        priority: "High", status: "In Progress", rag: "Green", current_phase: "Execute",
        delivery_method: "Agile", start_date: "2026-01-01", end_date: "2026-12-31", target_go_live: "2026-11-30",
        budget: 500000, capex_approved: 300000, capex_incurred: 120000,
        opex_approved: 200000, opex_incurred: 80000,
        benefits_target: 800000, benefits_realised: 100000, roi_percent: 60,
        description: "Example project — replace with your own.",
      },
    ],
  },
  {
    name: "Business Units",
    headers: ["bu_code", "name", "lead", "description"],
    sample: [{ bu_code: "BU-DIG", name: "Digital", lead: "A. Smith", description: "Digital transformation portfolio" }],
  },
  {
    name: "Stage Gates",
    headers: ["project_code", "gate", "status", "planned_date", "actual_date", "approver", "notes"],
    sample: [{ project_code: "PRJ-001", gate: "G2 – Plan", status: "Approved", planned_date: "2026-02-15", actual_date: "2026-02-18", approver: "Steering Co", notes: "Conditional on funding" }],
  },
  {
    name: "Risks",
    headers: ["project_code", "title", "category", "probability", "impact", "rag", "owner", "mitigation", "status"],
    sample: [{ project_code: "PRJ-001", title: "Vendor delay", category: "Delivery", probability: 3, impact: 4, rag: "Amber", owner: "PM", mitigation: "Weekly vendor review", status: "Open" }],
  },
  {
    name: "Actions",
    headers: ["project_code", "title", "owner", "due_date", "status", "priority", "notes"],
    sample: [{ project_code: "PRJ-001", title: "Confirm cloud region", owner: "Tech Lead", due_date: "2026-03-01", status: "Open", priority: "High", notes: "" }],
  },
  {
    name: "Decisions",
    headers: ["project_code", "title", "decision", "decided_by", "decided_on", "rationale", "impact"],
    sample: [{ project_code: "PRJ-001", title: "Platform choice", decision: "Adopt Vendor X", decided_by: "Steering Co", decided_on: "2026-02-20", rationale: "Best TCO", impact: "Locks in 3-yr contract" }],
  },
  {
    name: "Dependencies",
    headers: ["predecessor_code", "successor_code", "type", "description", "status"],
    sample: [{ predecessor_code: "PRJ-001", successor_code: "PRJ-002", type: "Finish-to-Start", description: "API must go live first", status: "On track" }],
  },
  {
    name: "Benefits",
    headers: ["project_code", "benefit", "category", "target_value", "realised_value", "measure_date", "owner", "status"],
    sample: [{ project_code: "PRJ-001", benefit: "Revenue uplift", category: "Cash", target_value: 800000, realised_value: 100000, measure_date: "2026-12-31", owner: "Sponsor", status: "On track" }],
  },
  {
    name: "Financials",
    headers: ["project_code", "fiscal_year", "capex_plan", "capex_actual", "opex_plan", "opex_actual", "benefits_plan", "benefits_actual"],
    sample: [{ project_code: "PRJ-001", fiscal_year: "FY27", capex_plan: 300000, capex_actual: 120000, opex_plan: 200000, opex_actual: 80000, benefits_plan: 400000, benefits_actual: 50000 }],
  },
  {
    name: "Sprints",
    headers: ["project_code", "sprint_name", "start_date", "end_date", "committed_points", "completed_points", "velocity", "notes"],
    sample: [{ project_code: "PRJ-001", sprint_name: "Sprint 1", start_date: "2026-01-06", end_date: "2026-01-19", committed_points: 40, completed_points: 36, velocity: 36, notes: "" }],
  },
  {
    name: "Releases",
    headers: ["project_code", "release_name", "target_date", "actual_date", "scope", "status"],
    sample: [{ project_code: "PRJ-001", release_name: "R1.0", target_date: "2026-06-30", actual_date: "", scope: "MVP launch", status: "Planned" }],
  },
  {
    name: "Governance",
    headers: ["forum", "cadence", "chair", "attendees", "purpose"],
    sample: [{ forum: "Portfolio Steering Co", cadence: "Monthly", chair: "CIO", attendees: "BU leads, PMO", purpose: "Approve gates, review RAG" }],
  },
  {
    name: "Demand Pipeline",
    headers: ["idea_code", "title", "requester", "bu", "estimated_cost", "estimated_benefit", "priority_score", "status"],
    sample: [{ idea_code: "IDEA-001", title: "Customer portal v2", requester: "Sales", bu: "Digital", estimated_cost: 250000, estimated_benefit: 600000, priority_score: 78, status: "Under review" }],
  },
];

export function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  for (const sheet of TEMPLATE_SHEETS) {
    const ws = XLSX.utils.json_to_sheet(sheet.sample, { header: sheet.headers });
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }
  XLSX.writeFile(wb, "PMO_Portfolio_Template.xlsx");
}

export async function parseWorkbook(file: File): Promise<ProjectRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames.find((n) => n.toLowerCase() === "projects") || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
  return rows
    .filter((r) => r.name)
    .map((r) => {
      const out: Record<string, unknown> = { name: String(r.name) };
      for (const c of PROJECT_COLUMNS) {
        const v = r[c as string];
        if (v == null || v === "") continue;
        if (["budget","capex_approved","capex_incurred","opex_approved","opex_incurred","benefits_target","benefits_realised","roi_percent"].includes(c)) {
          out[c] = Number(v) || 0;
        } else if (["start_date","end_date","target_go_live"].includes(c)) {
          const d = v instanceof Date ? v : new Date(String(v));
          if (!isNaN(d.getTime())) out[c] = d.toISOString().slice(0, 10);
        } else {
          out[c] = String(v);
        }
      }
      return out as unknown as ProjectRow;
    });
}

export function exportProjects(projects: Record<string, unknown>[]) {
  const rows = projects.map((p) => {
    const o: Record<string, unknown> = {};
    for (const c of PROJECT_COLUMNS) o[c] = p[c] ?? "";
    return o;
  });
  const ws = XLSX.utils.json_to_sheet(rows, { header: PROJECT_COLUMNS as string[] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Projects");
  XLSX.writeFile(wb, `PMO_Projects_Export_${new Date().toISOString().slice(0,10)}.xlsx`);
}
