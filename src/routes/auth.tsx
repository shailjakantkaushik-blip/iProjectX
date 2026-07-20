import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BarChart3 } from "lucide-react";
import { getAppName } from "@/lib/env";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: `Sign in — ${getAppName()}` }, { name: "robots", content: "noindex" }] }),
  component: AuthPage,
});

function AuthPage() {
  const appName = getAppName();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/app", replace: true });
  }, [session, loading, navigate]);

  const onSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Signed in");
    navigate({ to: "/app", replace: true });
  };

  const onSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { full_name: String(fd.get("full_name") || "") },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — check email if confirmation is required.");
    navigate({ to: "/app", replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="rounded-lg bg-primary p-2 text-primary-foreground"><BarChart3 className="h-5 w-5" /></div>
          <span className="text-lg font-semibold">{appName}</span>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Sign in or create an account to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={onSignIn} className="space-y-4 pt-4">
                  <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required autoComplete="email" /></div>
                  <div><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" required autoComplete="current-password" /></div>
                  <Button type="submit" className="w-full" disabled={busy}>{busy ? "…" : "Sign in"}</Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={onSignUp} className="space-y-4 pt-4">
                  <div><Label htmlFor="full_name">Full name</Label><Input id="full_name" name="full_name" required /></div>
                  <div><Label htmlFor="email2">Email</Label><Input id="email2" name="email" type="email" required autoComplete="email" /></div>
                  <div><Label htmlFor="password2">Password</Label><Input id="password2" name="password" type="password" required minLength={6} autoComplete="new-password" /></div>
                  <Button type="submit" className="w-full" disabled={busy}>{busy ? "…" : "Create account"}</Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
