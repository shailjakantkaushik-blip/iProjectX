import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "org_admin" | "bu_lead" | "pm" | "executive";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  org_id: string | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  organization: Organization | null;
  roles: AppRole[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

async function ensureProfile(user: User): Promise<Profile | null> {
  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("id,email,full_name,org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) {
    console.error("[auth] Failed to read profile:", readError.message);
    throw new Error(readError.message);
  }
  if (existing) return existing;

  const email = user.email ?? "";
  const fullName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    email ||
    null;

  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .upsert(
      { id: user.id, email, full_name: fullName },
      { onConflict: "id" },
    )
    .select("id,email,full_name,org_id")
    .maybeSingle();

  if (insertError) {
    console.error("[auth] Failed to create profile:", insertError.message);
    const { data: again } = await supabase
      .from("profiles")
      .select("id,email,full_name,org_id")
      .eq("id", user.id)
      .maybeSingle();
    if (again) return again;
    throw new Error(insertError.message);
  }

  return created ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bootGen = useRef(0);

  const loadOrgAndRoles = async (userId: string, orgId: string | null) => {
    if (!orgId) {
      setOrganization(null);
      setRoles([]);
      return;
    }
    const [orgRes, rolesRes] = await Promise.all([
      supabase.from("organizations").select("id,name,slug,plan").eq("id", orgId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId).eq("org_id", orgId),
    ]);
    if (orgRes.error) console.error("[auth] Failed to load organization:", orgRes.error.message);
    if (rolesRes.error) console.error("[auth] Failed to load roles:", rolesRes.error.message);
    setOrganization(orgRes.data ?? null);
    setRoles((rolesRes.data ?? []).map((r) => r.role as AppRole));
  };

  const bootstrapUser = async (user: User) => {
    const p = await ensureProfile(user);
    setProfile(p);
    await loadOrgAndRoles(user.id, p?.org_id ?? null);
  };

  const clearUser = () => {
    setProfile(null);
    setOrganization(null);
    setRoles([]);
  };

  const runBootstrap = async (next: Session | null, opts: { blockUi: boolean }) => {
    const gen = ++bootGen.current;
    setSession(next);
    setError(null);
    if (opts.blockUi) setLoading(true);
    try {
      if (next?.user) {
        await bootstrapUser(next.user);
      } else {
        clearUser();
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load account";
      console.error("[auth]", message);
      if (gen === bootGen.current) {
        setError(message);
        clearUser();
      }
    } finally {
      if (gen === bootGen.current && opts.blockUi) setLoading(false);
    }
  };

  const refresh = async () => {
    const user = session?.user;
    if (!user) return;
    setError(null);
    setLoading(true);
    try {
      await bootstrapUser(user);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to refresh profile";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      // Avoid calling Supabase from inside this callback (can deadlock).
      setTimeout(() => {
        if (cancelled) return;
        // Token refresh: keep session, don't remount the app behind Loading…
        if (event === "TOKEN_REFRESHED") {
          setSession(s);
          return;
        }
        if (event === "INITIAL_SESSION") {
          // Handled by getSession below to avoid double bootstrap
          return;
        }
        void runBootstrap(s, { blockUi: true });
      }, 0);
    });

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (cancelled) return;
      if (sessionError) {
        console.error("[auth] getSession:", sessionError.message);
        setError(sessionError.message);
        clearUser();
        setLoading(false);
        return;
      }
      void runBootstrap(data.session, { blockUi: true });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only bootstrap
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        organization,
        roles,
        loading,
        error,
        refresh,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function hasAnyRole(roles: AppRole[], required: AppRole[]) {
  return roles.some((r) => required.includes(r));
}

export function canEditProjects(roles: AppRole[]) {
  return hasAnyRole(roles, ["admin", "org_admin", "bu_lead", "pm"]);
}

export function isAdmin(roles: AppRole[]) {
  return hasAnyRole(roles, ["admin", "org_admin"]);
}
