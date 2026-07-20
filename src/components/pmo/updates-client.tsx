"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input, Label } from "@/components/ui";

const CATEGORIES = [
  "Milestone",
  "Risk",
  "Decision",
  "Status Change",
  "Dependency",
  "Resource",
  "Financial",
  "General",
];
const IMPACTS = ["High", "Medium", "Low"];

type UpdateRow = {
  id: string;
  title: string;
  body: string;
  category: string;
  projectName: string | null;
  impact: string;
  author: string | null;
  updateDate: string | null;
  createdAt: string;
};

export function UpdatesClient({
  updates,
  projects,
  canEdit,
}: {
  updates: UpdateRow[];
  projects: { name: string; code: string }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    body: "",
    category: "General",
    projectName: projects[0]?.name || "",
    impact: "Medium",
    author: "",
    updateDate: new Date().toISOString().slice(0, 10),
  });

  function startEdit(u: UpdateRow) {
    setEditingId(u.id);
    setForm({
      title: u.title,
      body: u.body,
      category: u.category,
      projectName: u.projectName || projects[0]?.name || "",
      impact: u.impact || "Medium",
      author: u.author || "",
      updateDate: (u.updateDate || u.createdAt).slice(0, 10),
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      title: "",
      body: "",
      category: "General",
      projectName: projects[0]?.name || "",
      impact: "Medium",
      author: "",
      updateDate: new Date().toISOString().slice(0, 10),
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/updates", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Save failed");
      return;
    }
    resetForm();
    startTransition(() => router.refresh());
  }

  async function remove(id: string) {
    if (!confirm("Delete this update?")) return;
    await fetch("/api/updates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      {canEdit ? (
        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">
            {editingId ? "Edit update" : "Add new update"}
          </h3>
          <form onSubmit={save} className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <Label>Project</Label>
              <select
                className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
                value={form.projectName}
                onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))}
              >
                {projects.map((p) => (
                  <option key={p.code} value={p.name}>
                    {p.code} · {p.name}
                  </option>
                ))}
                {!projects.length ? <option value="">No projects</option> : null}
              </select>
            </div>
            <div>
              <Label>Category</Label>
              <select
                className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
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
                {IMPACTS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Update date</Label>
              <Input
                type="date"
                value={form.updateDate}
                onChange={(e) => setForm((f) => ({ ...f, updateDate: e.target.value }))}
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
            <div className="md:col-span-2">
              <Label>Details</Label>
              <textarea
                required
                className="min-h-24 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              />
            </div>
            <div>
              <Label>Author</Label>
              <Input
                value={form.author}
                onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" disabled={pending}>
                {editingId ? "Save changes" : "Add update"}
              </Button>
              {editingId ? (
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
              ) : null}
            </div>
            {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
          </form>
        </Card>
      ) : null}

      <div className="space-y-3">
        {updates.map((u) => (
          <Card key={u.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{u.title}</p>
                  <Badge>{u.category}</Badge>
                  <Badge
                    tone={u.impact === "High" ? "red" : u.impact === "Low" ? "green" : "amber"}
                  >
                    {u.impact}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-[var(--ink-soft)]">
                  {u.projectName || "Portfolio"} ·{" "}
                  {(u.updateDate || u.createdAt).slice(0, 10)}
                  {u.author ? ` · ${u.author}` : ""}
                </p>
                <p className="mt-2 text-sm whitespace-pre-wrap">{u.body}</p>
              </div>
              {canEdit ? (
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => startEdit(u)}>
                    Edit
                  </Button>
                  <Button type="button" variant="danger" onClick={() => remove(u.id)}>
                    Delete
                  </Button>
                </div>
              ) : null}
            </div>
          </Card>
        ))}
        {!updates.length ? (
          <Card>
            <p className="text-sm text-[var(--ink-soft)]">No updates yet.</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
