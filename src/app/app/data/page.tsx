import { redirect } from "next/navigation";
import { canEdit, getCurrentContext } from "@/lib/auth";
import { getSiteConfig } from "@/lib/site-config";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { DataImportPanel, ExportPanel } from "@/components/data-tools";
import { DataEditorPanel } from "@/components/pmo/data-editor-panel";

export default async function DataPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const site = await getSiteConfig();

  const jobs = await db.importJob.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <div>
      <PageHeader
        title="Data Editor & Exports"
        description="Streamlit Data Editor parity — in-app register editing, Excel round-trip, and executive PPT/PDF packs."
      />

      <div className="grid gap-6">
        <DataEditorPanel canEdit={canEdit(ctx.membership.role)} />

        {site.enableExcelImport && ctx.organization.enableExcelImport ? (
          <DataImportPanel canImport={canEdit(ctx.membership.role)} />
        ) : (
          <p className="text-sm text-[var(--ink-soft)]">
            Excel import is disabled by platform or workspace settings.
          </p>
        )}

        <ExportPanel
          enablePpt={site.enablePptExport && ctx.organization.enablePptExport}
          enablePdf={site.enablePdfExport && ctx.organization.enablePdfExport}
        />

        {jobs.length ? (
          <div className="rounded-2xl bg-white/60 p-5 ring-1 ring-black/5">
            <h3 className="font-[family-name:var(--font-display)] text-xl">Recent imports</h3>
            <div className="table-wrap mt-3">
              <table className="data">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Rows</th>
                    <th>Errors</th>
                    <th>Status</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.id}>
                      <td>{j.filename}</td>
                      <td>{j.rowsUpserted}</td>
                      <td>{j.errorCount}</td>
                      <td>{j.status}</td>
                      <td>{j.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
