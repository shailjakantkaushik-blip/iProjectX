import Link from "next/link";
import { SignupForm } from "@/components/auth-forms";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const params = await searchParams;
  const plan = params.plan || "professional";

  return (
    <div className="mesh-grid flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg rounded-[2rem] bg-white/75 p-8 shadow-xl ring-1 ring-black/5 md:p-10">
        <Link href="/" className="font-[family-name:var(--font-display)] text-2xl text-[var(--brand-primary)]">
          iProjectX
        </Link>
        <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl">
          Create your workspace
        </h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          14-day trial · seat-based plans · white-label ready
        </p>
        <div className="mt-8">
          <SignupForm defaultPlan={plan} />
        </div>
      </div>
    </div>
  );
}
