import { STORAGE } from "@/lib/brand";
import { fieldDb, notifyField, type DraftRecord } from "@/lib/field/db";
import { answersWithPhotos } from "@/lib/field/drafts";
import { readTechProfile, syncPaused } from "@/lib/field/profile";

const MAX_DELAY = 30_000;
let flushing: Promise<string | null> | null = null;
let flushAgain = false;

type FlushResult = string | null;

function delayFor(attempts: number) {
  return Math.min(MAX_DELAY, 1000 * 2 ** attempts);
}

async function refreshDraft(draftId: string, error?: string) {
  const pending = await fieldDb.outbox.where("draftId").equals(draftId).count();
  const patch: Partial<DraftRecord> = pending === 0 ? { syncState: "synced", lastError: undefined } : { syncState: error ? "failed" : "syncing", lastError: error };
  await fieldDb.drafts.update(draftId, patch);
  const photos = await fieldDb.photos.where("draftId").equals(draftId).toArray();
  for (const photo of photos) {
    const waiting = await fieldDb.outbox.where("idempotencyKey").equals(photo.idempotencyKey).count();
    await fieldDb.photos.update(photo.id, { syncState: waiting === 0 ? "synced" : error ? "failed" : "local" });
  }
  notifyField();
}

async function pushJob(draft: DraftRecord) {
  const photos = await fieldDb.photos.where("draftId").equals(draft.id).toArray();
  const answers = await answersWithPhotos(draft, photos);
  const response = await fetch("/api/sync/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      idempotencyKey: draft.idempotencyKey,
      formKey: draft.formKey,
      formVersion: draft.formVersion,
      answers,
      technician: readTechProfile(),
    }),
  });
  if (!response.ok) {
    const failure = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(failure?.error || `Job sync failed (${response.status})`);
  }
  const body = (await response.json()) as { id: string };
  await fieldDb.drafts.update(draft.id, { serverId: body.id });
}

async function pushPhoto(photoId: string) {
  const photo = await fieldDb.photos.get(photoId);
  if (!photo) return;
  if (!photo.blob || photo.blob.size === 0) throw new Error("Photo file is missing on this phone.");
  const draft = await fieldDb.drafts.get(photo.draftId);
  const body = new FormData();
  body.set("idempotencyKey", photo.idempotencyKey);
  body.set("jobKey", draft?.idempotencyKey ?? "");
  body.set("fieldId", photo.fieldId);
  body.set("capturedAt", photo.capturedAt);
  if (photo.latitude != null) body.set("latitude", String(photo.latitude));
  if (photo.longitude != null) body.set("longitude", String(photo.longitude));
  if (photo.accuracy != null) body.set("accuracy", String(photo.accuracy));
  if (photo.altitude != null) body.set("altitude", String(photo.altitude));
  const file =
    typeof File !== "undefined"
      ? new File([photo.blob], `${photo.id}.jpg`, { type: photo.blob.type || "image/jpeg" })
      : photo.blob;
  body.set("file", file, `${photo.id}.jpg`);
  const response = await fetch("/api/sync/photos", { method: "POST", body });
  if (!response.ok) {
    const failure = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(failure?.error || `Photo sync failed (${response.status})`);
  }
}

export async function enqueueSubmit(draftId: string) {
  const draft = await fieldDb.drafts.get(draftId);
  if (!draft) return;
  const photos = await fieldDb.photos.where("draftId").equals(draftId).toArray();
  await fieldDb.drafts.update(draftId, {
    lifecycle: "queued",
    syncState: typeof navigator !== "undefined" && navigator.onLine && !syncPaused() ? "syncing" : "local",
    updatedAt: Date.now(),
    lastError: undefined,
  });
  const already = await fieldDb.outbox.where("draftId").equals(draftId).toArray();
  const keys = new Set(already.map((item) => item.idempotencyKey));
  // Explicit submit should retry immediately, not wait out a prior backoff window.
  for (const item of already) {
    if (!item.id) continue;
    await fieldDb.outbox.update(item.id, { nextAttemptAt: 0 });
  }
  if (!keys.has(draft.idempotencyKey)) {
    await fieldDb.outbox.add({
      kind: "job",
      idempotencyKey: draft.idempotencyKey,
      draftId,
      attempts: 0,
      nextAttemptAt: 0,
    });
  }
  for (const photo of photos) {
    if (keys.has(photo.idempotencyKey)) continue;
    await fieldDb.outbox.add({
      kind: "photo",
      idempotencyKey: photo.idempotencyKey,
      draftId,
      photoId: photo.id,
      attempts: 0,
      nextAttemptAt: 0,
    });
  }
  notifyField();
  const failure = await flushOutbox();
  const registration = await navigator.serviceWorker?.ready.catch(() => undefined);
  const sync = registration && "sync" in registration ? (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync : undefined;
  await sync?.register(STORAGE.outbox).catch(() => undefined);
  return failure;
}

async function runFlush(): Promise<FlushResult> {
  if (typeof navigator !== "undefined" && (!navigator.onLine || syncPaused())) {
    const queued = await fieldDb.drafts.filter((draft) => draft.lifecycle === "queued" && draft.syncState === "syncing").toArray();
    for (const draft of queued) await fieldDb.drafts.update(draft.id, { syncState: "local" });
    if (queued.length > 0) notifyField();
    return null;
  }
  const now = Date.now();
  const items = await fieldDb.outbox.orderBy("id").toArray();
  let failure: string | null = null;
  const blockedDrafts = new Set<string>();
  for (const item of items) {
    if (!item.id || item.nextAttemptAt > now) continue;
    if (item.kind === "photo" && blockedDrafts.has(item.draftId)) continue;
    try {
      if (item.kind === "job") {
        const draft = await fieldDb.drafts.get(item.draftId);
        if (draft) await pushJob(draft);
      } else if (item.photoId) {
        await pushPhoto(item.photoId);
      }
      await fieldDb.outbox.delete(item.id);
      await refreshDraft(item.draftId);
    } catch (error) {
      const attempts = item.attempts + 1;
      const message = error instanceof Error ? error.message : "Sync failed";
      failure = message;
      if (item.kind === "job") blockedDrafts.add(item.draftId);
      await fieldDb.outbox.update(item.id, { attempts, nextAttemptAt: Date.now() + delayFor(attempts) });
      await refreshDraft(item.draftId, message);
    }
  }
  return failure;
}

export async function flushOutbox(): Promise<FlushResult> {
  if (flushing) {
    flushAgain = true;
    return flushing;
  }
  flushing = (async (): Promise<FlushResult> => {
    let result = await runFlush();
    while (flushAgain) {
      flushAgain = false;
      result = await runFlush();
    }
    return result;
  })();
  try {
    return await flushing;
  } finally {
    flushing = null;
  }
}

export async function globalSyncState() {
  const drafts = await fieldDb.drafts.toArray();
  const pending = await fieldDb.outbox.count();
  if (drafts.some((draft) => draft.syncState === "failed")) return { state: "failed" as const, pending };
  if (drafts.some((draft) => draft.syncState === "syncing") || pending > 0) return { state: "syncing" as const, pending };
  if (drafts.some((draft) => draft.syncState === "local" && draft.lifecycle === "queued")) return { state: "local" as const, pending };
  if (drafts.some((draft) => draft.syncState === "local")) return { state: "local" as const, pending };
  return { state: "synced" as const, pending };
}
