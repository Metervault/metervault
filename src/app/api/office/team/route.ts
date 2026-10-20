import { and, count, eq, ne } from "drizzle-orm";
import { requireAdmin } from "@/server/auth/require-admin";
import { getDb, safeDbMessage } from "@/server/db/client";
import { users } from "@/server/db/schema";

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const body = (await request.json()) as { userId?: unknown; orgRole?: unknown };
  const userId = typeof body.userId === "string" ? body.userId : "";
  const orgRole = body.orgRole === "admin" || body.orgRole === "member" ? body.orgRole : null;
  if (!userId || !orgRole) return Response.json({ error: "Choose a person and a role." }, { status: 400 });
  if (userId === gate.user.id) return Response.json({ error: "You cannot change your own role." }, { status: 400 });

  try {
    const db = getDb();
    const [person] = await db
      .select({ id: users.id, orgRole: users.orgRole })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.organisationId, gate.user.organisationId)))
      .limit(1);
    if (!person) return Response.json({ error: "That person is not in this company." }, { status: 404 });
    if (person.orgRole === "admin" && orgRole === "member") {
      const [row] = await db
        .select({ value: count() })
        .from(users)
        .where(and(eq(users.organisationId, gate.user.organisationId), eq(users.orgRole, "admin"), ne(users.id, userId)));
      if (Number(row?.value ?? 0) === 0) return Response.json({ error: "The company needs at least one manager." }, { status: 409 });
    }
    await db.update(users).set({ orgRole, updatedAt: new Date() }).where(eq(users.id, userId));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: safeDbMessage(error) }, { status: 500 });
  }
}
