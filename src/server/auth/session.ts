import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { type OrgRole } from "@/lib/roles";
import { getDb, isTransientDbError, resetDb } from "@/server/db/client";
import { sessions, users } from "@/server/db/schema";

export const SESSION_COOKIE = "metervault-session";
const THIRTY_DAYS = 60 * 60 * 24 * 30;
const SESSION_MEMORY_MS = 60_000;

const remembered = new Map<string, { user: SessionUser; freshUntil: number }>();

export type SessionUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  organisationId: string;
  orgRole: OrgRole;
};

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + THIRTY_DAYS * 1000);
  await getDb().insert(sessions).values({ userId, token, expiresAt });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
}

export async function clearSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    remembered.delete(token);
    await getDb().delete(sessions).where(eq(sessions.token, token));
  }
  store.delete(SESSION_COOKIE);
}

async function readSession(token: string): Promise<SessionUser | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      organisationId: users.organisationId,
      orgRole: users.orgRole,
      removedAt: users.removedAt,
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.token, token))
    .limit(1);
  if (!row || row.removedAt) {
    if (row) await db.delete(sessions).where(eq(sessions.id, row.sessionId));
    return null;
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, row.sessionId));
    return null;
  }
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    organisationId: row.organisationId,
    orgRole: row.orgRole,
  };
}

export async function forgetUser(userId: string) {
  const rows = await getDb().select({ token: sessions.token }).from(sessions).where(eq(sessions.userId, userId));
  for (const row of rows) remembered.delete(row.token);
}

function rememberedUser(token: string) {
  const hit = remembered.get(token);
  if (!hit) return null;
  if (hit.freshUntil <= Date.now()) {
    remembered.delete(token);
    return null;
  }
  return hit.user;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const cached = rememberedUser(token);
  if (cached) return cached;
  try {
    const user = await readSession(token);
    if (user) remembered.set(token, { user, freshUntil: Date.now() + SESSION_MEMORY_MS });
    return user;
  } catch (error) {
    if (!isTransientDbError(error)) throw error;
    resetDb();
    const user = await readSession(token);
    if (user) remembered.set(token, { user, freshUntil: Date.now() + SESSION_MEMORY_MS });
    return user;
  }
}
