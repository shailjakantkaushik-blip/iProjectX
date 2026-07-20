"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";

const FY_OPTIONS = ["FY24", "FY25", "FY26", "FY27", "FY28"];

export function FyAllocClient({
  projects,
  canEdit,
}: {
  projects: { id: string; code: string; name: string }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    projectId: "",
    fy: "",
    budgetPct: "",
    forecastPct: "",
    budgetAmount: "",
    forecastAmount: "",
    notes: "",
  });

  if (!canEdit) return null;

  const selectedProject = projects.find((p) => p.id === form.projectId);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.fy) {
      setError("Financial year is required");
      return;
    }
    const res = await fetch("/api/fy-allocations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: form.projectId || null,
        projectCode: selectedProject?.code || "PORTFOLIO",
        projectName: selectedProject?.name || null,
        fy: form.fy,
        budgetPct: parseFloat(form.budgetPct) || 0,
        forecastPct: parseFloat(form.forecastPct) || 0,
        budgetAmount: parseFloat(form.budgetAmount) || 0,
        forecastAmount: parseFloat(form.forecastAmount) || 0,
        notes: form.notes || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Save failed");
      return;
    }
    setForm({
      projectId: "",
      fy: "",
      budgetPct: "",
      forecastPct: "",
      budgetAmount: "",
      forecastAmount: "",
      notes: "",
    });
    startTransition(() => router.refresh());
  }

  return (
    <Card className="mb-6">
      <h3 className="font-[family-name:var(--font-display)] text-xl">Add / update FY allocation</h3>
      <form onSubmit={save} className="mt-4 grid gap-3 md:grid-cols-3">
        <div>
          <Label htmlFor="fya-project">Project</Label>
          <select
            id="fya-project"
            className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
            value={form.projectId}
            onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
          >
            <option value="">Portfolio (all)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} · {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="fya-fy">Financial year</Label>
          <select
            id="fya-fy"
            className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
            value={form.fy}
            onChange={(e) => setForm((f) => ({ ...f, fy: e.target.value }))}
            required
          >
            <option value="">— select FY —</option>
            {FY_OPTIONS.map((fy) => (
              <option key={fy} value={fy}>
                {fy}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="fya-ba">Budget amount ($)</Label>
          <Input
            id="fya-ba"
            type="number"
            min={0}
            step={1000}
            value={form.budgetAmount}
            onChange={(e) => setForm((f) => ({ ...f, budgetAmount: e.target.value }))}
            placeholder="0"
          />
        </div>

        <div>
          <Label htmlFor="fya-fa">Forecast amount ($)</Label>
          <Input
            id="fya-fa"
            type="number"
            min={0}
            step={1000}
            value={form.forecastAmount}
            onChange={(e) => setForm((f) => ({ ...f, forecastAmount: e.target.value }))}
            placeholder="0"
          />
        </div>

        <div>
          <Label htmlFor="fya-bp">Budget %</Label>
          <Input
            id="fya-bp"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={form.budgetPct}
            onChange={(e) => setForm((f) => ({ ...f, budgetPct: e.target.value }))}
            placeholder="0"
          />
        </div>

        <div>
          <Label htmlFor="fya-fp">Forecast %</Label>
          <Input
            id="fya-fp"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={form.forecastPct}
            onChange={(e) => setForm((f) => ({ ...f, forecastPct: e.target.value }))}
            placeholder="0"
          />
        </div>

        <div className="md:col-span-3">
          <Label htmlFor="fya-notes">Notes</Label>
          <Input
            id="fya-notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>

        <div className="md:col-span-3">
          <Button type="submit" disabled={pending}>
            Save allocation
          </Button>
          {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
        </div>
      </form>
    </Card>
  );
}
