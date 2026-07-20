import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, isAdmin } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: string;
  exact?: boolean;
  adminOnly?: boolean;
};

type NavGroup = {
  heading: string;
  emoji: string;
  items: NavItem[];
};

/** Exact Streamlit hub navigation from PMO_ENTERPRISE_TOOL/app.py */
const navGroups: NavGroup[] = [
  {
    heading: "HOME",
    emoji: "🏠",
    items: [
      { to: "/app", label: "Executive Cockpit", icon: "📊", exact: true },
      { to: "/app/executive", label: "Executive Dashboard", icon: "🏠" },
      { to: "/app/latest-updates", label: "Latest Updates", icon: "🆕" },
      { to: "/app/about", label: "About", icon: "ℹ️" },
    ],
  },
  {
    heading: "PORTFOLIO",
    emoji: "📁",
    items: [
      { to: "/app/projects", label: "Projects", icon: "📁" },
      { to: "/app/programs", label: "Programs", icon: "🎯" },
      { to: "/app/project-infographic", label: "Project Infographic", icon: "🎨" },
      { to: "/app/portfolio-segmentation", label: "Segmentation", icon: "🗂️" },
      { to: "/app/prioritisation", label: "Prioritisation", icon: "🏅" },
      { to: "/app/portfolio-movements", label: "Movements", icon: "🔀" },
      { to: "/app/demand-pipeline", label: "Demand Pipeline", icon: "📥" },
    ],
  },
  {
    heading: "DELIVERY",
    emoji: "🚚",
    items: [
      { to: "/app/timeline", label: "Timeline", icon: "📆" },
      { to: "/app/roadmap-governance", label: "Roadmap × Governance", icon: "🛤️" },
      { to: "/app/stage-gates", label: "Stage Gates (Waterfall)", icon: "🚦" },
      { to: "/app/agile", label: "Agile / Sprints", icon: "🏃" },
      { to: "/app/governance-channels", label: "Governance Channels", icon: "🛂" },
      { to: "/app/dependencies", label: "Dependencies", icon: "🔗" },
      { to: "/app/resources", label: "Resources", icon: "👥" },
      { to: "/app/roadmap-analytics", label: "Risk Roadmap", icon: "🧠" },
    ],
  },
  {
    heading: "FINANCIALS",
    emoji: "💰",
    items: [
      { to: "/app/financials", label: "Financials", icon: "💰" },
      { to: "/app/fy-allocation", label: "FY Allocation", icon: "📅" },
      { to: "/app/phase-financials", label: "Phase Financials", icon: "💹" },
      { to: "/app/cost-vs-benefit", label: "Cost vs Benefit", icon: "⚖️" },
      { to: "/app/benefits", label: "Benefits", icon: "🎁" },
    ],
  },
  {
    heading: "GOVERNANCE & INSIGHTS",
    emoji: "🛡️",
    items: [
      { to: "/app/risks", label: "Risks", icon: "⚠️" },
      { to: "/app/decisions", label: "Decisions", icon: "🧩" },
      { to: "/app/actions", label: "Actions", icon: "✅" },
      { to: "/app/release-register", label: "Release Register", icon: "🚀" },
      { to: "/app/executive-reports", label: "Executive Reports", icon: "📑" },
      { to: "/app/data-editor", label: "Data Editor", icon: "✏️", adminOnly: true },
      { to: "/app/configuration", label: "Configuration", icon: "⚙️", adminOnly: true },
      { to: "/app/team", label: "Admin: Users", icon: "🛡️", adminOnly: true },
    ],
  },
];

const FY_OPTIONS = ["All years", "FY24", "FY25", "FY26", "FY27"];
const THEME_KEY = "pmo-theme";
const FY_KEY = "pmo-fy-filter";
const COLLAPSE_KEY = "pmo-sidebar-collapsed";

function roleLabel(roles: string[]) {
  if (roles.includes("admin") || roles.includes("org_admin")) return "Administrator";
  if (roles.includes("executive")) return "Executive";
  if (roles.includes("bu_lead")) return "BU Lead";
  if (roles.includes("pm")) return "Project Manager";
  return roles[0] ? roles[0].replace(/_/g, " ") : "Member";
}

function ShellButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md border border-[#d1d5db] bg-white px-2.5 py-2 text-[12px] font-medium text-[#0b1220] shadow-sm transition hover:bg-[#f8fafc] disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, roles, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const admin = isAdmin(roles);
  const queryClient = useQueryClient();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  });
  const [fy, setFy] = useState(() => {
    if (typeof window === "undefined") return "All years";
    return localStorage.getItem(FY_KEY) || "All years";
  });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(FY_KEY, fy);
    window.dispatchEvent(new CustomEvent("pmo-fy-filter", { detail: fy }));
  }, [fy]);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const displayName = profile?.full_name || profile?.email || "User";
  const roleText = roleLabel(roles);

  const refreshData = async () => {
    await queryClient.invalidateQueries();
    toast.success("Portfolio data refreshed");
  };

  const exportPpt = () => {
    toast.message("PPT export", {
      description: "Open Executive Reports to download board packs, or use Data Editor for Excel.",
    });
  };

  const updatePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    setPasswordOpen(false);
    setNewPassword("");
    setConfirmPassword("");
  };

  const sidebarInner = (
    <>
      {/* Brand */}
      <div className="border-b border-[#d1d5db] px-3 pb-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {!collapsed && (
              <>
                <div className="text-[17px] font-bold tracking-wide text-[#0b1220]">PMO PORTFOLIO</div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">
                  Enterprise Edition
                </div>
              </>
            )}
            {collapsed && <div className="text-center text-lg" title="PMO Portfolio">📊</div>}
          </div>
          <button
            type="button"
            className="hidden shrink-0 rounded-md p-1 text-[#374151] hover:bg-[#dbe3ec] md:inline-flex"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {/* Theme */}
        {!collapsed && (
          <div>
            <ShellButton className="w-full justify-start" onClick={() => setThemeOpen((v) => !v)}>
              <ChevronRight className={cn("h-3.5 w-3.5 transition", themeOpen && "rotate-90")} />
              <span>🧠</span>
              <span>Theme</span>
            </ShellButton>
            {themeOpen && (
              <div className="mt-2 space-y-1 rounded-md border border-[#d1d5db] bg-white p-2">
                {(["light", "dark"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    className={cn(
                      "flex w-full items-center rounded-md px-2 py-1.5 text-left text-[12px] capitalize",
                      theme === t ? "bg-[#dbeafe] font-semibold text-[#1d4ed8]" : "hover:bg-[#f3f4f6]",
                    )}
                  >
                    {t === "light" ? "☀️ Light" : "🌙 Dark"}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Data Source */}
        {!collapsed && (
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[13px] font-bold text-[#0b1220]">
              <span>📂</span> Data Source
            </div>
            <div className="mb-2 text-[11px] text-[#6b7280]">
              Active: <code className="rounded bg-white/80 px-1 py-0.5 text-[10px]">PMO_Master.xlsx</code>
            </div>
            <ShellButton className="w-full justify-start" onClick={() => setDataOpen((v) => !v)}>
              <ChevronRight className={cn("h-3.5 w-3.5 transition", dataOpen && "rotate-90")} />
              Change data source
            </ShellButton>
            {dataOpen && (
              <div className="mt-2 space-y-2 rounded-md border border-[#d1d5db] bg-white p-2 text-[12px]">
                <p className="text-[#6b7280]">Upload or edit the portfolio workbook in Data Editor.</p>
                <Link
                  to="/app/data-editor"
                  className="flex w-full items-center justify-center rounded-md bg-[#1d4ed8] px-2 py-1.5 font-medium text-white hover:bg-[#1e40af]"
                >
                  Open Data Editor
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Financial Year */}
        {!collapsed && (
          <div className="border-t border-[#d1d5db] pt-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold text-[#0b1220]">
              <span>📅</span> Financial Year
            </div>
            <label className="mb-1 block text-[11px] text-[#374151]">Financial Year</label>
            <select
              value={fy}
              onChange={(e) => setFy(e.target.value)}
              className="h-9 w-full rounded-md border border-[#d1d5db] bg-white px-2 text-[12px] text-[#0b1220] shadow-sm outline-none focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8]"
            >
              {FY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "All years" ? "Choose options" : opt}
                </option>
              ))}
            </select>
            {fy !== "All years" && (
              <p className="mt-1 text-[10px] text-[#6b7280]">Filtering to {fy}</p>
            )}
          </div>
        )}

        {/* Refresh / PPT */}
        {!collapsed && (
          <div className="grid grid-cols-2 gap-2 border-t border-[#d1d5db] pt-3">
            <ShellButton onClick={() => void refreshData()}>🔄 Refresh</ShellButton>
            <ShellButton onClick={exportPpt}>📤 PPT</ShellButton>
          </div>
        )}

        {/* Navigation hubs */}
        <nav className="space-y-3 border-t border-[#d1d5db] pt-3">
          {navGroups.map((group) => {
            const items = group.items.filter((n) => !n.adminOnly || admin);
            if (!items.length) return null;
            return (
              <div key={group.heading}>
                {!collapsed && (
                  <div className="mb-1 flex items-center gap-1.5 px-1 text-[11px] font-bold uppercase tracking-wide text-[#0b1220]">
                    <span className="text-sm leading-none">{group.emoji}</span>
                    <span className="truncate">{group.heading}</span>
                  </div>
                )}
                <div className="space-y-0.5">
                  {items.map((n) => {
                    const active = n.exact
                      ? pathname === n.to
                      : pathname === n.to || pathname.startsWith(n.to + "/");
                    return (
                      <Link
                        key={n.to}
                        to={n.to}
                        title={n.label}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] transition-colors",
                          collapsed && "justify-center px-1",
                          active
                            ? "bg-[#dbeafe] font-semibold text-[#1e3a8a]"
                            : "text-[#0b1220] hover:bg-[#dbe3ec]",
                        )}
                      >
                        <span className="shrink-0 text-[14px] leading-none">{n.icon}</span>
                        {!collapsed && <span className="truncate">{n.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* User footer */}
      <div className="border-t border-[#d1d5db] px-3 py-3">
        {!collapsed && (
          <>
            <div className="mb-2 flex items-start gap-2">
              <span className="text-base leading-none">👤</span>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-[#0b1220]">{displayName}</div>
                <div className="truncate text-[11px] text-[#6b7280]">Role: {roleText}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ShellButton onClick={() => setPasswordOpen((v) => !v)}>
                <span className="leading-tight">🔑 Password</span>
              </ShellButton>
              <ShellButton onClick={() => void signOut()}>
                <span className="leading-tight">🚪 Sign out</span>
              </ShellButton>
            </div>
            {passwordOpen && (
              <div className="mt-2 space-y-2 rounded-md border border-[#d1d5db] bg-white p-2">
                <input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-8 w-full rounded-md border border-[#d1d5db] px-2 text-[12px]"
                />
                <input
                  type="password"
                  placeholder="Confirm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-8 w-full rounded-md border border-[#d1d5db] px-2 text-[12px]"
                />
                <ShellButton className="w-full" disabled={pwBusy} onClick={() => void updatePassword()}>
                  {pwBusy ? "Updating…" : "Update"}
                </ShellButton>
              </div>
            )}
          </>
        )}
        {collapsed && (
          <button
            type="button"
            title="Sign out"
            onClick={() => void signOut()}
            className="flex w-full items-center justify-center rounded-md py-2 text-lg hover:bg-[#dbe3ec]"
          >
            🚪
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden flex-shrink-0 flex-col border-r border-[#d1d5db] bg-[#e9edf2] md:flex",
          collapsed ? "w-[58px]" : "w-[270px]",
        )}
      >
        {sidebarInner}
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-[#d1d5db] bg-[#e9edf2] px-3 py-2 md:hidden">
          <button
            type="button"
            className="rounded-md p-1.5 hover:bg-[#dbe3ec]"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
          </button>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-[#0b1220]">PMO PORTFOLIO</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">
              Enterprise Edition
            </div>
          </div>
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/30"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute bottom-0 left-0 top-0 flex w-[280px] flex-col bg-[#e9edf2] shadow-xl">
              {sidebarInner}
            </aside>
          </div>
        )}

        <main className="flex-1 overflow-x-hidden p-5">{children}</main>
      </div>
    </div>
  );
}
