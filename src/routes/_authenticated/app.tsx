import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

function AppLayout() {
  const { profile, organization, loading, error, refresh, signOut, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Signed in but no org yet → finish setup (do not require profile to avoid stuck Loading)
    if (!loading && !error && session && !organization) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [session, organization, loading, error, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm font-medium text-foreground">Couldn’t load your account</p>
        <p className="max-w-md text-sm text-muted-foreground">{error}</p>
        <p className="max-w-md text-xs text-muted-foreground">
          Confirm Supabase migrations are applied and{" "}
          <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_*</code> match your project.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void refresh()}>
            Retry
          </Button>
          <Button variant="ghost" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  if (!profile || !organization) {
    // Redirecting to onboarding (or waiting for navigate)
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
