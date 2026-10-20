import Dexie, { type EntityTable } from "dexie";
import { STORAGE } from "@/lib/brand";

export type SyncState = "local" | "syncing" | "synced" | "failed";

export type DraftRecord = {
  id: string;
  idempotencyKey: string;
  formKey: "meter-change";
  formVersion: number;
  answers: Record<string, unknown>;
  lifecycle: "draft" | "queued";
  syncState: SyncState;
  serverId?: string;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
};

export type PhotoRecord = {
  id: string;
  draftId: string;
  fieldId: string;
  sequence: number;
  blob: Blob;
  capturedAt: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  altitude: number | null;
  idempotencyKey: string;
  syncState: SyncState;
};

export type OutboxRecord = {
  id?: number;
  kind: "job" | "photo";
  idempotencyKey: string;
  draftId: string;
  photoId?: string;
  attempts: number;
  nextAttemptAt: number;
};

class FieldDb extends Dexie {
  drafts!: EntityTable<DraftRecord, "id">;
  photos!: EntityTable<PhotoRecord, "id">;
  outbox!: EntityTable<OutboxRecord, "id">;

  constructor() {
    super(STORAGE.fieldDb);
    this.version(1).stores({
      drafts: "id, updatedAt, syncState, idempotencyKey",
      photos: "id, draftId, fieldId, idempotencyKey",
      outbox: "++id, idempotencyKey, draftId, nextAttemptAt",
    });
  }
}

export const fieldDb = new FieldDb();

const listeners = new Set<() => void>();

export function subscribeField(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyField() {
  listeners.forEach((listener) => listener());
}
