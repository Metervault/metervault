import { and, eq } from "drizzle-orm";
import { getSessionUser } from "@/server/auth/session";
import { getDb, safeDbMessage } from "@/server/db/client";
import { workOrders } from "@/server/db/schema";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const body = (await request.json()) as { id?: unknown };
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return Response.json({ error: "Choose a work order." }, { status: 400 });

  try {
    const db = getDb();
    const [order] = await db
      .select({ id: workOrders.id, status: workOrders.status, assignedTo: workOrders.assignedTo })
      .from(workOrders)
      .where(and(eq(workOrders.id, id), eq(workOrders.organisationId, user.organisationId)))
      .limit(1);
    if (!order) return Response.json({ error: "That work order was not found." }, { status: 404 });
    if (order.assignedTo && order.assignedTo !== user.id) return Response.json({ error: "This work is assigned to someone else." }, { status: 403 });
    if (order.status === "completed" || order.status === "exception") return Response.json({ error: "This work is already closed." }, { status: 409 });
    await db
      .update(workOrders)
      .set({ status: "in_progress", assignedTo: order.assignedTo ?? user.id, updatedAt: new Date() })
      .where(eq(workOrders.id, id));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: safeDbMessage(error) }, { status: 500 });
  }
}
