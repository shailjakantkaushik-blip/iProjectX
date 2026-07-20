import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeft, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, isAdmin } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { exportPortfolioBriefing } from "@/lib/excel";
import { FY_OPTIONS, useFyFilter, fetchDomainBundle } from "@/lib/portfolio-engine";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type NavItem = {
  to: string;
  label: string;
  icon: string;
  num?: string;
  exact?: boolean;
  adminOnly?: boolean;
};

type NavGroup = {
  heading: string;
  emoji: string;
  items: NavItem[];
};

/** Spec §4 / §14 hub navigation with page numbers */
const navGroups: NavGroup[] = [
  {
    heading: "COCKPIT",
    emoji: "🏠",
    items: [
      { to: "/app", label: "Home (Executive Cockpit)", icon: "📊", num: "0", exact: true },
      { to: "/app/executive", label: "Executive Dashboard", icon: "🏠", num: "1" },
      { to: "/app/executive-reports", label: "Executive Reports", icon: "📑", num: "24" },
      { to: "/app/latest-updates", label: "Latest Updates", icon: "🆕", num: "14" },
      { to: "/app/about", label: "About", icon: "ℹ️", num: "12" },
    ],
  },
  {
    heading: "DELIVERY",
    emoji: "🚚",
    items: [
      { to: "/app/projects", label: "Projects", icon: "📁", num: "3" },
      { to: "/app/project-infographic", label: "Project Infographic", icon: "🎨", num: "22" },
      { to: "/app/programs", label: "Programs", icon: "🎯", num: "27" },
      { to: "/app/timeline", label: "Timeline", icon: "📆", num: "28" },
      { to: "/app/roadmap-governance", label: "Roadmap & Governance", icon: "🛤️", num: "6" },
      { to: "/app/roadmap-analytics", label: "Roadmap Analytics", icon: "🧠", num: "8" },
      { to: "/app/release-register", label: "Release Register", icon: "🚀", num: "30" },
      { to: "/app/agile", label: "Agile / Sprints", icon: "🏃", num: "31" },
    ],
  },
  {
    heading: "GOVERNANCE",
    emoji: "🛡️",
    items: [
      { to: "/app/governance-channels", label: "Governance Channels", icon: "🛂", num: "16" },
      { to: "/app/stage-gates", label: "Stage Gates", icon: "🚦", num: "17" },
      { to: "/app/decisions", label: "Decisions", icon: "🧩", num: "19" },
      { to: "/app/actions", label: "Actions", icon: "✅", num: "20" },
      { to: "/app/risks", label: "Risks", icon: "⚠️", num: "4" },
      { to: "/app/dependencies", label: "Dependencies", icon: "🔗", num: "9" },
    ],
  },
  {
    heading: "VALUE",
    emoji: "💎",
    items: [
      { to: "/app/benefits", label: "Benefits", icon: "🎁", num: "18" },
      { to: "/app/cost-vs-benefit", label: "Cost vs Benefit", icon: "⚖️", num: "11" },
      { to: "/app/prioritisation", label: "Prioritisation", icon: "🏅", num: "21" },
      { to: "/app/demand-pipeline", label: "Demand Pipeline", icon: "📥", num: "10" },
      { to: "/app/portfolio-movements", label: "Portfolio Movements", icon: "🔀", num: "23" },
    ],
  },
  {
    heading: "FINANCE",
    emoji: "💰",
    items: [
      { to: "/app/financials", label: "Financials", icon: "💰", num: "5" },
      { to: "/app/fy-allocation", label: "FY Allocation", icon: "📅", num: "26" },
      { to: "/app/phase-financials", label: "Phase Financials", icon: "💹", num: "29" },
    ],
  },
  {
    heading: "ORGANISATION",
    emoji: "🏢",
    items: [
      { to: "/app/portfolio-segmentation", label: "Portfolio Segmentation", icon: "🗂️", num: "15" },
      { to: "/app/resources", label: "Resources", icon: "👥", num: "7" },
      { to: "/app/business-units", label: "Business Units", icon: "🏛️" },
      { to: "/app/team", label: "Team", icon: "👤" },
    ],
  },
  {
    heading: "ADMIN",
    emoji: "⚙️",
    items: [
      { to: "/app/data-editor", label: "Data Editor", icon: "✏️", num: "13", adminOnly: true },
      { to: "/app/configuration", label: "Configuration", icon: "⚙️", num: "25", adminOnly: true },
      { to: "/app/team", label: "Admin Users", icon: "🛡️", num: "32", adminOnly: true },
      { to: "/app/settings", label: "Settings", icon: "🔧" },
      { to: "/app/billing", label: "Billing", icon: "💳" },
    ],
  },
];

