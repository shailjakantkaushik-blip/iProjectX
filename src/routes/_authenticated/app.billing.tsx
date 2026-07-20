import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { createCheckoutSession, getIntegrationsStatus } from "@/lib/billing.functions";

export const Route = createFileRoute("/_authenticated/app/billing")({
  component: Billing,
});

const TIERS = [
  { name: "Free", plan: "free" as const, price: "$0", limits: ["Up to 5 projects", "1 admin"], cta: "Current" },
  {
    name: "Team",
    plan: "team" as const,
    price: "$49/mo",
    limits: ["Unlimited projects", "10 users", "Email support"],
    cta: "Upgrade",
  },
  {
    name: "Business",
    plan: "business" as const,
    price: "$199/mo",
    limits: ["Unlimited users", "SSO", "Priority support"],
    cta: "Upgrade",
  },
];

function Billing() {
  const { organization, profile } = useAuth();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{
    supabase: boolean;
    stripe: boolean;
    cloudflareR2: boolean;
  } | null>(null);

  useEffect(() => {
    getIntegrationsStatus()
      .then((s) =>
        setStatus({
          supabase: s.supabase,
          stripe: s.stripe,
          cloudflareR2: s.cloudflareR2,
        }),
      )
      .catch(() => setStatus({ supabase: false, stripe: false, cloudflareR2: false }));
  }, []);

  function upgrade(plan: "team" | "business") {
    if (!organization?.id) {
      toast.error("No organization found");
      return;
    }
    startTransition(async () => {
      try {
        const res = await createCheckoutSession({
          data: {
            plan,
            orgId: organization.id,
            customerEmail: profile?.email || undefined,
          },
        });
        window.location.href = res.url;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Checkout failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Current plan: <span className="font-medium text-foreground">{organization?.plan || "free"}</span>
        </p>
      </div>

      {status ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Integrations (from Vercel env)</CardTitle>
            <CardDescription>Status of Supabase, Stripe, and Cloudflare R2 wiring.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant={status.supabase ? "default" : "destructive"}>
              Supabase {status.supabase ? "connected" : "missing env"}
            </Badge>
            <Badge variant={status.stripe ? "default" : "secondary"}>
              Stripe {status.stripe ? "connected" : "not configured"}
            </Badge>
            <Badge variant={status.cloudflareR2 ? "default" : "secondary"}>
              Cloudflare R2 {status.cloudflareR2 ? "connected" : "not configured"}
            </Badge>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {TIERS.map((t) => {
          const isCurrent = (organization?.plan || "free") === t.plan || (t.plan === "free" && !organization?.plan);
          return (
            <Card key={t.name}>
              <CardHeader>
                <CardTitle>{t.name}</CardTitle>
                <CardDescription className="text-2xl font-bold text-foreground">{t.price}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-1.5 text-sm">
                  {t.limits.map((l) => (
                    <li key={l} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      {l}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={isCurrent ? "outline" : "default"}
                  disabled={isCurrent || pending || t.plan === "free"}
                  onClick={() => {
                    if (t.plan === "team" || t.plan === "business") upgrade(t.plan);
                  }}
                >
                  {isCurrent ? "Current" : t.cta}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
