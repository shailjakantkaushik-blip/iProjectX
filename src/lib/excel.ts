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

export function downloadTemplate() {
  const sample = [
    {
      project_code: "PRJ-001", name: "Sample Project", program: "Growth", sponsor: "Jane Doe",
      priority: "High", status: "In Progress", rag: "Green", current_phase: "Execute",
      delivery_method: "Agile", start_date: "2026-01-01", end_date: "2026-12-31", target_go_live: "2026-11-30",
      budget: 500000, capex_approved: 300000, capex_incurred: 120000,
      opex_approved: 200000, opex_incurred: 80000,
      benefits_target: 800000, benefits_realised: 100000, roi_percent: 60,
      description: "Example project — replace with your own.",
    },
  ];
  const ws = XLSX.utils.json_to_sheet(sample, { header: PROJECT_COLUMNS as string[] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Projects");
  XLSX.writeFile(wb, "PMO_Projects_Template.xlsx");
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
