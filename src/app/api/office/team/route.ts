import { and, count, eq, inArray, isNull, ne } from "drizzle-orm";
import { isOfficeRole, type OrgRole } from "@/lib/roles";
import { requireAdmin } from "@/server/auth/require-admin";
import { forgetUser } from "@/server/auth/session";
import { getDb, safeDbMessage } from "@/server/db/client";
import { sessions, users, workOrders } from "@/server/db/schema";

const officeRoles = ["head", "admin"] as const;

function asRole(value: unknown): OrgRole | null {
  return value === "head" || value === "admin" || value === "member" ? value : null;
}

async function otherOfficeCount(organisationId: string, userId: string) {
  const [row] = await getDb()
    .select({ value: count() })
    .from(users)
    .where(and(eq(users.organisationId, organisationId), inArray(users.orgRole, [...officeRoles]), isNull(users.removedAt), ne(users.id, userId)));
  return Number(row?.value ?? 0);
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const body = (await request.json()) as { userId?: unknown; orgRole?: unknown; action?: unknown };
  const userId = typeof body.userId === "string" ? body.userId : "";
  if (!userId) return Response.json({ error: "Choose a person." }, { status: 400 });
  if (userId === gate.user.id) return Response.json({ error: "You cannot change your own account." }, { status: 400 });

  try {
    const db = getDb();
    const [person] = await db
      .select({ id: users.id, orgRole: users.orgRole, removedAt: users.removedAt })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.organisationId, gate.user.organisationId)))
      .limit(1);
    if (!person || person.removedAt) return Response.json({ error: "That person is not in this company." }, { status: 404 });

    if (body.action === "remove") {
      if (gate.user.orgRole !== "head") return Response.json({ error: "Only a head manager can remove someone." }, { status: 403 });
      if (isOfficeRole(person.orgRole) && (await otherOfficeCount(gate.user.organisationId, userId)) === 0) {
        return Response.json({ error: "The company needs at least one manager." }, { status: 409 });
      }
      await forgetUser(userId);
      await db.delete(sessions).where(eq(sessions.userId, userId));
      await db
        .update(workOrders)
        .set({ assignedTo: null, status: "unassigned", updatedAt: new Date() })
        .where(and(eq(workOrders.assignedTo, userId), inArray(workOrders.status, ["assigned", "in_progress"])));
      await db.update(users).set({ removedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, userId));
      return Response.json({ ok: true });
    }

    if (gate.user.orgRole !== "head") return Response.json({ error: "Only a head manager can change roles." }, { status: 403 });
    const orgRole = asRole(body.orgRole);
    if (!orgRole) return Response.json({ error: "Choose a role." }, { status: 400 });
    if (isOfficeRole(person.orgRole) && orgRole === "member" && (await otherOfficeCount(gate.user.organisationId, userId)) === 0) {
      return Response.json({ error: "The company needs at least one manager." }, { status: 409 });
    }
    await db.update(users).set({ orgRole, updatedAt: new Date() }).where(eq(users.id, userId));
    await forgetUser(userId);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: safeDbMessage(error) }, { status: 500 });
  }
}
