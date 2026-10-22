import { isOfficeRole } from "@/lib/roles";
import { getSessionUser, type SessionUser } from "@/server/auth/session";

export async function requireAdmin(): Promise<{ user: SessionUser } | { error: Response }> {
  const user = await getSessionUser();
  if (!user) return { error: Response.json({ error: "Sign in required." }, { status: 401 }) };
  if (!isOfficeRole(user.orgRole)) return { error: Response.json({ error: "Only a manager can do that." }, { status: 403 }) };
  return { user };
}
