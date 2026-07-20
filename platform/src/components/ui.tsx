"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 disabled:opacity-50",
        variant === "primary" &&
          "bg-[var(--brand-primary)] text-white shadow-sm hover:brightness-110 hover:-translate-y-0.5",
        variant === "secondary" &&
          "bg-white/80 text-[var(--ink)] ring-1 ring-[var(--line)] hover:bg-white",
        variant === "ghost" && "text-[var(--ink-soft)] hover:bg-black/5",
        variant === "danger" && "bg-rose-600 text-white hover:bg-rose-500",
        className
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-[var(--line)] bg-white/90 px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20",
        className
      )}
      {...props}
    />
  );
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
      {children}
    </label>
  );
}

export function Card({
  children,
  className,
  interactive = false,
  style,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={cn(
        interactive
          ? "rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md"
          : "rounded-2xl bg-white/60 p-5 ring-1 ring-black/5 backdrop-blur",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "amber" | "red" | "brand";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
        tone === "neutral" && "bg-slate-100 text-slate-700",
        tone === "green" && "bg-emerald-100 text-emerald-800",
        tone === "amber" && "bg-amber-100 text-amber-800",
        tone === "red" && "bg-rose-100 text-rose-800",
        tone === "brand" && "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)] md:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm text-[var(--ink-soft)] md:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  href,
  cta,
}: {
  title: string;
  description: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white/40 px-6 py-16 text-center">
      <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--ink-soft)]">{description}</p>
      {href && cta ? (
        <Link href={href} className="mt-6 inline-flex">
          <Button>{cta}</Button>
        </Link>
      ) : null}
    </div>
  );
}
