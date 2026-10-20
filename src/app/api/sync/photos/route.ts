import { getSessionUser } from "@/server/auth/session";
import { safeDbMessage } from "@/server/db/client";
import { acceptSyncedPhoto } from "@/server/sync/persist";

function optionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const form = await request.formData();
  const idempotencyKey = form.get("idempotencyKey");
  const jobKey = form.get("jobKey");
  const fieldId = form.get("fieldId");
  const file = form.get("file");
  if (typeof idempotencyKey !== "string" || typeof jobKey !== "string" || typeof fieldId !== "string" || !(file instanceof File)) {
    return Response.json({ error: "Missing photo." }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  try {
    const saved = await acceptSyncedPhoto({
      idempotencyKey,
      jobKey,
      fieldId,
      bytes,
      capturedAt: typeof form.get("capturedAt") === "string" ? String(form.get("capturedAt")) : null,
      latitude: optionalNumber(form.get("latitude")),
      longitude: optionalNumber(form.get("longitude")),
      accuracy: optionalNumber(form.get("accuracy")),
      altitude: optionalNumber(form.get("altitude")),
    });
    if ("error" in saved) {
      return Response.json({ error: saved.error === "job-missing" ? "Job is not in the database yet." : saved.error }, { status: saved.error === "job-missing" ? 409 : 400 });
    }
    return Response.json(saved);
  } catch (error) {
    return Response.json({ error: safeDbMessage(error) }, { status: 500 });
  }
}
