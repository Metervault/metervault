import { eq } from "drizzle-orm";
import { verifyPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import { getDb, safeDbMessage } from "@/server/db/client";
import { users } from "@/server/db/schema";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: unknown; password?: unknown };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) return Response.json({ error: "Enter your email and password." }, { status: 400 });

  try {
    const [user] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      return Response.json({ error: "Email or password is wrong." }, { status: 401 });
    }
    await createSession(user.id);
    return Response.json({ user: { id: user.id, name: user.name, username: user.username, email: user.email, orgRole: user.orgRole } });
  } catch (error) {
    return Response.json({ error: safeDbMessage(error) }, { status: 500 });
  }
}
