import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* Streamlit visual primitives — thin wrappers over CSS classes in styles.css */

export function SectionFrame({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("section-frame", className)}>{children}</div>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="section-title">{children}</div>;
}

export function PageHeading({
  icon,
  children,
  title,
  subtitle,
  actions,
}: {
  icon?: string;
  children?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-2">
      <div>
        <h1 className="page-heading">
          {icon && <span>{icon}</span>}
          <span>{title ?? children}</span>
        </h1>
        {subtitle && <div className="text-sm text-muted-foreground mt-1">{subtitle}</div>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="kpi-card" style={accent ? { borderTopColor: accent, borderTopWidth: 3 } : undefined}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={accent ? { color: accent } : undefined}>{value}</div>
      {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function RagChip({ rag, label }: { rag?: string | null; label?: ReactNode }) {
  const v = (rag || "").toLowerCase();
  const cls = v === "green" ? "rag-green" : v === "amber" ? "rag-amber" : v === "red" ? "rag-red" : "";
  if (!cls) return <span className="text-xs text-muted-foreground">—</span>;
  return <span className={`rag-chip ${cls}`}>{label ?? rag}</span>;
}

export function ComingSoon({ page, notes }: { page: string; notes?: string }) {
  return (
    <div>
      <PageHeading>{page}</PageHeading>
      <div className="text-sm text-muted-foreground mb-4">
        Mirrors the Streamlit page. Being ported in the next phase.
      </div>
      <SectionFrame>
        <SectionTitle>Preview</SectionTitle>
        <div className="py-12 text-center text-sm text-muted-foreground">
          {notes ?? "This page is scheduled in the port. The Streamlit equivalent's logic and visuals will be reproduced here."}
        </div>
      </SectionFrame>
    </div>
  );
}

export type SheetColumn<T> = {
  key: string;
  header: string;
  sortValue?: (row: T) => string | number;
  cell: (row: T) => ReactNode;
  className?: string;
};

/** Sortable Streamlit-style dataframe table */
export function SortableSheet<T>({
  rows,
  columns,
  rowKey,
  initialSortKey,
  maxRows,
}: {
  rows: T[];
  columns: SheetColumn<T>[];
  rowKey: (row: T) => string;
  initialSortKey?: string;
  maxRows?: number;
}) {
  const [sortKey, setSortKey] = useState(initialSortKey || columns[0]?.key || "");
  const [asc, setAsc] = useState(true);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sortKey);
    const copy = [...rows];
    if (!col) return copy;
    copy.sort((a, b) => {
      const av = col.sortValue ? col.sortValue(a) : String(col.cell(a) ?? "");
      const bv = col.sortValue ? col.sortValue(b) : String(col.cell(b) ?? "");
      if (typeof av === "number" && typeof bv === "number") return asc ? av - bv : bv - av;
      return asc
        ? String(av).localeCompare(String(bv), undefined, { numeric: true })
        : String(bv).localeCompare(String(av), undefined, { numeric: true });
    });
    return copy;
  }, [rows, columns, sortKey, asc]);

  const visible = maxRows ? sorted.slice(0, maxRows) : sorted;

  const onHeader = (key: string) => {
    if (sortKey === key) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(true);
    }
  };

  return (
    <div>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="st-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={cn("cursor-pointer select-none whitespace-nowrap", c.className)}>
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => onHeader(c.key)}>
                    {c.header}
                    {sortKey === c.key ? <span className="text-[10px] text-muted-foreground">{asc ? "▲" : "▼"}</span> : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                  No projects loaded.
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr key={rowKey(row)}>
                  {columns.map((c) => (
                    <td key={c.key} className={cn("whitespace-nowrap", c.className)}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Showing {visible.length} of {rows.length} row(s) — original {rows.length}. Click a column header to sort.
      </p>
    </div>
  );
}
