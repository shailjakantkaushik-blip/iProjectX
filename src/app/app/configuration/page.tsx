import { redirect } from "next/navigation";
import { canEdit, getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { ConfigClient } from "@/components/pmo/config-client";

const SEED_SUGGESTIONS = [
  { category: "Status", key: "Active", value: "Active", sortOrder: 1 },
  { category: "Status", key: "On Hold", value: "On Hold", sortOrder: 2 },
  { category: "Status", key: "Completed", value: "Completed", sortOrder: 3 },
  { category: "Status", key: "Cancelled", value: "Cancelled", sortOrder: 4 },
  { category: "Priority", key: "Critical", value: "Critical", sortOrder: 1 },
  { category: "Priority", key: "High", value: "High", sortOrder: 2 },
  { category: "Priority", key: "Medium", value: "Medium", sortOrder: 3 },
  { category: "Priority", key: "Low", value: "Low", sortOrder: 4 },
  { category: "Theme", key: "Digital", value: "Digital", sortOrder: 1 },
  { category: "Theme", key: "Infrastructure", value: "Infrastructure", sortOrder: 2 },
  { category: "Theme", key: "Compliance", value: "Compliance", sortOrder: 3 },
  { category: "Theme", key: "Customer", value: "Customer", sortOrder: 4 },
  { category: "FYStartMonth", key: "July", value: "7", sortOrder: 1 },
];

function groupByCategory(items: { category: string; key: string; value: string; id: string; sortOrder: number }[]) {
  const map = new Map<string, typeof items>();
  for (const item of items) {
    if (!map.has(item.category)) map.set(item.category, []);
    map.get(item.category)!.push(item);
  }
  return map;
}

export default async function ConfigurationPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const items = await db.orgConfigItem.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { key: "asc" }],
  });

  const grouped = groupByCategory(items);
  const categories = [...grouped.keys()];

  return (
    <div>
      <PageHeader
        title="Configuration"
        description="Workspace dropdown options, thresholds, and FY settings — Streamlit Config parity."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Config items</p>
          <p className="kpi-value mt-2 text-3xl">{items.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Categories</p>
          <p className="kpi-value mt-2 text-3xl">{categories.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Last updated</p>
          <p className="mt-2 text-sm font-semibold">
            {items.length ? new Date().toLocaleDateString() : "Never"}
          </p>
        </Card>
      </div>

      <ConfigClient
        items={items}
        seedSuggestions={SEED_SUGGESTIONS}
        canEdit={canEdit(ctx.membership.role)}
      />

      {categories.length > 0 && (
        <div className="mt-6 space-y-6">
          {categories.map((cat) => {
            const catItems = grouped.get(cat) || [];
            return (
              <Card key={cat}>
                <h3 className="font-[family-name:var(--font-display)] text-xl">{cat}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {catItems.map((item) => (
                    <Badge key={item.id} tone="brand">
                      {item.key}
                      {item.value !== item.key ? ` = ${item.value}` : ""}
                    </Badge>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!items.length && (
        <Card className="mt-6">
          <h3 className="font-[family-name:var(--font-display)] text-xl">No configuration yet</h3>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Use the form above to add config items, or click a seed suggestion to pre-populate
            common defaults.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[...new Set(SEED_SUGGESTIONS.map((s) => s.category))].map((cat) => (
              <Badge key={cat} tone="neutral">
                {cat} ({SEED_SUGGESTIONS.filter((s) => s.category === cat).length} items)
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
