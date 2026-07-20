import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { BarChart3, Shield, Users, Layers, Rocket, FileSpreadsheet } from "lucide-react";
import { getAppName } from "@/lib/env";

export const Route = createFileRoute("/")({
  head: () => {
    const appName = getAppName();
    return {
      meta: [
        { title: `${appName} — Multi-tenant Portfolio Management` },
        { name: "description", content: "Run your entire portfolio: projects, risks, budgets, benefits, dashboards. Multi-org, role-based, Excel-friendly." },
        { property: "og:title", content: appName },
        { property: "og:description", content: "Multi-tenant portfolio and project management for enterprise PMOs." },
      ],
    };
  },
  component: Landing,
});

function Landing() {
  const appName = getAppName();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary p-2 text-primary-foreground"><BarChart3 className="h-5 w-5" /></div>
            <span className="font-semibold">{appName}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
            <Link to="/auth"><Button>Get started</Button></Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="py-20 text-center">
          <h1 className="mx-auto max-w-3xl text-5xl font-bold tracking-tight">
            Run your portfolio like an enterprise PMO.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Multi-tenant. Role-based. Waterfall and Agile. Executive dashboards, RAG status, budgets, benefits, RAID — with Excel import/export.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/auth"><Button size="lg">Start free</Button></Link>
          </div>
        </section>

        <section className="grid gap-6 pb-24 md:grid-cols-3">
          {[
            { icon: Shield, title: "Multi-tenant & secure", body: "Isolated organizations with row-level security. Roles for admins, PMs, BU leads, executives." },
            { icon: Layers, title: "Business Units", body: "Divide your org into BUs. Delegate ownership. Roll up KPIs to the top." },
            { icon: Rocket, title: "Agile + Waterfall", body: "Sprints, velocity, phase gates, milestones — in one register." },
            { icon: Users, title: "Team & roles", body: "Invite your team. Fine-grained permissions per project owner and BU." },
            { icon: BarChart3, title: "Executive dashboard", body: "Portfolio KPIs, RAG heatmap, ROI, spend, benefits — live." },
            { icon: FileSpreadsheet, title: "Excel-friendly", body: "Download template, upload workbook, export the current portfolio anytime." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border p-6">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} PMO Enterprise
      </footer>
    </div>
  );
}
