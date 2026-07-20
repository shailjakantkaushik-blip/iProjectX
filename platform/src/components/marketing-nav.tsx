import Link from "next/link";
import { Button } from "./ui";

export function MarketingNav() {
  return (
    <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
      <Link href="/" className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
        iProjectX
      </Link>
      <nav className="hidden items-center gap-8 text-sm font-medium text-[var(--ink-soft)] md:flex">
        <Link href="/pricing" className="hover:text-[var(--ink)]">
          Pricing
        </Link>
        <Link href="/login" className="hover:text-[var(--ink)]">
          Sign in
        </Link>
        <Link href="/signup">
          <Button>Start free trial</Button>
        </Link>
      </nav>
      <div className="flex gap-2 md:hidden">
        <Link href="/login">
          <Button variant="ghost">Sign in</Button>
        </Link>
        <Link href="/signup">
          <Button>Trial</Button>
        </Link>
      </div>
    </header>
  );
}
