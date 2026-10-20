import { eq } from "drizzle-orm";
import { hashPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import { getDb, safeDbMessage } from "@/server/db/client";
import { ensureOrganisation, organisationRole } from "@/server/db/reference";
import { users } from "@/server/db/schema";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: unknown; username?: unknown; email?: unknown; password?: unknown };
  const name = clean(body.name);
  const username = clean(body.username);
  const email = clean(body.email).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  if (name.length < 2) return Response.json({ error: "Enter your name." }, { status: 400 });
  if (!/^[A-Za-z0-9._-]{2,40}$/.test(username)) return Response.json({ error: "Username must be 2–40 letters, numbers, dots, or hyphens." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Enter a valid email." }, { status: 400 });
  if (password.length < 8) return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  try {
    const organisation = await ensureOrganisation();
    const db = getDb();
    const [existingEmail] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existingEmail) return Response.json({ error: "An account with that email already exists." }, { status: 409 });
    const role = await organisationRole(organisation.id);
    const [user] = await db
      .insert(users)
      .values({
        organisationId: organisation.id,
        orgRole: role,
        name,
        username,
        email,
        passwordHash: await hashPassword(password),
      })
      .returning({ id: users.id, name: users.name, username: users.username, email: users.email, orgRole: users.orgRole });
    await createSession(user.id);
    return Response.json({ user });
  } catch (error) {
    return Response.json({ error: safeDbMessage(error) }, { status: 500 });
  }
}
