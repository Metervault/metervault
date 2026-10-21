import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { stockItems, stockMovements } from "@/server/db/schema";

export type StockAction = "received" | "issued" | "installed" | "returned";

const EXPECTED: Record<string, StockAction[]> = {
  in_stock: ["received", "returned"],
  issued: ["issued"],
  installed: ["installed"],
  returned: ["returned"],
};

export async function recordStockMovement(input: {
  organisationId: string;
  stockItemId: string;
  kind: "meter" | "smart_device";
  serial: string;
  action: StockAction;
  actorId?: string | null;
  holderId?: string | null;
  jobId?: string | null;
  at?: Date;
}) {
  await getDb().insert(stockMovements).values({
    organisationId: input.organisationId,
    stockItemId: input.stockItemId,
    kind: input.kind,
    serial: input.serial,
    action: input.action,
    actorId: input.actorId ?? null,
    holderId: input.holderId ?? null,
    jobId: input.jobId ?? null,
    at: input.at ?? new Date(),
  });
}

/** Fill in a received line, and the current state, for items that have no movement record yet. */
export async function syncStockHistory(organisationId: string) {
  const db = getDb();
  const items = await db.select().from(stockItems).where(eq(stockItems.organisationId, organisationId));
  if (items.length === 0) return;
  const history = await db
    .select({ stockItemId: stockMovements.stockItemId, action: stockMovements.action, at: stockMovements.at })
    .from(stockMovements)
    .where(eq(stockMovements.organisationId, organisationId));
  const byItem = new Map<string, { action: string; at: Date }[]>();
  for (const movement of history) {
    const list = byItem.get(movement.stockItemId) ?? [];
    list.push(movement);
    byItem.set(movement.stockItemId, list);
  }

  const inserts: {
    organisationId: string;
    stockItemId: string;
    kind: "meter" | "smart_device";
    serial: string;
    action: StockAction;
    holderId: string | null;
    jobId: string | null;
    at: Date;
  }[] = [];

  for (const item of items) {
    const events = (byItem.get(item.id) ?? []).sort((a, b) => a.at.getTime() - b.at.getTime());
    const allowed = EXPECTED[item.status] ?? ["received"];
    const latest = events[events.length - 1];
    const base = {
      organisationId,
      stockItemId: item.id,
      kind: item.kind,
      serial: item.serial,
    };
    if (!latest) {
      inserts.push({ ...base, action: "received", holderId: null, jobId: null, at: item.createdAt });
      if (!allowed.includes("received")) {
        inserts.push({
          ...base,
          action: allowed[0],
          holderId: item.issuedTo,
          jobId: allowed[0] === "installed" ? item.jobId : null,
          at: item.updatedAt,
        });
      }
      continue;
    }
    if (!allowed.includes(latest.action as StockAction)) {
      inserts.push({
        ...base,
        action: allowed[0],
        holderId: item.issuedTo,
        jobId: allowed[0] === "installed" ? item.jobId : null,
        at: new Date(),
      });
    }
  }

  if (inserts.length > 0) await db.insert(stockMovements).values(inserts);
}
