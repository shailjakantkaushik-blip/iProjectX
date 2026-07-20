"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { BrandTheme } from "@/lib/branding";
import {
  Activity,
  BarChart3,
  BookOpen,
  Boxes,
  CalendarRange,
  CircleDollarSign,
  Database,
  FolderKanban,
  Gauge,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Network,
  Palette,
  PieChart,
  Settings2,
  Shield,
  ShieldAlert,
  Sparkles,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Users,
  Workflow,
  Layers3,
  ListChecks,
  Megaphone,
  MoveHorizontal,
  Scale,
  Waypoints,
} from "lucide-react";
import { type ReactNode, useMemo, useState, useTransition } from "react";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

type NavHub = { title: string; items: NavItem[] };

const HUBS: NavHub[] = [
  {
    title: "HOME",
    items: [
      { href: "/app", label: "Executive Cockpit", icon: LayoutDashboard },
      { href: "/app/updates", label: "Latest Updates", icon: Megaphone },
      { href: "/app/about", label: "About This App", icon: BookOpen },
    ],
  },
  {
    title: "PORTFOLIO",
    items: [
      { href: "/app/projects", label: "Projects", icon: FolderKanban },
      { href: "/app/programs", label: "Programs", icon: Boxes },
      { href: "/app/segmentation", label: "Segmentation", icon: PieChart },
      { href: "/app/prioritisation", label: "Prioritisation", icon: Target },
      { href: "/app/movements", label: "Movements", icon: MoveHorizontal },
      { href: "/app/pipeline", label: "Demand Pipeline", icon: GitBranch },
    ],
  },
  {
    title: "DELIVERY",
    items: [
      { href: "/app/timeline", label: "Timeline", icon: Waypoints },
      { href: "/app/delivery", label: "Roadmap × Governance", icon: Workflow },
      { href: "/app/stage-gates", label: "Stage Gates", icon: ListChecks },
      { href: "/app/agile", label: "Agile / Sprints", icon: CalendarRange },
      { href: "/app/channels", label: "Governance Channels", icon: Scale },
      { href: "/app/dependencies", label: "Dependencies", icon: Network },
      { href: "/app/resources", label: "Resources", icon: Users },
      { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    title: "FINANCIALS",
    items: [
      { href: "/app/financials", label: "Financials", icon: CircleDollarSign },
      { href: "/app/fy-allocation", label: "FY Allocation", icon: Layers3 },
      { href: "/app/phase-financials", label: "Phase Financials", icon: Gauge },
      { href: "/app/cost-benefit", label: "Cost vs Benefit", icon: TrendingUp },
      { href: "/app/benefits", label: "Benefits", icon: Sparkles },
    ],
  },
  {
    title: "GOVERNANCE",
    items: [
      { href: "/app/risks", label: "Risks", icon: ShieldAlert },
      { href: "/app/governance", label: "Decisions & Actions", icon: Activity },
      { href: "/app/releases", label: "Release Register", icon: Gauge },
      { href: "/app/reports", label: "Executive Reports", icon: BarChart3 },
      { href: "/app/data", label: "Data & Exports", icon: Database },
      { href: "/app/configuration", label: "Configuration", icon: SlidersHorizontal },
      { href: "/app/settings", label: "Workspace Settings", icon: Settings2 },
    ],
  },
];

export function AppShell({
  children,
  brand,
  userName,
  role,
  planName,
  isPlatformAdmin = false,
  fyOptions = [],
}: {
  children: ReactNode;
  brand: BrandTheme;
  userName: string;
  role: string;
  planName: string;
  isPlatformAdmin?: boolean;
  fyOptions?: string[];
}) {
  const hubs = useMemo(() => {
    if (!isPlatformAdmin) return HUBS;
    return HUBS.map((hub, idx) =>
      idx === HUBS.length - 1
        ? {
            ...hub,
            items: [
              ...hub.items,
              { href: "/app/admin", label: "Platform Admin", icon: Shield },
            ],
          }
        : hub
    );
  }, [isPlatformAdmin]);

  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const selectedFy = searchParams.get("fy") || "All";

  function setFy(fy: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!fy || fy === "All") params.delete("fy");
    else params.set("fy", fy);
    const q = params.toString();
    startTransition(() => {
      router.push(q ? `${pathname}?${q}` : pathname);
      router.refresh();
    });
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/app") return pathname === "/app";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div
      className="app-shell min-h-screen"
      style={{
        ["--brand-primary" as string]: brand.primaryColor,
        ["--brand-accent" as string]: brand.accentColor,
        ["--brand-secondary" as string]: brand.secondaryColor,
        ["--hero-glow" as string]: `${brand.accentColor}33`,
      }}
    >
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-72 overflow-y-auto border-r border-[var(--line)] bg-white/90 p-5 backdrop-blur-xl transition md:static md:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          )}
        >
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                style={{ background: brand.primaryColor }}
              >
                <Gauge className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                  PMO Portfolio
                </p>
                <p className="font-[family-name:var(--font-display)] text-lg leading-tight">
                  {brand.brandName}
                </p>
                <p className="text-xs text-[var(--ink-soft)]">
                  {planName} · {role}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-5 rounded-xl bg-black/[0.03] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
              Financial Year
            </p>
            <select
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-sm"
              value={selectedFy}
              disabled={pending}
              onChange={(e) => setFy(e.target.value)}
            >
              <option value="All">All years</option>
              {fyOptions.map((fy) => (
                <option key={fy} value={fy}>
                  {fy}
                </option>
              ))}
            </select>
          </div>

          <nav className="space-y-5">
            {hubs.map((hub) => (
              <div key={hub.title}>
                <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                  {hub.title}
                </p>
                <div className="space-y-0.5">
                  {hub.items.map((item) => {
                    const active = isActive(item.href);
                    const href =
                      selectedFy !== "All"
                        ? `${item.href}?fy=${encodeURIComponent(selectedFy)}`
                        : item.href;
                    return (
                      <Link
                        key={item.href}
                        href={href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                          active
                            ? "bg-[var(--brand-primary)] text-white shadow-sm"
                            : "text-[var(--ink-soft)] hover:bg-black/5 hover:text-[var(--ink)]"
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-8 rounded-2xl bg-[var(--brand-secondary)] p-4 text-white">
            <Sparkles className="h-4 w-4 text-teal-200" />
            <p className="mt-2 text-sm font-semibold">Streamlit parity workspace</p>
            <p className="mt-1 text-xs text-teal-50/80">
              Same PMO hubs: Home, Portfolio, Delivery, Financials, Governance.
            </p>
            <Link
              href="/app/settings/branding"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-100 hover:text-white"
            >
              <Palette className="h-3.5 w-3.5" /> Open branding
            </Link>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--line)] bg-[var(--background)]/80 px-4 py-3 backdrop-blur md:px-8">
            <button
              className="rounded-lg px-3 py-2 text-sm font-semibold ring-1 ring-[var(--line)] md:hidden"
              onClick={() => setOpen((v) => !v)}
            >
              Menu
            </button>
            <div className="hidden text-sm text-[var(--ink-soft)] md:block">
              {brand.loginTagline || "Enterprise project management & delivery"}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold">{userName}</p>
                <p className="text-xs capitalize text-[var(--ink-soft)]">
                  {role.replace("_", " ")}
                  {selectedFy !== "All" ? ` · FY ${selectedFy}` : ""}
                </p>
              </div>
              <button
                onClick={logout}
                className="rounded-lg p-2 text-[var(--ink-soft)] hover:bg-black/5"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </header>
          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
      {open ? (
        <button
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        />
      ) : null}
    </div>
  );
}
