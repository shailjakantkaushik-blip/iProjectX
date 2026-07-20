"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";

export function DependenciesClient({
  projects,
  canEdit,
}: {
  projects: { id: string; name: string; code: string }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fromProjectId: projects[0]?.id || "",
    toProjectId: projects[1]?.id || projects[0]?.id || "",
    dependencyType: "Finish-to-Start",
    status: "Healthy",
    impact: "Medium",
    notes: "",
  });

  if (!canEdit) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/dependencies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Save failed");
      return;
    }
    setForm((f) => ({ ...f, notes: "" }));
    startTransition(() => router.refresh());
  }

  return (
    <Card>
      <h3 className="font-[family-name:var(--font-display)] text-xl">Add dependency</h3>
      <form onSubmit={save} className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <Label>From project</Label>
          <select
            className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
            value={form.fromProjectId}
            onChange={(e) => setForm((f) => ({ ...f, fromProjectId: e.target.value }))}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} · {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>To project</Label>
          <select
            className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
            value={form.toProjectId}
            onChange={(e) => setForm((f) => ({ ...f, toProjectId: e.target.value }))}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} · {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Type</Label>
          <Input
            value={form.dependencyType}
            onChange={(e) => setForm((f) => ({ ...f, dependencyType: e.target.value }))}
          />
        </div>
        <div>
          <Label>Status</Label>
          <select
            className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          >
            {["Healthy", "At Risk", "Blocked"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Impact</Label>
          <select
            className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
            value={form.impact}
            onChange={(e) => setForm((f) => ({ ...f, impact: e.target.value }))}
          >
            {["High", "Medium", "Low"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Notes</Label>
          <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
        <div className="md:col-span-2">
          <Button type="submit" disabled={pending || projects.length < 1}>
            Add link
          </Button>
          {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
        </div>
      </form>
    </Card>
  );
}
