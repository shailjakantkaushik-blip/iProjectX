import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  BarChart3, Home, LayoutDashboard, FolderKanban, AlertTriangle, DollarSign,
  Map, Users, LineChart, GitBranch, Inbox, Scale, Info, Table2, Bell,
  PieChart, Radio, Flag, Award, Gavel, ListChecks, Trophy, Image as ImageIcon,
  ArrowLeftRight, FileBarChart, Settings, Calendar, Layers, Clock, Wallet,
  Package, Zap, ShieldCheck, LogOut, CreditCard,
} from "lucide-react";
import { useAuth, isAdmin } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: any; exact?: boolean; adminOnly?: boolean };

const navGroups: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Overview",
    items: [
      { to: "/app", label: "0 · Home", icon: Home, exact: true },
      { to: "/app/executive", label: "1 · Executive Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    heading: "Delivery",
    items: [
      { to: "/app/projects", label: "3 · Projects", icon: FolderKanban },
      { to: "/app/risks", label: "4 · Risks", icon: AlertTriangle },
      { to: "/app/financials", label: "5 · Financials", icon: DollarSign },
      { to: "/app/roadmap-governance", label: "6 · Roadmap Governance", icon: Map },
      { to: "/app/resources", label: "7 · Resources", icon: Users },
      { to: "/app/roadmap-analytics", label: "8 · Roadmap Analytics", icon: LineChart },
      { to: "/app/dependencies", label: "9 · Dependencies", icon: GitBranch },
    ],
  },
  {
    heading: "Portfolio",
    items: [
      { to: "/app/demand-pipeline", label: "10 · Demand Pipeline", icon: Inbox },
      { to: "/app/cost-vs-benefit", label: "11 · Cost vs Benefit", icon: Scale },
      { to: "/app/portfolio-segmentation", label: "15 · Portfolio Segmentation", icon: PieChart },
      { to: "/app/governance-channels", label: "16 · Governance Channels", icon: Radio },
      { to: "/app/stage-gates", label: "17 · Stage Gates", icon: Flag },
      { to: "/app/benefits", label: "18 · Benefits", icon: Award },
      { to: "/app/decisions", label: "19 · Decisions", icon: Gavel },
      { to: "/app/actions", label: "20 · Actions", icon: ListChecks },
      { to: "/app/prioritisation", label: "21 · Prioritisation", icon: Trophy },
      { to: "/app/project-infographic", label: "22 · Project Infographic", icon: ImageIcon },
      { to: "/app/portfolio-movements", label: "23 · Portfolio Movements", icon: ArrowLeftRight },
      { to: "/app/executive-reports", label: "24 · Executive Reports", icon: FileBarChart },
    ],
  },
  {
    heading: "Planning",
    items: [
      { to: "/app/fy-allocation", label: "26 · FY Allocation", icon: Wallet },
      { to: "/app/programs", label: "27 · Programs", icon: Layers },
      { to: "/app/timeline", label: "28 · Timeline", icon: Calendar },
      { to: "/app/phase-financials", label: "29 · Phase Financials", icon: Clock },
      { to: "/app/release-register", label: "30 · Release Register", icon: Package },
      { to: "/app/agile", label: "31 · Agile", icon: Zap },
    ],
  },
  {
    heading: "Admin",
    items: [
      { to: "/app/data-editor", label: "13 · Data Editor", icon: Table2 },
      { to: "/app/latest-updates", label: "14 · Latest Updates", icon: Bell },
      { to: "/app/configuration", label: "25 · Configuration", icon: Settings },
      { to: "/app/business-units", label: "Business Units", icon: Layers },
      { to: "/app/team", label: "32 · Admin Users", icon: ShieldCheck, adminOnly: true },
      { to: "/app/billing", label: "Billing", icon: CreditCard, adminOnly: true },
      { to: "/app/settings", label: "Settings", icon: Settings },
      { to: "/app/about", label: "12 · About", icon: Info },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { organization, profile, roles, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const admin = isAdmin(roles);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 flex-shrink-0 border-r bg-sidebar md:flex md:flex-col">
        <div className="flex items-center gap-2 border-b border-sidebar-border p-4">
          <div className="rounded-lg bg-primary p-2 text-primary-foreground">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-sidebar-foreground">
              {organization?.name ?? "PMO Enterprise"}
            </div>
            <div className="truncate text-[11px] text-muted-foreground">
              {organization?.plan ?? "free"} plan
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {navGroups.map((group) => {
            const items = group.items.filter((n) => !n.adminOnly || admin);
            if (!items.length) return null;
            return (
              <div key={group.heading}>
                <div className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {group.heading}
                </div>
                <div className="space-y-0.5">
                  {items.map((n) => {
                    const active = n.exact ? pathname === n.to : pathname === n.to || pathname.startsWith(n.to + "/");
                    return (
                      <Link
                        key={n.to}
                        to={n.to}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[12.5px] transition-colors",
                          active
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "text-sidebar-foreground hover:bg-sidebar-accent",
                        )}
                      >
                        <n.icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{n.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 truncate text-[11px] text-muted-foreground">{profile?.email}</div>
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden p-5">{children}</main>
    </div>
  );
}
