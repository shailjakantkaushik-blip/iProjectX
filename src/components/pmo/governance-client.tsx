"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";

export function DecisionsClient({
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
    title: "",
    description: "",
    projectId: "",
    owner: "",
    decidedOn: "",
    outcome: "",
    status: "Pending",
  });

  if (!canEdit) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/decisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, projectId: form.projectId || null, decidedOn: form.decidedOn || null }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Save failed");
      return;
    }
    setForm({
      title: "",
      description: "",
      projectId: "",
      owner: "",
      decidedOn: "",
      outcome: "",
      status: "Pending",
    });
    startTransition(() => router.refresh());
  }

  return (
    <Card className="mb-4">
      <h3 className="text-sm font-semibold">Add decision</h3>
      <form onSubmit={save} className="mt-3 grid gap-3">
        <div>
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
        <div className="grid gap-3 sm:grid-cols-2">
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
              {["Pending", "Approved", "Rejected", "Deferred"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <Label>Outcome</Label>
          <Input value={form.outcome} onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))} />
        </div>
        <Button type="submit" disabled={pending}>
          Add decision
        </Button>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </form>
    </Card>
  );
}

export function ActionsClient({
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
    title: "",
    projectId: "",
    owner: "",
    dueDate: "",
    priority: "Medium",
    status: "Open",
  });

  if (!canEdit) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, projectId: form.projectId || null, dueDate: form.dueDate || null }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Save failed");
      return;
    }
    setForm({
      title: "",
      projectId: "",
      owner: "",
      dueDate: "",
      priority: "Medium",
      status: "Open",
    });
    startTransition(() => router.refresh());
  }

  return (
    <Card className="mb-4">
      <h3 className="text-sm font-semibold">Add action</h3>
      <form onSubmit={save} className="mt-3 grid gap-3">
        <div>
          <Label>Action</Label>
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Owner</Label>
            <Input value={form.owner} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} />
          </div>
          <div>
            <Label>Due date</Label>
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Priority</Label>
            <select
              className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            >
              {["Critical", "High", "Medium", "Low"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Status</Label>
            <select
              className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              {["Open", "In Progress", "Done", "Blocked"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button type="submit" disabled={pending}>
          Add action
        </Button>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </form>
    </Card>
  );
}
