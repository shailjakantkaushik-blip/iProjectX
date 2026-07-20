import type { ReactNode } from "react";
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
