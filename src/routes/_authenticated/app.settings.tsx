import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { organization, profile, roles } = useAuth();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <Card>
        <CardHeader><CardTitle>Your account</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><span className="text-muted-foreground">Name:</span> {profile?.full_name}</div>
          <div><span className="text-muted-foreground">Email:</span> {profile?.email}</div>
          <div><span className="text-muted-foreground">Roles:</span> {roles.join(", ") || "viewer (read-only)"}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Organization</CardTitle><CardDescription>Details of your tenant.</CardDescription></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><span className="text-muted-foreground">Name:</span> {organization?.name}</div>
          <div><span className="text-muted-foreground">Slug:</span> {organization?.slug}</div>
          <div><span className="text-muted-foreground">Plan:</span> {organization?.plan}</div>
        </CardContent>
      </Card>
    </div>
  );
}