const THEME_KEY = "pmo-theme";
const COLLAPSE_KEY = "pmo-sidebar-collapsed";

function roleLabel(roles: string[]) {
  if (roles.includes("admin") || roles.includes("org_admin") || roles.includes("platform_admin"))
    return "Administrator";
  if (roles.includes("executive") || roles.includes("executive_viewer")) return "Executive Viewer";
  if (roles.includes("bu_lead")) return "BU Lead";
  if (roles.includes("pm") || roles.includes("project_manager")) return "Project Manager";
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

function breadcrumbFor(pathname: string): string {
  const flat = navGroups.flatMap((g) => g.items);
  const hit = flat.find((n) => (n.exact ? pathname === n.to : pathname === n.to || pathname.startsWith(n.to + "/")));
  if (!hit) return "PMO Portfolio";
  return hit.num ? `${hit.num} · ${hit.label}` : hit.label;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, roles, organization, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const admin = isAdmin(roles);
  const queryClient = useQueryClient();
  const [fys, setFys] = useFyFilter();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const displayName = profile?.full_name || profile?.email || "User";
  const roleText = roleLabel(roles);
  const crumb = breadcrumbFor(pathname);

  const allNav = useMemo(
    () => navGroups.flatMap((g) => g.items.filter((n) => !n.adminOnly || admin)),
    [admin],
  );

  const refreshData = async () => {
    await queryClient.invalidateQueries();
    toast.success("Portfolio data refreshed");
  };

  const exportPpt = async () => {
    if (!organization) return toast.error("No organization");
    toast.message("Building PowerPoint…");
    try {
      const bundle = await fetchDomainBundle(organization.id);
      await exportPortfolioBriefing(bundle);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PPT export failed");
    }
  };

  const toggleFy = (fy: string) => {
    if (fys.includes(fy)) setFys(fys.filter((x) => x !== fy));
    else setFys([...fys, fy]);
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
      <div className="border-b border-[#d1d5db] px-3 pb-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {!collapsed && (
              <>
                <div className="text-[17px] font-bold tracking-wide text-[#0b1220]">PMO PORTFOLIO</div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">
                  Enterprise Edition
                </div>
                {organization && (
                  <div className="mt-1 truncate text-[11px] text-[#6b7280]" title={organization.name}>
                    {organization.name}
                  </div>
                )}
              </>
            )}
            {collapsed && (
              <div className="text-center text-lg" title="PMO Portfolio">
                📊
              </div>
            )}
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

        {!collapsed && (
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[13px] font-bold text-[#0b1220]">
              <span>📂</span> Data Source
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

        {!collapsed && (
          <div className="border-t border-[#d1d5db] pt-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold text-[#0b1220]">
              <span>📅</span> Financial Year
            </div>
            <div className="flex flex-wrap gap-1">
              {FY_OPTIONS.map((fy) => (
                <button
                  key={fy}
                  type="button"
                  className="fy-chip"
                  data-active={fys.includes(fy)}
                  onClick={() => toggleFy(fy)}
                >
                  {fy}
                </button>
              ))}
            </div>
            {fys.length > 0 ? (
              <button
                type="button"
                className="mt-1 text-[10px] text-[#1d4ed8] hover:underline"
                onClick={() => setFys([])}
              >
                Clear filter ({fys.join(", ")})
              </button>
            ) : (
              <p className="mt-1 text-[10px] text-[#6b7280]">All years</p>
            )}
          </div>
        )}

        {!collapsed && (
          <div className="grid grid-cols-2 gap-2 border-t border-[#d1d5db] pt-3">
            <ShellButton onClick={() => void refreshData()}>🔄 Refresh</ShellButton>
            <ShellButton onClick={() => void exportPpt()}>📤 PPT</ShellButton>
          </div>
        )}

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
                        key={`${n.to}-${n.num || n.label}`}
                        to={n.to}
                        title={n.label}
                        className={cn(
                          "nav-item flex items-center gap-2 rounded-md border-l-[3px] border-transparent px-2 py-1.5 text-[12.5px] transition-colors",
                          collapsed && "justify-center px-1",
                          active ? "nav-item-active" : "text-[#0b1220]",
                        )}
                      >
                        <span className="shrink-0 text-[14px] leading-none">{n.icon}</span>
                        {!collapsed && (
                          <span className="truncate">
                            {n.num ? (
                              <span className="text-[#6b7280]">{n.num} · </span>
                            ) : null}
                            {n.label}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

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
      <aside
        className={cn(
          "hidden flex-shrink-0 flex-col border-r border-[#d1d5db] bg-[#e9edf2] md:flex",
          collapsed ? "w-[58px]" : "w-[260px]",
        )}
      >
        {sidebarInner}
      </aside>

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

        {/* Global TopBar — Spec §2.6 / §14 */}
        <div className="topbar">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] text-muted-foreground">
              <Link to="/app" className="hover:text-primary">
                Home
              </Link>
              <span className="mx-1.5">/</span>
              <span className="font-medium text-foreground">{crumb}</span>
            </div>
          </div>

          <div className="hidden flex-wrap items-center gap-1 sm:flex">
            {FY_OPTIONS.slice(0, 4).map((fy) => (
              <button
                key={fy}
                type="button"
                className="fy-chip"
                data-active={fys.includes(fy)}
                onClick={() => toggleFy(fy)}
              >
                {fy}
              </button>
            ))}
          </div>

          <ShellButton onClick={() => setCmdOpen(true)} className="gap-2" title="Command palette (⌘K)">
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden rounded border border-border px-1 text-[10px] text-muted-foreground md:inline">
              ⌘K
            </kbd>
          </ShellButton>

          <ShellButton onClick={() => void refreshData()}>🔄</ShellButton>

          <div className="relative">
            <ShellButton onClick={() => setExportOpen((v) => !v)}>📤 Export</ShellButton>
            {exportOpen && (
              <div className="absolute right-0 top-full z-30 mt-1 w-40 rounded-md border border-border bg-white py-1 shadow-lg">
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-[12px] hover:bg-[#eef2ff]"
                  onClick={() => {
                    setExportOpen(false);
                    void navigate({ to: "/app/data-editor" });
                  }}
                >
                  📊 Excel
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-[12px] hover:bg-[#eef2ff]"
                  onClick={() => {
                    setExportOpen(false);
                    window.print();
                  }}
                >
                  📄 PDF
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-[12px] hover:bg-[#eef2ff]"
                  onClick={() => {
                    setExportOpen(false);
                    void exportPpt();
                  }}
                >
                  📈 PPT
                </button>
              </div>
            )}
          </div>
        </div>

        <main className="flex-1 overflow-x-hidden p-5">{children}</main>
      </div>

      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <CommandInput placeholder="Jump to a page, project action…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Pages">
            {allNav.map((n) => (
              <CommandItem
                key={`${n.to}-${n.label}`}
                value={`${n.num || ""} ${n.label}`}
                onSelect={() => {
                  setCmdOpen(false);
                  void navigate({ to: n.to });
                }}
              >
                <span className="mr-2">{n.icon}</span>
                {n.num ? `${n.num} · ` : ""}
                {n.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={() => {
                setCmdOpen(false);
                void navigate({ to: "/app/projects/new" });
              }}
            >
              ➕ New Project
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setCmdOpen(false);
                void refreshData();
              }}
            >
              🔄 Refresh data
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setCmdOpen(false);
                void exportPpt();
              }}
            >
              📤 Export PowerPoint
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
