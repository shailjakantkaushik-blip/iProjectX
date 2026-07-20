import { useEffect, useState } from "react";

export const FY_KEY = "pmo-fy-filter";
export const FY_OPTIONS = ["FY25", "FY26", "FY27", "FY28", "FY29", "FY30"] as const;
export type FyOption = (typeof FY_OPTIONS)[number];

/** Persist as JSON array; empty / ["All"] means no filter. */
export function readFyFilter(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FY_KEY);
    if (!raw || raw === "All years") return [];
    if (raw.startsWith("[")) {
      const parsed = JSON.parse(raw) as string[];
      return Array.isArray(parsed) ? parsed.filter((x) => x && x !== "All years") : [];
    }
    return [raw];
  } catch {
    return [];
  }
}

export function writeFyFilter(fys: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(FY_KEY, JSON.stringify(fys));
  window.dispatchEvent(new CustomEvent("pmo-fy-filter", { detail: fys }));
}

export function useFyFilter(): [string[], (next: string[]) => void] {
  const [fys, setFys] = useState<string[]>(() => readFyFilter());

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (Array.isArray(detail)) setFys(detail);
      else setFys(readFyFilter());
    };
    window.addEventListener("pmo-fy-filter", onChange);
    return () => window.removeEventListener("pmo-fy-filter", onChange);
  }, []);

  const update = (next: string[]) => {
    setFys(next);
    writeFyFilter(next);
  };

  return [fys, update];
}

/** Infer FY labels from a project start/end (AU FY Jul–Jun). */
export function projectFySpan(start?: string | null, end?: string | null, explicit?: string[] | null): string[] {
  if (explicit?.length) return explicit;
  if (!start && !end) return ["FY26"];
  const years = new Set<string>();
  const s = start ? new Date(start) : end ? new Date(end) : new Date();
  const e = end ? new Date(end) : s;
  const cursor = new Date(s.getFullYear(), s.getMonth(), 1);
  const endM = new Date(e.getFullYear(), e.getMonth(), 1);
  while (cursor <= endM) {
    const y = cursor.getMonth() >= 6 ? cursor.getFullYear() + 1 : cursor.getFullYear();
    years.add(`FY${String(y).slice(-2)}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return [...years];
}

export function matchesFyFilter<T extends { start_date?: string | null; end_date?: string | null; fy_span?: string[] | null }>(
  row: T,
  fys: string[],
): boolean {
  if (!fys.length) return true;
  const span = projectFySpan(row.start_date, row.end_date, row.fy_span);
  return span.some((fy) => fys.includes(fy));
}
