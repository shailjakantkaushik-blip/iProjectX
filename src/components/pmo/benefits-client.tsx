"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";

const BENEFIT_TYPES = ["Financial", "Non-Financial", "Efficiency", "Risk Reduction", "Strategic"];
const STATUSES = ["Tracked", "Realised", "At Risk", "Not Started"];

export function BenefitsClient({
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
    title: "",
    benefitType: "Financial",
    targetValue: "",
    realisedValue: "",
    owner: "",
    status: "Tracked",
    fy: "",
    notes: "",
  });

  if (!canEdit) return null;

  const selectedProject = projects.find((p) => p.id === form.projectId);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    const res = await fetch("/api/benefits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: form.projectId || null,
        projectCode: selectedProject?.code || null,
        projectName: selectedProject?.name || null,
        title: form.title,
        benefitType: form.benefitType,
        targetValue: parseFloat(form.targetValue) || 0,
        realisedValue: parseFloat(form.realisedValue) || 0,
        owner: form.owner || null,
        status: form.status,
        fy: form.fy || null,
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
      title: "",
      benefitType: "Financial",
      targetValue: "",
      realisedValue: "",
      owner: "",
      status: "Tracked",
      fy: "",
      notes: "",
    });
    startTransition(() => router.refresh());
  }

  return (
    <Card className="mb-6">
      <h3 className="font-[family-name:var(--font-display)] text-xl">Add benefit</h3>
      <form onSubmit={save} className="mt-4 grid gap-3 md:grid-cols-3">
        <div>
          <Label htmlFor="bn-project">Project</Label>
          <select
            id="bn-project"
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

        <div className="md:col-span-2">
          <Label htmlFor="bn-title">Title</Label>
          <Input
            id="bn-title"
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Cost reduction, revenue uplift…"
          />
        </div>

        <div>
          <Label htmlFor="bn-type">Benefit type</Label>
          <select
            id="bn-type"
            className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
            value={form.benefitType}
            onChange={(e) => setForm((f) => ({ ...f, benefitType: e.target.value }))}
          >
            {BENEFIT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="bn-target">Target value ($)</Label>
          <Input
            id="bn-target"
            type="number"
            min={0}
            step={1000}
            value={form.targetValue}
            onChange={(e) => setForm((f) => ({ ...f, targetValue: e.target.value }))}
            placeholder="0"
          />
        </div>

        <div>
          <Label htmlFor="bn-realised">Realised value ($)</Label>
          <Input
            id="bn-realised"
            type="number"
            min={0}
            step={1000}
            value={form.realisedValue}
            onChange={(e) => setForm((f) => ({ ...f, realisedValue: e.target.value }))}
            placeholder="0"
          />
        </div>

        <div>
          <Label htmlFor="bn-owner">Owner</Label>
          <Input
            id="bn-owner"
            value={form.owner}
            onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
          />
        </div>

        <div>
          <Label htmlFor="bn-status">Status</Label>
          <select
            id="bn-status"
            className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="bn-fy">FY tag</Label>
          <Input
            id="bn-fy"
            value={form.fy}
            onChange={(e) => setForm((f) => ({ ...f, fy: e.target.value }))}
            placeholder="FY26"
          />
        </div>

        <div className="md:col-span-3">
          <Label htmlFor="bn-notes">Notes</Label>
          <Input
            id="bn-notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>

        <div className="md:col-span-3">
          <Button type="submit" disabled={pending}>
            Add benefit
          </Button>
          {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
        </div>
      </form>
    </Card>
  );
}
