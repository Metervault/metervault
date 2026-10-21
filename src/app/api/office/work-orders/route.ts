import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/server/auth/require-admin";
import { getDb, safeDbMessage } from "@/server/db/client";
import { users, workOrders } from "@/server/db/schema";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

const ACTIONS = ["assign", "complete", "exception", "reopen"] as const;
type WorkAction = (typeof ACTIONS)[number];

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const body = (await request.json()) as Record<string, unknown>;
  if (typeof body.id === "string" && body.id) return updateWorkOrder(gate.user.organisationId, body);

  const street = text(body.street);
  const houseNumber = text(body.houseNumber);
  const town = text(body.town);
  const oldMeterNumber = text(body.oldMeterNumber);
  const connectionNumber = text(body.connectionNumber);
  const assignedTo = text(body.assignedTo);
  if (!street) return Response.json({ error: "Enter the street." }, { status: 400 });

  try {
    const db = getDb();
    if (assignedTo) {
      const [person] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, assignedTo), eq(users.organisationId, gate.user.organisationId)))
        .limit(1);
      if (!person) return Response.json({ error: "That person is not in this company." }, { status: 400 });
    }
    await db.insert(workOrders).values({
      organisationId: gate.user.organisationId,
      street,
      houseNumber: houseNumber || null,
      townName: town || null,
      oldMeterNumber: oldMeterNumber || null,
      connectionNumber: connectionNumber || null,
      assignedTo: assignedTo || null,
      status: assignedTo ? "assigned" : "unassigned",
    });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: safeDbMessage(error) }, { status: 500 });
  }
}

async function updateWorkOrder(organisationId: string, body: Record<string, unknown>) {
  const id = text(body.id);
  const action: WorkAction | null = ACTIONS.includes(body.action as WorkAction) ? (body.action as WorkAction) : null;
  const assignedTo = text(body.assignedTo);
  if (!id || !action) return Response.json({ error: "Choose the work order and what to do with it." }, { status: 400 });

  try {
    const db = getDb();
    const [order] = await db
      .select({ id: workOrders.id, status: workOrders.status, assignedTo: workOrders.assignedTo })
      .from(workOrders)
      .where(and(eq(workOrders.id, id), eq(workOrders.organisationId, organisationId)))
      .limit(1);
    if (!order) return Response.json({ error: "That work order was not found." }, { status: 404 });
    if (assignedTo) {
      const [person] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, assignedTo), eq(users.organisationId, organisationId)))
        .limit(1);
      if (!person) return Response.json({ error: "That person is not in this company." }, { status: 400 });
    }
    if (action === "assign" && (order.status === "completed" || order.status === "exception")) {
      return Response.json({ error: "Reopen this work order before assigning it." }, { status: 409 });
    }

    const nextAssignee = action === "assign" ? assignedTo || null : order.assignedTo;
    const status =
      action === "complete"
        ? "completed"
        : action === "exception"
          ? "exception"
          : action === "reopen"
            ? order.assignedTo
              ? "assigned"
              : "unassigned"
            : order.status === "in_progress"
              ? "in_progress"
              : nextAssignee
                ? "assigned"
                : "unassigned";

    await db
      .update(workOrders)
      .set({ status, assignedTo: action === "assign" ? nextAssignee : order.assignedTo, updatedAt: new Date() })
      .where(eq(workOrders.id, id));
    return Response.json({ ok: true, status });
  } catch (error) {
    return Response.json({ error: safeDbMessage(error) }, { status: 500 });
  }
}
