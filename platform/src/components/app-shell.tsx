"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { BrandTheme } from "@/lib/branding";
import {
  Activity,
  Boxes,
  CalendarRange,
  CircleDollarSign,
  FolderKanban,
  Gauge,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Palette,
  Settings2,
  ShieldAlert,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import { type ReactNode, useState } from "react";

const NAV = [
  { href: "/app", label: "Executive Cockpit", icon: LayoutDashboard },
  { href: "/app/projects", label: "Projects", icon: FolderKanban },
  { href: "/app/programs", label: "Programs", icon: Boxes },
  { href: "/app/delivery", label: "Delivery", icon: Workflow },
  { href: "/app/financials", label: "Financials", icon: CircleDollarSign },
  { href: "/app/risks", label: "Risks", icon: ShieldAlert },
  { href: "/app/pipeline", label: "Demand Pipeline", icon: GitBranch },
  { href: "/app/resources", label: "Resources", icon: Users },
  { href: "/app/agile", label: "Agile & Releases", icon: CalendarRange },
  { href: "/app/governance", label: "Governance", icon: Activity },
  { href: "/app/settings", label: "Workspace Settings", icon: Settings2 },
];

export function AppShell({
  children,
  brand,
  userName,
  role,
  planName,
}: {
  children: ReactNode;
  brand: BrandTheme;
  userName: string;
  role: string;
  planName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
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
            "fixed inset-y-0 left-0 z-40 w-72 border-r border-[var(--line)] bg-white/80 p-5 backdrop-blur-xl transition md:static md:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          )}
        >
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                style={{ background: brand.primaryColor }}
              >
                <Gauge className="h-5 w-5" />
              </div>
              <div>
                <p className="font-[family-name:var(--font-display)] text-lg leading-tight">
                  {brand.brandName}
                </p>
                <p className="text-xs text-[var(--ink-soft)]">{planName} · {role}</p>
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            {NAV.map((item) => {
              const active =
                item.href === "/app"
                  ? pathname === "/app"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    active
                      ? "bg-[var(--brand-primary)] text-white shadow-sm"
                      : "text-[var(--ink-soft)] hover:bg-black/5 hover:text-[var(--ink)]"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-2xl bg-[var(--brand-secondary)] p-4 text-white">
            <Sparkles className="h-4 w-4 text-teal-200" />
            <p className="mt-2 text-sm font-semibold">White-label controls</p>
            <p className="mt-1 text-xs text-teal-50/80">
              Customize brand colors, logo, and domain in Workspace Settings.
            </p>
            <Link
              href="/app/settings/branding"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-100 hover:text-white"
            >
              <Palette className="h-3.5 w-3.5" /> Open branding
            </Link>
          </div>

          {!brand.hidePoweredBy ? (
            <p className="mt-6 text-[11px] text-[var(--ink-soft)]">Powered by iProjectX</p>
          ) : null}
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
              {brand.loginTagline}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold">{userName}</p>
                <p className="text-xs capitalize text-[var(--ink-soft)]">{role.replace("_", " ")}</p>
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
