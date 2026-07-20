"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";

export function RisksClient({
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
    code: "",
    title: "",
    description: "",
    projectId: "",
    probability: 3,
    impact: 3,
    velocity: 2,
    owner: "",
    mitigation: "",
    status: "Open",
  });

  if (!canEdit) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/risks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        projectId: form.projectId || null,
        probability: Number(form.probability),
        impact: Number(form.impact),
        velocity: Number(form.velocity),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Save failed");
      return;
    }
    setForm({
      code: "",
      title: "",
      description: "",
      projectId: "",
      probability: 3,
      impact: 3,
      velocity: 2,
      owner: "",
      mitigation: "",
      status: "Open",
    });
    startTransition(() => router.refresh());
  }

  return (
    <Card className="mb-6">
      <h3 className="font-[family-name:var(--font-display)] text-xl">Add risk</h3>
      <form onSubmit={save} className="mt-4 grid gap-3 md:grid-cols-3">
        <div>
          <Label>Code</Label>
          <Input
            required
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            placeholder="R-001"
          />
        </div>
        <div className="md:col-span-2">
          <Label>Title</Label>
          <Input
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </div>
        <div>
          <Label>Project</Label>
          <select
            className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
            value={form.projectId}
            onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
          >
            <option value="">Portfolio</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} · {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Probability (1-5)</Label>
          <Input
            type="number"
            min={1}
            max={5}
            value={form.probability}
            onChange={(e) => setForm((f) => ({ ...f, probability: Number(e.target.value) }))}
          />
        </div>
        <div>
          <Label>Impact (1-5)</Label>
          <Input
            type="number"
            min={1}
            max={5}
            value={form.impact}
            onChange={(e) => setForm((f) => ({ ...f, impact: Number(e.target.value) }))}
          />
        </div>
        <div>
          <Label>Velocity (1-5)</Label>
          <Input
            type="number"
            min={1}
            max={5}
            value={form.velocity}
            onChange={(e) => setForm((f) => ({ ...f, velocity: Number(e.target.value) }))}
          />
        </div>
        <div>
          <Label>Owner</Label>
          <Input value={form.owner} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} />
        </div>
        <div>
          <Label>Status</Label>
          <select
            className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          >
            {["Open", "Mitigating", "Closed"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3">
          <Label>Mitigation</Label>
          <Input
            value={form.mitigation}
            onChange={(e) => setForm((f) => ({ ...f, mitigation: e.target.value }))}
          />
        </div>
        <div className="md:col-span-3">
          <Button type="submit" disabled={pending}>
            Add risk
          </Button>
          {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
        </div>
      </form>
    </Card>
  );
}
