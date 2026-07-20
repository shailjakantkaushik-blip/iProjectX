import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/billing")({
  component: Billing,
});

const TIERS = [
  { name: "Free", price: "$0", limits: ["Up to 5 projects", "1 admin"], cta: "Current" },
  { name: "Team", price: "$49/mo", limits: ["Unlimited projects", "10 users", "Email support"], cta: "Upgrade" },
  { name: "Business", price: "$199/mo", limits: ["Unlimited users", "SSO", "Priority support"], cta: "Upgrade" },
];

function Billing() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">Choose the plan that fits your team.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {TIERS.map((t) => (
          <Card key={t.name}>
            <CardHeader>
              <CardTitle>{t.name}</CardTitle>
              <CardDescription className="text-2xl font-bold text-foreground">{t.price}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-1.5 text-sm">
                {t.limits.map((l) => <li key={l} className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" />{l}</li>)}
              </ul>
              <Button
                className="w-full"
                variant={t.cta === "Current" ? "outline" : "default"}
                disabled={t.cta === "Current"}
                onClick={() => toast.info("Stripe checkout will be wired up next — ping to enable Lovable Payments.")}
              >
                {t.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
