# Stripe enterprise invoicing

iProjectX bills enterprises by **sending a Stripe invoice**. When Stripe confirms payment (`invoice.paid` webhook), the organization plan/seats become **active**.

## Flow

1. Platform admin (`/app/admin`) or org admin (`/app/settings`) creates an invoice
2. Stripe emails a hosted invoice to the billing email
3. Customer pays (card / Stripe-supported methods)
4. Webhook `POST /api/webhooks/stripe` receives `invoice.paid`
5. App sets `subscriptionStatus = active` and applies plan + seats from invoice metadata

## Vercel env vars (`i-project-x`)

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Create customers + invoices |
| `STRIPE_WEBHOOK_SECRET` | Verify webhook signatures |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional (future Checkout UI) |

## Webhook setup (Stripe Dashboard)

1. Developers → Webhooks → Add endpoint  
2. URL: `https://i-project-x.vercel.app/api/webhooks/stripe`  
3. Events:
   - `invoice.paid`
   - `invoice.payment_failed`
   - `invoice.finalized`
   - `invoice.sent`
   - `invoice.updated`
   - `invoice.voided`
   - `invoice.marked_uncollectible`
4. Copy signing secret → `STRIPE_WEBHOOK_SECRET`
5. Redeploy Vercel

## Database

Run / re-run `supabase/schema.sql` (includes `Invoice` table), or apply the Prisma migration:

```bash
npx prisma migrate deploy
```

## Local test

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Use the CLI webhook secret as `STRIPE_WEBHOOK_SECRET` in `.env.local`.

## Who can invoice

| Role | Where |
|------|--------|
| Platform admin | `/app/admin` — any org, custom amount, due days |
| Org owner/admin | `/app/settings` — invoice for their workspace |
