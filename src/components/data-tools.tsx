"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "./ui";
import { Download, FileSpreadsheet, FileText, Presentation, Upload } from "lucide-react";

export function DataImportPanel({ canImport }: { canImport: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setMessage("");
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/excel/import", { method: "POST", body });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Import failed");
      return;
    }
    setMessage(`Imported ${data.rowsUpserted} rows${data.errorCount ? ` · ${data.errorCount} warnings` : ""}.`);
    startTransition(() => router.refresh());
  }

  return (
    <Card>
      <div className="flex items-start gap-3">
        <FileSpreadsheet className="mt-1 h-5 w-5 text-[var(--brand-primary)]" />
        <div className="flex-1">
          <h3 className="font-[family-name:var(--font-display)] text-xl">Excel template & import</h3>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            Download the workbook, fill or edit rows, then upload to upsert Programs, Projects, Business Cases,
            Risks, Pipeline, Decisions, Actions, Resources, Sprints, and Releases.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="/api/excel/template">
              <Button type="button" variant="secondary">
                <Download className="h-4 w-4" /> Current data workbook
              </Button>
            </a>
            <a href="/api/excel/template?blank=1">
              <Button type="button" variant="ghost">
                <Download className="h-4 w-4" /> Blank template
              </Button>
            </a>
            {canImport ? (
              <label className="inline-flex cursor-pointer">
                <span className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white">
                  <Upload className="h-4 w-4" />
                  {pending ? "Importing…" : "Upload filled workbook"}
                </span>
                <input type="file" accept=".xlsx" className="hidden" onChange={onUpload} disabled={pending} />
              </label>
            ) : null}
          </div>
          {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
          {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
        </div>
      </div>
    </Card>
  );
}

export function ExportPanel({
  enablePpt,
  enablePdf,
}: {
  enablePpt: boolean;
  enablePdf: boolean;
}) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <Presentation className="mt-1 h-5 w-5 text-[var(--brand-primary)]" />
        <div className="flex-1">
          <h3 className="font-[family-name:var(--font-display)] text-xl">Executive pack export</h3>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            Export the executive cockpit and all modules — including project business-case infographic slides —
            to PowerPoint or PDF for steering forums.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {enablePpt ? (
              <a href="/api/export/ppt">
                <Button type="button">
                  <Presentation className="h-4 w-4" /> Download PPT
                </Button>
              </a>
            ) : null}
            {enablePdf ? (
              <a href="/api/export/pdf">
                <Button type="button" variant="secondary">
                  <FileText className="h-4 w-4" /> Download PDF
                </Button>
              </a>
            ) : null}
            {!enablePpt && !enablePdf ? (
              <p className="text-sm text-[var(--ink-soft)]">Exports are disabled for this workspace.</p>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
