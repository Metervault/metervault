import { fieldsOf } from "./meter-change-v1";
import type { Answers, FormDefinition } from "./types";

const UPPERCASE_IDS = new Set(["newMeterNumber", "oldMeterNumber", "connectionNumber"]);

export function normaliseAnswers(form: FormDefinition, answers: Answers): Answers {
  const next: Answers = { ...answers };
  for (const field of fieldsOf(form)) {
    const value = next[field.id];
    if (typeof value !== "string") continue;
    const trimmed = value.trim().replace(/[ ]{2,}/g, " ");
    next[field.id] = UPPERCASE_IDS.has(field.id) ? trimmed.toUpperCase() : trimmed;
  }
  return next;
}
