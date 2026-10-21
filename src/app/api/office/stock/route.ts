import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/server/auth/require-admin";
import type { SessionUser } from "@/server/auth/session";
import { getDb, safeDbMessage } from "@/server/db/client";
import { recordStockMovement, type StockAction } from "@/server/office/stock-history";
import { stockItems, users } from "@/server/db/schema";

const STOCK_STATUS = ["in_stock", "issued", "installed", "returned"] as const;
type StockStatus = (typeof STOCK_STATUS)[number];

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const body = (await request.json()) as { id?: unknown; kind?: unknown; serial?: unknown; status?: unknown; issuedTo?: unknown };
  if (typeof body.id === "string" && body.id) return updateStock(gate.user, body);

  const kind = body.kind === "smart_device" ? "smart_device" : body.kind === "meter" ? "meter" : null;
  const serial = typeof body.serial === "string" ? body.serial.trim() : "";
  if (!kind || !serial) return Response.json({ error: "Choose a kind and enter the serial." }, { status: 400 });

  try {
    const db = getDb();
    const [created] = await db
      .insert(stockItems)
      .values({
        organisationId: gate.user.organisationId,
        kind,
        serial,
        status: "in_stock",
      })
      .returning({ id: stockItems.id, kind: stockItems.kind, serial: stockItems.serial });
    await recordStockMovement({
      organisationId: gate.user.organisationId,
      stockItemId: created.id,
      kind: created.kind,
      serial: created.serial,
      action: "received",
      actorId: gate.user.id,
    });
    return Response.json({ ok: true });
  } catch (error) {
    const message = safeDbMessage(error);
    if (message.toLowerCase().includes("unique") || message.toLowerCase().includes("duplicate")) {
      return Response.json({ error: "That serial is already in stock." }, { status: 409 });
    }
    return Response.json({ error: message }, { status: 500 });
  }
}

async function updateStock(user: SessionUser, body: { id?: unknown; status?: unknown; issuedTo?: unknown }) {
  const id = typeof body.id === "string" ? body.id : "";
  const status: StockStatus | null = STOCK_STATUS.includes(body.status as StockStatus) ? (body.status as StockStatus) : null;
  const issuedTo = typeof body.issuedTo === "string" ? body.issuedTo : "";
  if (!id || !status) return Response.json({ error: "Choose the stock item and its new status." }, { status: 400 });
  if (status === "issued" && !issuedTo) return Response.json({ error: "Choose who is taking this item." }, { status: 400 });

  try {
    const db = getDb();
    const [item] = await db
      .select({
        id: stockItems.id,
        status: stockItems.status,
        kind: stockItems.kind,
        serial: stockItems.serial,
        issuedTo: stockItems.issuedTo,
        jobId: stockItems.jobId,
      })
      .from(stockItems)
      .where(and(eq(stockItems.id, id), eq(stockItems.organisationId, user.organisationId)))
      .limit(1);
    if (!item) return Response.json({ error: "That item is not in this company." }, { status: 404 });
    if (status === "installed" && item.status === "installed") return Response.json({ error: "That item is already out of inventory." }, { status: 409 });
    if (issuedTo) {
      const [person] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, issuedTo), eq(users.organisationId, user.organisationId)))
        .limit(1);
      if (!person) return Response.json({ error: "That person is not in this company." }, { status: 400 });
    }
    const patch: { status: StockStatus; updatedAt: Date; issuedTo?: string | null; jobId?: null } = {
      status,
      updatedAt: new Date(),
    };
    if (status === "issued") {
      patch.issuedTo = issuedTo;
      patch.jobId = null;
    } else if (status !== "installed") {
      patch.issuedTo = null;
      patch.jobId = null;
    }
    await db.update(stockItems).set(patch).where(eq(stockItems.id, id));
    const action: StockAction = status === "installed" ? "installed" : status === "issued" ? "issued" : "returned";
    if (!(status === "in_stock" && item.status === "in_stock")) {
      await recordStockMovement({
        organisationId: user.organisationId,
        stockItemId: item.id,
        kind: item.kind,
        serial: item.serial,
        action,
        actorId: user.id,
        holderId: status === "issued" ? issuedTo : item.issuedTo,
        jobId: status === "installed" ? item.jobId : null,
      });
    }
    return Response.json({ ok: true, status });
  } catch (error) {
    return Response.json({ error: safeDbMessage(error) }, { status: 500 });
  }
}
