import { fieldDb, notifyField, type PhotoRecord } from "@/lib/field/db";
import { randomId } from "@/lib/field/id";

const MAX_EDGE = 1600;

async function shrink(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.72));
  return blob ?? file;
}

function readPosition(): Promise<Pick<PhotoRecord, "latitude" | "longitude" | "accuracy" | "altitude">> {
  const empty = { latitude: null, longitude: null, accuracy: null, altitude: null };
  if (!navigator.geolocation) return Promise.resolve(empty);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
        }),
      () => resolve(empty),
      { enableHighAccuracy: true, timeout: 4000, maximumAge: 15000 },
    );
  });
}

export async function addPhoto(draftId: string, fieldId: string, file: Blob, multiple: boolean) {
  const existing = await fieldDb.photos.where("draftId").equals(draftId).filter((photo) => photo.fieldId === fieldId).toArray();
  if (!multiple) {
    await fieldDb.photos.bulkDelete(existing.map((photo) => photo.id));
  }
  let blob = file;
  try {
    blob = await shrink(file);
  } catch {
    blob = file;
  }
  const photo: PhotoRecord = {
    id: randomId(),
    draftId,
    fieldId,
    sequence: existing.length,
    blob,
    capturedAt: new Date().toISOString(),
    idempotencyKey: randomId(),
    syncState: "local",
    latitude: null,
    longitude: null,
    accuracy: null,
    altitude: null,
  };
  await fieldDb.photos.add(photo);
  await fieldDb.drafts.update(draftId, { syncState: "local", updatedAt: Date.now() });
  notifyField();
  void readPosition().then(async (position) => {
    if (position.latitude == null) return;
    await fieldDb.photos.update(photo.id, position);
    notifyField();
  });
  return photo;
}

export async function removePhoto(id: string) {
  const photo = await fieldDb.photos.get(id);
  await fieldDb.photos.delete(id);
  if (photo) await fieldDb.drafts.update(photo.draftId, { syncState: "local", updatedAt: Date.now() });
  notifyField();
}
