"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";

type Register = "risks" | "decisions" | "actions" | "benefits" | "dependencies" | "updates";

const REGISTER_META: Record<
  Register,
  { label: string; endpoint: string; fields: { key: string; label: string; type?: string; required?: boolean }[] }
> = {
  risks: {
    label: "Risks",
    endpoint: "/api/risks",
    fields: [
      { key: "code", label: "Code", required: true },
      { key: "title", label: "Title", required: true },
      { key: "probability", label: "Probability", type: "number" },
      { key: "impact", label: "Impact", type: "number" },
      { key: "velocity", label: "Velocity", type: "number" },
      { key: "owner", label: "Owner" },
      { key: "status", label: "Status" },
    ],
  },
  decisions: {
    label: "Decisions",
    endpoint: "/api/decisions",
    fields: [
      { key: "title", label: "Title", required: true },
      { key: "owner", label: "Owner" },
      { key: "status", label: "Status" },
      { key: "outcome", label: "Outcome" },
    ],
  },
  actions: {
    label: "Actions",
    endpoint: "/api/actions",
    fields: [
      { key: "title", label: "Title", required: true },
      { key: "owner", label: "Owner" },
      { key: "dueDate", label: "Due date", type: "date" },
      { key: "priority", label: "Priority" },
      { key: "status", label: "Status" },
    ],
  },
  benefits: {
    label: "Benefits",
    endpoint: "/api/benefits",
    fields: [
      { key: "title", label: "Title", required: true },
      { key: "benefitType", label: "Type" },
      { key: "targetValue", label: "Target", type: "number" },
      { key: "realisedValue", label: "Realised", type: "number" },
      { key: "projectCode", label: "Project code" },
      { key: "status", label: "Status" },
    ],
  },
  dependencies: {
    label: "Dependencies",
    endpoint: "/api/dependencies",
    fields: [
      { key: "fromName", label: "From", required: true },
      { key: "toName", label: "To", required: true },
      { key: "dependencyType", label: "Type" },
      { key: "status", label: "Status" },
      { key: "impact", label: "Impact" },
    ],
  },
  updates: {
    label: "Updates",
    endpoint: "/api/updates",
    fields: [
      { key: "title", label: "Title", required: true },
      { key: "body", label: "Details", required: true },
      { key: "category", label: "Category" },
      { key: "projectName", label: "Project" },
      { key: "impact", label: "Impact" },
    ],
  },
};

export function DataEditorPanel({ canEdit }: { canEdit: boolean }) {
  const router = useRouter();
  const [register, setRegister] = useState<Register>("risks");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const meta = REGISTER_META[register];
  const [form, setForm] = useState<Record<string, string>>({});

  const defaults = useMemo(() => {
    const d: Record<string, string> = {};
    for (const f of meta.fields) d[f.key] = "";
    return d;
  }, [meta]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    const payload: Record<string, unknown> = {};
    for (const f of meta.fields) {
      const raw = form[f.key] ?? "";
      if (f.type === "number") payload[f.key] = raw === "" ? undefined : Number(raw);
      else payload[f.key] = raw || undefined;
    }
    const res = await fetch(meta.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Save failed");
      return;
    }
    setOk(`${meta.label} row saved`);
    setForm(defaults);
    startTransition(() => router.refresh());
  }

  if (!canEdit) {
    return (
      <Card>
        <p className="text-sm text-[var(--ink-soft)]">Data Editor requires an edit role (owner/admin/pm/bu_lead).</p>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="font-[family-name:var(--font-display)] text-xl">In-app Data Editor</h3>
      <p className="mt-1 text-sm text-[var(--ink-soft)]">
        Streamlit Data Editor parity — add rows to core registers without leaving the workspace.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(Object.keys(REGISTER_META) as Register[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setRegister(key);
              setForm({});
              setError("");
              setOk("");
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              register === key
                ? "bg-[var(--brand-primary)] text-white"
                : "bg-black/5 text-[var(--ink-soft)] hover:bg-black/10"
            }`}
          >
            {REGISTER_META[key].label}
          </button>
        ))}
      </div>
      <form onSubmit={save} className="mt-4 grid gap-3 md:grid-cols-2">
        {meta.fields.map((f) => (
          <div key={f.key} className={f.key === "body" || f.key === "title" ? "md:col-span-2" : ""}>
            <Label>{f.label}</Label>
            <Input
              required={f.required}
              type={f.type || "text"}
              value={form[f.key] ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
            />
          </div>
        ))}
        <div className="md:col-span-2 flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            Add {meta.label} row
          </Button>
          {ok ? <span className="text-sm text-emerald-700">{ok}</span> : null}
          {error ? <span className="text-sm text-rose-600">{error}</span> : null}
        </div>
      </form>
    </Card>
  );
}
