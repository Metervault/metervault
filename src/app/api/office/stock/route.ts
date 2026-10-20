import { requireAdmin } from "@/server/auth/require-admin";
import { getDb, safeDbMessage } from "@/server/db/client";
import { stockItems } from "@/server/db/schema";

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const body = (await request.json()) as { kind?: unknown; serial?: unknown };
  const kind = body.kind === "smart_device" ? "smart_device" : body.kind === "meter" ? "meter" : null;
  const serial = typeof body.serial === "string" ? body.serial.trim() : "";
  if (!kind || !serial) return Response.json({ error: "Choose a kind and enter the serial." }, { status: 400 });

  try {
    await getDb().insert(stockItems).values({
      organisationId: gate.user.organisationId,
      kind,
      serial,
      status: "in_stock",
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
