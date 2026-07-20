import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const { data: p } = await supabase
      .from("profiles")
      .select("id,email,full_name,org_id")
      .eq("id", userId)
      .maybeSingle();
    setProfile(p ?? null);

    if (p?.org_id) {
      const [orgRes, rolesRes] = await Promise.all([
        supabase.from("organizations").select("id,name,slug,plan").eq("id", p.org_id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId).eq("org_id", p.org_id),
      ]);
      setOrganization(orgRes.data ?? null);
      setRoles((rolesRes.data ?? []).map((r) => r.role as AppRole));
    } else {
      setOrganization(null);
      setRoles([]);
    }
  };

  const refresh = async () => {
    if (session?.user) await loadProfile(session.user.id);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setProfile(null);
        setOrganization(null);
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
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
