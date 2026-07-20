import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";

export default function LoginPage() {
  return (
    <div className="mesh-grid flex min-h-screen items-center justify-center px-6 py-12">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white/70 shadow-xl ring-1 ring-black/5 md:grid-cols-2">
        <div className="hero-media hidden flex-col justify-between p-10 text-white md:flex">
          <Link href="/" className="font-[family-name:var(--font-display)] text-3xl">
            iProjectX
          </Link>
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight">
              Sign in to your delivery workspace
            </h1>
            <p className="mt-3 text-white/80">
              Demo: demo@iprojectx.com / demo1234
            </p>
          </div>
          <p className="text-sm text-white/70">Multi-tenant · Seat billing · White-label</p>
        </div>
        <div className="p-8 md:p-12">
          <h2 className="font-[family-name:var(--font-display)] text-3xl">Welcome back</h2>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">Access your enterprise portfolio.</p>
          <div className="mt-8">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
