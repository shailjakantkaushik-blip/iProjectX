"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";

const STAGES = [
  "Initiation",
  "Planning",
  "Design",
  "Build",
  "Test",
  "Deploy",
  "Closure",
  "Discovery",
  "Alpha",
  "Beta",
  "Live",
];

export function PhaseFinancialsClient({
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
    stage: "",
    plannedStart: "",
    plannedEnd: "",
    budget: "",
    forecast: "",
    actual: "",
    status: "Planned",
    notes: "",
  });

  if (!canEdit) return null;

  const selectedProject = projects.find((p) => p.id === form.projectId);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/phase-financials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: form.projectId || null,
        projectCode: selectedProject?.code || form.projectId,
        projectName: selectedProject?.name || null,
        stage: form.stage,
        plannedStart: form.plannedStart || null,
        plannedEnd: form.plannedEnd || null,
        budget: parseFloat(form.budget) || 0,
        forecast: parseFloat(form.forecast) || 0,
        actual: parseFloat(form.actual) || 0,
        status: form.status,
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
      stage: "",
      plannedStart: "",
      plannedEnd: "",
      budget: "",
      forecast: "",
      actual: "",
      status: "Planned",
      notes: "",
    });
    startTransition(() => router.refresh());
  }

  return (
    <Card className="mb-6">
      <h3 className="font-[family-name:var(--font-display)] text-xl">Add phase financial</h3>
      <form onSubmit={save} className="mt-4 grid gap-3 md:grid-cols-3">
        <div>
          <Label htmlFor="pf-project">Project</Label>
          <select
            id="pf-project"
            className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
            value={form.projectId}
            onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
          >
            <option value="">Portfolio level</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} · {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="pf-stage">Stage</Label>
          <select
            id="pf-stage"
            className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
            value={form.stage}
            onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
            required
          >
            <option value="">— select stage —</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="pf-status">Status</Label>
          <select
            id="pf-status"
            className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          >
            {["Planned", "In Progress", "Complete", "On Hold"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="pf-ps">Planned start</Label>
          <Input
            id="pf-ps"
            type="date"
            value={form.plannedStart}
            onChange={(e) => setForm((f) => ({ ...f, plannedStart: e.target.value }))}
          />
        </div>

        <div>
          <Label htmlFor="pf-pe">Planned end</Label>
          <Input
            id="pf-pe"
            type="date"
            value={form.plannedEnd}
            onChange={(e) => setForm((f) => ({ ...f, plannedEnd: e.target.value }))}
          />
        </div>

        <div>
          <Label htmlFor="pf-budget">Budget ($)</Label>
          <Input
            id="pf-budget"
            type="number"
            min={0}
            step={1000}
            value={form.budget}
            onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
            placeholder="0"
          />
        </div>

        <div>
          <Label htmlFor="pf-forecast">Forecast ($)</Label>
          <Input
            id="pf-forecast"
            type="number"
            min={0}
            step={1000}
            value={form.forecast}
            onChange={(e) => setForm((f) => ({ ...f, forecast: e.target.value }))}
            placeholder="0"
          />
        </div>

        <div>
          <Label htmlFor="pf-actual">Actual ($)</Label>
          <Input
            id="pf-actual"
            type="number"
            min={0}
            step={1000}
            value={form.actual}
            onChange={(e) => setForm((f) => ({ ...f, actual: e.target.value }))}
            placeholder="0"
          />
        </div>

        <div>
          <Label htmlFor="pf-notes">Notes</Label>
          <Input
            id="pf-notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>

        <div className="md:col-span-3">
          <Button type="submit" disabled={pending}>
            Add phase
          </Button>
          {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
        </div>
      </form>
    </Card>
  );
}
