"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";

const CATEGORIES = [
  "Run",
  "Grow",
  "Transform",
  "Mandatory",
  "Strategic",
  "Operational",
  "Innovation",
  "Maintenance",
];

export function MovementsClient({
  projects,
  canEdit,
}: {
  projects: { id: string; code: string; name: string; portfolioCategory?: string | null }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    projectId: "",
    fromCategory: "",
    toCategory: "",
    reason: "",
  });

  if (!canEdit) return null;

  const selectedProject = projects.find((p) => p.id === form.projectId);

  function onProjectChange(id: string) {
    const p = projects.find((pr) => pr.id === id);
    setForm((f) => ({
      ...f,
      projectId: id,
      fromCategory: p?.portfolioCategory || "",
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.projectId) {
      setError("Select a project");
      return;
    }
    if (form.fromCategory === form.toCategory) {
      setError("From and To categories must differ");
      return;
    }
    const res = await fetch("/api/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: form.projectId,
        projectCode: selectedProject?.code || "",
        projectName: selectedProject?.name || "",
        fromCategory: form.fromCategory,
        toCategory: form.toCategory,
        reason: form.reason || null,
        updateProject: true,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Save failed");
      return;
    }
    setForm({ projectId: "", fromCategory: "", toCategory: "", reason: "" });
    startTransition(() => router.refresh());
  }

  return (
    <Card className="mb-6">
      <h3 className="font-[family-name:var(--font-display)] text-xl">Reclassify project</h3>
      <form onSubmit={save} className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label htmlFor="mv-project">Project</Label>
          <select
            id="mv-project"
            className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
            value={form.projectId}
            onChange={(e) => onProjectChange(e.target.value)}
            required
          >
            <option value="">— select project —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} · {p.name}
                {p.portfolioCategory ? ` (${p.portfolioCategory})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="mv-from">From category</Label>
          <select
            id="mv-from"
            className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
            value={form.fromCategory}
            onChange={(e) => setForm((f) => ({ ...f, fromCategory: e.target.value }))}
            required
          >
            <option value="">— select —</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="mv-to">To category</Label>
          <select
            id="mv-to"
            className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
            value={form.toCategory}
            onChange={(e) => setForm((f) => ({ ...f, toCategory: e.target.value }))}
            required
          >
            <option value="">— select —</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="mv-reason">Reason</Label>
          <Input
            id="mv-reason"
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            placeholder="Strategic realignment, funding change…"
          />
        </div>

        <div className="md:col-span-2">
          <Button type="submit" disabled={pending}>
            Record movement
          </Button>
          {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
        </div>
      </form>
    </Card>
  );
}
