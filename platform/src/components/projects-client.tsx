"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input, Label } from "./ui";
import { formatCurrency, formatPct } from "@/lib/utils";

type Project = {
  id: string;
  code: string;
  name: string;
  businessUnit: string | null;
  pm: string | null;
  priority: string;
  portfolioCategory: string;
  deliveryMethod: string;
  status: string;
  rag: string;
  stage: string;
  progress: number;
  funding: number;
  spend: number;
  program?: { name: string } | null;
};

export function ProjectsClient({
  projects,
  programs,
  canEdit,
}: {
  projects: Project[];
  programs: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [rag, setRag] = useState("All");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    code: "",
    name: "",
    programId: "",
    businessUnit: "",
    pm: "",
    priority: "Medium",
    portfolioCategory: "Business Strategic",
    deliveryMethod: "Waterfall",
    fundingType: "CAPEX",
    governanceChannel: "Channel A",
    funding: 0,
  });

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const q = query.toLowerCase();
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.pm || "").toLowerCase().includes(q);
      const matchesRag = rag === "All" || p.rag === rag;
      return matchesQuery && matchesRag;
    });
  }, [projects, query, rag]);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        programId: form.programId || null,
        funding: Number(form.funding) || 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not create project");
      return;
    }
    setOpen(false);
    startTransition(() => router.refresh());
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Search projects, codes, PMs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="sm:max-w-sm"
          />
          <select
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
            value={rag}
            onChange={(e) => setRag(e.target.value)}
          >
            {["All", "Green", "Amber", "Red"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        {canEdit ? (
          <Button onClick={() => setOpen((v) => !v)}>
            {open ? "Close form" : "New project"}
          </Button>
        ) : null}
      </div>

      {open ? (
        <Card className="mb-6">
          <h3 className="font-[family-name:var(--font-display)] text-xl">Create project</h3>
          <form onSubmit={createProject} className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            </div>
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label>Program</Label>
              <select
                className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
                value={form.programId}
                onChange={(e) => setForm({ ...form, programId: e.target.value })}
              >
                <option value="">No program</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>PM</Label>
              <Input value={form.pm} onChange={(e) => setForm({ ...form, pm: e.target.value })} />
            </div>
            <div>
              <Label>Business unit</Label>
              <Input
                value={form.businessUnit}
                onChange={(e) => setForm({ ...form, businessUnit: e.target.value })}
              />
            </div>
            <div>
              <Label>Funding</Label>
              <Input
                type="number"
                value={form.funding}
                onChange={(e) => setForm({ ...form, funding: Number(e.target.value) })}
              />
            </div>
            {error ? <p className="text-sm text-rose-600 md:col-span-2">{error}</p> : null}
            <div className="md:col-span-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Create project"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Project</th>
                <th>Program</th>
                <th>RAG</th>
                <th>Stage</th>
                <th>Progress</th>
                <th>Funding</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/app/projects/${p.id}`} className="font-semibold hover:text-[var(--brand-primary)]">
                      {p.name}
                    </Link>
                    <div className="text-xs text-[var(--ink-soft)]">
                      {p.code} · {p.pm || "Unassigned"}
                    </div>
                  </td>
                  <td>{p.program?.name || "—"}</td>
                  <td>
                    <Badge tone={p.rag === "Green" ? "green" : p.rag === "Amber" ? "amber" : "red"}>
                      {p.rag}
                    </Badge>
                  </td>
                  <td>{p.stage}</td>
                  <td>
                    <div className="min-w-28">
                      <div className="mb-1 text-xs text-[var(--ink-soft)]">{formatPct(p.progress)}</div>
                      <div className="h-2 overflow-hidden rounded-full bg-black/5">
                        <div
                          className="h-full rounded-full bg-[var(--brand-primary)] transition-all"
                          style={{ width: `${Math.min(100, p.progress)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td>{formatCurrency(p.funding)}</td>
                  <td>{p.deliveryMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
