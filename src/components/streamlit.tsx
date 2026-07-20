import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* Streamlit visual primitives — thin wrappers over CSS classes in styles.css */

export function SectionFrame({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
}) {
  return (
    <div className={cn("section-frame", className)}>
      {title != null && <SectionTitle>{title}</SectionTitle>}
      {children}
    </div>
  );
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
    <div className="page-enter mb-3 flex items-start justify-between gap-4 border-b border-border pb-3">
      <div>
        <h1 className="page-heading">
          {icon && <span aria-hidden>{icon}</span>}
          <span>{title ?? children}</span>
        </h1>
        {subtitle && <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

function CountUp({ value }: { value: ReactNode }) {
  const text = String(value ?? "");
  const match = text.match(/^([^0-9.-]*)(-?[\d,.]+)(.*)$/);
  const [n, setN] = useState(0);
  const target = match ? Number(match[2].replace(/,/g, "")) : NaN;
  const pref = match?.[1] ?? "";
  const suf = match?.[3] ?? "";
  const started = useRef(false);

  useEffect(() => {
    if (!Number.isFinite(target)) return;
    if (started.current) {
      setN(target);
      return;
    }
    started.current = true;
    const t0 = performance.now();
    const dur = 600;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - (1 - p) ** 3;
      setN(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  if (!Number.isFinite(target)) return <>{value}</>;
  const decimals = match![2].includes(".") ? 1 : 0;
  const formatted = decimals
    ? n.toFixed(decimals)
    : Math.round(n).toLocaleString("en-US");
  return (
    <>
      {pref}
      {formatted}
      {suf}
    </>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  accent,
  delta,
  animate = true,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: string;
  delta?: { value: string; positive?: boolean };
  animate?: boolean;
}) {
  return (
    <div
      className="kpi-card"
      style={accent ? { borderTopColor: accent, borderTopWidth: 3 } : undefined}
    >
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={accent ? { color: accent } : undefined}>
        {animate && (typeof value === "string" || typeof value === "number") ? (
          <CountUp value={value} />
        ) : (
          value
        )}
      </div>
      {delta && (
        <span
          className={cn(
            "mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
            delta.positive === false ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700",
          )}
        >
          {delta.value}
        </span>
      )}
      {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function RagChip({ rag, label }: { rag?: string | null; label?: ReactNode }) {
  const v = (rag || "").toLowerCase();
  const cls =
    v === "green"
      ? "rag-green"
      : v === "amber"
        ? "rag-amber"
        : v === "red"
          ? "rag-red rag-pulse"
          : v === "blue" || v === "info" || v === "complete"
            ? "rag-blue"
            : "";
  if (!cls) return <span className="text-xs text-muted-foreground">—</span>;
  return <span className={`rag-chip ${cls}`}>{label ?? rag}</span>;
}

export function StatusChip({ status }: { status?: string | null }) {
  const s = (status || "").toLowerCase();
  let rag = "blue";
  if (s.includes("overdue") || s.includes("reject") || s.includes("block") || s.includes("red")) rag = "red";
  else if (s.includes("risk") || s.includes("pending") || s.includes("amber") || s.includes("hold")) rag = "amber";
  else if (s.includes("approv") || s.includes("complete") || s.includes("deliver") || s.includes("green") || s.includes("healthy"))
    rag = "green";
  else if (s.includes("not started") || s.includes("planned") || s.includes("new")) rag = "grey";
  return <RagChip rag={rag} label={status || "—"} />;
}

export function EmptyState({
  title = "No data yet",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="text-3xl opacity-40">📭</div>
      <div className="text-sm font-semibold text-heading">{title}</div>
      {description && <div className="max-w-sm text-xs text-muted-foreground">{description}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="skeleton h-8 w-64" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-[10px]" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-24 rounded-[10px]" />
      ))}
    </div>
  );
}

export function ChartCaption({ title, caption, children }: { title: string; caption?: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-1 text-[13px] font-semibold text-heading">{title}</h3>
      {children}
      {caption && <p className="mt-1 text-[11px] text-muted-foreground">{caption}</p>}
    </div>
  );
}

export function ComingSoon({ page, notes }: { page: string; notes?: string }) {
  return (
    <div>
      <PageHeading>{page}</PageHeading>
      <div className="mb-4 text-sm text-muted-foreground">
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
  emptyMessage = "No rows to display.",
  onRowClick,
}: {
  rows: T[];
  columns: SheetColumn<T>[];
  rowKey: (row: T) => string;
  initialSortKey?: string;
  maxRows?: number;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
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
      <div className="overflow-x-auto rounded-[10px] border border-border">
        <table className="st-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={cn("cursor-pointer select-none whitespace-nowrap", c.className)}>
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => onHeader(c.key)}>
                    {c.header}
                    {sortKey === c.key ? (
                      <span className="text-[10px] text-muted-foreground">{asc ? "▲" : "▼"}</span>
                    ) : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr
                  key={rowKey(row)}
                  className={onRowClick ? "cursor-pointer" : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
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
        Showing {visible.length} of {rows.length} row(s). Click a column header to sort.
      </p>
    </div>
  );
}

export function ExportBar({
  onCsv,
  onExcel,
  onPdf,
  onPpt,
}: {
  onCsv?: () => void;
  onExcel?: () => void;
  onPdf?: () => void;
  onPpt?: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3 text-[12px]">
      <span className="mr-1 self-center text-muted-foreground">Export:</span>
      {onCsv && (
        <button type="button" className="export-btn" onClick={onCsv}>
          📥 CSV
        </button>
      )}
      {onExcel && (
        <button type="button" className="export-btn" onClick={onExcel}>
          📊 Excel
        </button>
      )}
      {onPdf && (
        <button type="button" className="export-btn" onClick={onPdf}>
          📄 PDF
        </button>
      )}
      {onPpt && (
        <button type="button" className="export-btn" onClick={onPpt}>
          📈 PPT
        </button>
      )}
    </div>
  );
}
