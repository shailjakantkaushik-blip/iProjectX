import { db } from "./db";
import { createClient } from "@/lib/supabase/server";

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  orgId: string;
  orgSlug: string;
  role: string;
  authUserId: string;
};

export async function getAuthUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const ctx = await getCurrentContext();
  return ctx?.session ?? null;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export async function getCurrentContext() {
  const authUser = await getAuthUser();
  if (!authUser?.email) return null;

  let user = await db.user.findFirst({
    where: {
      OR: [{ authUserId: authUser.id }, { id: authUser.id }, { email: authUser.email.toLowerCase() }],
    },
  });

  // Link existing profile row to Supabase Auth on first login
  if (user && !user.authUserId) {
    user = await db.user.update({
      where: { id: user.id },
      data: { authUserId: authUser.id },
    });
  }

  if (!user) return null;

  const membership = await db.membership.findFirst({
    where: { userId: user.id },
    include: { organization: { include: { plan: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) return null;

  const session: SessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    orgId: membership.organizationId,
    orgSlug: membership.organization.slug,
    role: membership.role,
    authUserId: authUser.id,
  };

  return {
    session,
    user,
    membership,
    organization: membership.organization,
  };
}

export function canEdit(role: string) {
  return role === "owner" || role === "admin" || role === "bu_lead" || role === "pm";
}

export function isAdminRole(role: string) {
  return role === "owner" || role === "admin";
}
