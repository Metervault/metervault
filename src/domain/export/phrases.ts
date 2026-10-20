import { blank, optionalText, text, type ExportCell } from "./cells";

/**
 * Legacy municipal wording, approved with the Phase 0 architecture.
 * The optional note stays on the job and is not written into the ID cell.
 * A migrated row can still replay its original cell from legacyRaw.
 */
export const LIST_PHRASES = {
  oldMeterSuffix: " was not on the list",
  connectionValue: "Not on the list",
} as const;

export type ListPhrases = {
  oldMeterSuffix: string;
  connectionValue: string;
};

export function exportOldMeterNumber(
  meterNumber: string | null | undefined,
  notOnList: boolean,
  phrases: ListPhrases = LIST_PHRASES,
): ExportCell {
  const cleaned = meterNumber?.trim() ?? "";
  if (!notOnList) return cleaned === "" ? blank() : text(cleaned);
  if (cleaned === "") return text(phrases.oldMeterSuffix.trim());
  return text(`${cleaned}${phrases.oldMeterSuffix}`);
}

export function exportConnectionNumber(
  connectionNumber: string | null | undefined,
  notOnList: boolean,
  phrases: ListPhrases = LIST_PHRASES,
): ExportCell {
  if (notOnList) return text(phrases.connectionValue);
  return optionalText(connectionNumber);
}
