import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { sessions, users } from "@/server/db/schema";

export const SESSION_COOKIE = "metervault-session";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export type SessionUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  organisationId: string;
  orgRole: "admin" | "member";
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
  if (token) await getDb().delete(sessions).where(eq(sessions.token, token));
  store.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = getDb();
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      organisationId: users.organisationId,
      orgRole: users.orgRole,
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.token, token))
    .limit(1);
  if (!row) return null;
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
