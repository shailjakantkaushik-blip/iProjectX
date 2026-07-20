"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";

const CATEGORIES = [
  "Status",
  "Priority",
  "Theme",
  "FYStartMonth",
  "Threshold",
  "StageA",
  "StageB",
  "RAG",
  "FundingType",
  "PortfolioCategory",
];

type Seed = {
  category: string;
  key: string;
  value: string;
  sortOrder: number;
};

type ConfigItem = {
  id: string;
  category: string;
  key: string;
  value: string;
  sortOrder: number;
};

export function ConfigClient({
  items,
  seedSuggestions,
  canEdit,
}: {
  items: ConfigItem[];
  seedSuggestions: Seed[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    category: "Status",
    key: "",
    value: "",
    sortOrder: "0",
  });

  if (!canEdit) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.key.trim()) {
      setError("Key is required");
      return;
    }
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: form.category,
        key: form.key.trim(),
        value: form.value.trim() || form.key.trim(),
        sortOrder: parseInt(form.sortOrder) || 0,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Save failed");
      return;
    }
    setForm({ category: "Status", key: "", value: "", sortOrder: "0" });
    startTransition(() => router.refresh());
  }

  async function deletItem(id: string) {
    const res = await fetch("/api/config", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      startTransition(() => router.refresh());
    }
  }

  async function applySeed(seed: Seed) {
    const exists = items.some(
      (i) => i.category === seed.category && i.key === seed.key
    );
    if (exists) return;
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(seed),
    });
    if (res.ok) {
      startTransition(() => router.refresh());
    }
  }

  const missingSeeds = seedSuggestions.filter(
    (s) => !items.some((i) => i.category === s.category && i.key === s.key)
  );

  return (
    <>
      {missingSeeds.length > 0 && (
        <Card className="mb-6">
          <h3 className="font-[family-name:var(--font-display)] text-xl">Seed suggestions</h3>
          <p className="mt-1 text-xs text-[var(--ink-soft)]">
            Quick-add common configuration defaults for your workspace.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {missingSeeds.slice(0, 20).map((seed) => (
              <button
                key={`${seed.category}-${seed.key}`}
                onClick={() => applySeed(seed)}
                disabled={pending}
                className="rounded-md bg-[var(--brand-primary)]/10 px-2.5 py-1 text-xs font-medium text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 disabled:opacity-50"
              >
                + {seed.category}: {seed.key}
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card className="mb-6">
        <h3 className="font-[family-name:var(--font-display)] text-xl">Add / update config item</h3>
        <form onSubmit={save} className="mt-4 grid gap-3 md:grid-cols-4">
          <div>
            <Label htmlFor="cfg-cat">Category</Label>
            <select
              id="cfg-cat"
              className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="__custom">Custom…</option>
            </select>
          </div>

          <div>
            <Label htmlFor="cfg-key">Key</Label>
            <Input
              id="cfg-key"
              required
              value={form.key}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
              placeholder="Active"
            />
          </div>

          <div>
            <Label htmlFor="cfg-value">Value</Label>
            <Input
              id="cfg-value"
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              placeholder="Same as key if blank"
            />
          </div>

          <div>
            <Label htmlFor="cfg-sort">Sort order</Label>
            <Input
              id="cfg-sort"
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
            />
          </div>

          <div className="md:col-span-4">
            <Button type="submit" disabled={pending}>
              Save config item
            </Button>
            {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
          </div>
        </form>
      </Card>

      {items.length > 0 && (
        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">All config items</h3>
          <div className="table-wrap mt-4">
            <table className="data">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Key</th>
                  <th>Value</th>
                  <th>Order</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.category}</td>
                    <td className="font-medium">{item.key}</td>
                    <td>{item.value}</td>
                    <td>{item.sortOrder}</td>
                    <td>
                      <button
                        onClick={() => deletItem(item.id)}
                        disabled={pending}
                        className="text-xs text-rose-600 hover:text-rose-500 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
