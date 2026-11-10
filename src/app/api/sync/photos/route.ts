import { getSessionUser } from "@/server/auth/session";
import { safeDbMessage } from "@/server/db/client";
import { acceptSyncedPhoto } from "@/server/sync/persist";

function optionalNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

type UploadPart = FormDataEntryValue & { arrayBuffer(): Promise<ArrayBuffer> };

function isUpload(value: FormDataEntryValue | null): value is UploadPart {
  // Netlify/server runtimes can parse multipart parts from another realm, so `instanceof File` is unreliable.
  return !!value && typeof value === "object" && typeof (value as UploadPart).arrayBuffer === "function";
}

async function readUpload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as {
      idempotencyKey?: unknown;
      jobKey?: unknown;
      fieldId?: unknown;
      contentBase64?: unknown;
      capturedAt?: unknown;
      latitude?: unknown;
      longitude?: unknown;
      accuracy?: unknown;
      altitude?: unknown;
    };
    if (typeof body.idempotencyKey !== "string" || typeof body.jobKey !== "string" || typeof body.fieldId !== "string" || typeof body.contentBase64 !== "string") {
      return { error: "Missing photo." as const, status: 400 as const };
    }
    const bytes = Buffer.from(body.contentBase64, "base64");
    if (bytes.byteLength === 0) return { error: "Photo file was empty." as const, status: 400 as const };
    return {
      idempotencyKey: body.idempotencyKey,
      jobKey: body.jobKey,
      fieldId: body.fieldId,
      bytes,
      capturedAt: typeof body.capturedAt === "string" ? body.capturedAt : null,
      latitude: optionalNumber(body.latitude),
      longitude: optionalNumber(body.longitude),
      accuracy: optionalNumber(body.accuracy),
      altitude: optionalNumber(body.altitude),
    };
  }

  const form = await request.formData();
  const idempotencyKey = form.get("idempotencyKey");
  const jobKey = form.get("jobKey");
  const fieldId = form.get("fieldId");
  const file = form.get("file");
  if (typeof idempotencyKey !== "string" || typeof jobKey !== "string" || typeof fieldId !== "string" || !isUpload(file)) {
    return { error: "Missing photo." as const, status: 400 as const };
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.byteLength === 0) return { error: "Photo file was empty." as const, status: 400 as const };
  return {
    idempotencyKey,
    jobKey,
    fieldId,
    bytes,
    capturedAt: typeof form.get("capturedAt") === "string" ? String(form.get("capturedAt")) : null,
    latitude: optionalNumber(form.get("latitude")),
    longitude: optionalNumber(form.get("longitude")),
    accuracy: optionalNumber(form.get("accuracy")),
    altitude: optionalNumber(form.get("altitude")),
  };
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  let upload: Awaited<ReturnType<typeof readUpload>>;
  try {
    upload = await readUpload(request);
  } catch (error) {
    console.error("Photo sync parse failed:", error);
    return Response.json({ error: "Could not read photo upload." }, { status: 400 });
  }
  if ("error" in upload) return Response.json({ error: upload.error }, { status: upload.status });
  try {
    const saved = await acceptSyncedPhoto(upload);
    if ("error" in saved) {
      return Response.json({ error: saved.error === "job-missing" ? "Job is not in the database yet." : saved.error }, { status: saved.error === "job-missing" ? 409 : 400 });
    }
    return Response.json(saved);
  } catch (error) {
    console.error("Photo sync save failed:", safeDbMessage(error));
    return Response.json({ error: safeDbMessage(error) }, { status: 500 });
  }
}
