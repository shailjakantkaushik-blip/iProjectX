import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db";

const COOKIE = "ipx_session";
const TTL_DAYS = 14;

function secret() {
  const s = process.env.AUTH_SECRET || "dev-secret-change-me-please-32chars";
  return new TextEncoder().encode(s);
}

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  orgId: string;
  orgSlug: string;
  role: string;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL_DAYS}d`)
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export async function getCurrentContext() {
  const session = await getSession();
  if (!session) return null;

  const [user, membership, organization] = await Promise.all([
    db.user.findUnique({ where: { id: session.userId } }),
    db.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: session.orgId,
          userId: session.userId,
        },
      },
    }),
    db.organization.findUnique({
      where: { id: session.orgId },
      include: { plan: true },
    }),
  ]);

  if (!user || !membership || !organization) return null;

  return { session, user, membership, organization };
}

export function canEdit(role: string) {
  return role === "owner" || role === "admin" || role === "bu_lead" || role === "pm";
}

export function isAdminRole(role: string) {
  return role === "owner" || role === "admin";
}
