import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

function Onboarding() {
  const { organization, refresh, loading, profile, error, session } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [fyStartMonth, setFyStartMonth] = useState(7);

  useEffect(() => {
    if (!loading && organization) navigate({ to: "/app", replace: true });
  }, [loading, organization, navigate]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session?.user) return toast.error("Not signed in");
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name")).trim();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 6);
    setBusy(true);

    // Ensure a profiles row exists before the RPC updates org_id
    if (!profile) {
      const email = session.user.email ?? "";
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: session.user.id,
        email,
        full_name:
          (typeof session.user.user_metadata?.full_name === "string" &&
            session.user.user_metadata.full_name) ||
          email ||
          null,
      });
      if (profileError) {
        setBusy(false);
        return toast.error(profileError.message);
      }
    }

    const { error: rpcError } = await supabase.rpc("create_org_and_join", { _name: name, _slug: slug });
    if (rpcError) {
      setBusy(false);
      return toast.error(rpcError.message);
    }

    // Best-effort FY start month (column added by PMO domain migration)
    try {
      const { data: orgRow } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", session.user.id)
        .maybeSingle();
      if (orgRow?.org_id) {
        await (supabase as any)
          .from("organizations")
          .update({ fy_start_month: fyStartMonth })
          .eq("id", orgRow.org_id);
      }
    } catch {
      // Non-fatal — org was created; FY month can be set later in Configuration
    }

    setBusy(false);
    toast.success("Organization created");
    await refresh();
    navigate({ to: "/app", replace: true });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}</CardTitle>
          <CardDescription>Create your organization to get started. You'll be the org admin.</CardDescription>
          {error ? <p className="pt-2 text-sm text-destructive">{error}</p> : null}
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="name">Organization name</Label>
              <Input id="name" name="name" required placeholder="Acme Corp" />
            </div>
            <div>
              <Label htmlFor="fy_start_month">Financial year start month</Label>
              <select
                id="fy_start_month"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={fyStartMonth}
                onChange={(e) => setFyStartMonth(Number(e.target.value))}
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">Default July (AU FY). Used for FY filters and charts.</p>
            </div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating…" : "Create organization"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
