import { METER_CHANGE_V1 } from "@/domain/forms/meter-change-v1";
import { normaliseAnswers } from "@/domain/forms/normalise";
import type { Answers } from "@/domain/forms/types";
import { ADDRESS_FIELDS, defaultAnswers } from "@/lib/field/contract";
import { fieldDb, notifyField, type DraftRecord, type PhotoRecord } from "@/lib/field/db";
import { randomId } from "@/lib/field/id";

export async function createDraft(seed?: Answers): Promise<DraftRecord> {
  const now = Date.now();
  const answers = defaultAnswers();
  if (seed) {
    for (const [key, value] of Object.entries(seed)) {
      if (value == null) continue;
      if (typeof value === "string" && value.trim() === "") continue;
      answers[key] = key === "oldMeterNumber" || key === "connectionNumber" ? String(value).toUpperCase() : value;
    }
  }
  const draft: DraftRecord = {
    id: randomId(),
    idempotencyKey: randomId(),
    formKey: "meter-change",
    formVersion: METER_CHANGE_V1.version,
    answers,
    lifecycle: "draft",
    syncState: "local",
    createdAt: now,
    updatedAt: now,
  };
  await fieldDb.drafts.add(draft);
  notifyField();
  return draft;
}

export async function saveAnswers(id: string, answers: Answers) {
  await fieldDb.drafts.update(id, {
    answers: normaliseAnswers(METER_CHANGE_V1, answers),
    syncState: "local",
    updatedAt: Date.now(),
  });
  notifyField();
}

export async function lastAddress(exceptId: string) {
  const drafts = await fieldDb.drafts.orderBy("updatedAt").reverse().toArray();
  const previous = drafts.find((draft) => draft.id !== exceptId && typeof draft.answers.street === "string" && draft.answers.street);
  if (!previous) return null;
  const copy: Answers = {};
  for (const field of ADDRESS_FIELDS) copy[field] = previous.answers[field];
  return copy;
}

export async function answersWithPhotos(draft: DraftRecord, photos: PhotoRecord[]): Promise<Answers> {
  const answers: Answers = { ...draft.answers };
  for (const section of METER_CHANGE_V1.sections) {
    for (const field of section.fields) {
      if (field.type !== "photo") continue;
      const mine = photos.filter((photo) => photo.fieldId === field.id).sort((a, b) => a.sequence - b.sequence);
      if (field.multiple) answers[field.id] = mine.map((photo) => photo.id);
      else if (mine[0]) answers[field.id] = mine[0].id;
      else delete answers[field.id];
    }
  }
  return answers;
}

export function jobTitle(draft: DraftRecord) {
  const unit = draft.answers.unitNumber ? `Unit ${draft.answers.unitNumber}` : "";
  const street = typeof draft.answers.street === "string" ? draft.answers.street : "New job";
  const town = typeof draft.answers.townId === "string" ? draft.answers.townId : "";
  return [unit, street, town].filter(Boolean).join(", ");
}
