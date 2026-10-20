export type ExportCell =
  | { kind: "blank" }
  | { kind: "text"; value: string }
  | { kind: "number"; value: number }
  | { kind: "bool"; value: true }
  | { kind: "date"; value: Date }
  | { kind: "datetime"; value: Date };

export const blank = (): ExportCell => ({ kind: "blank" });
export const text = (value: string): ExportCell => ({ kind: "text", value });
export const num = (value: number): ExportCell => ({ kind: "number", value });
export const ticked = (): ExportCell => ({ kind: "bool", value: true });

/** A plain integer stays a number. Anything else, including a blank, stays text or blank. */
export function integerOrText(value: string | null | undefined): ExportCell {
  if (value == null) return blank();
  const trimmed = value.trim();
  if (trimmed === "") return blank();
  if (/^-?\d+$/.test(trimmed)) return num(Number(trimmed));
  return text(trimmed);
}

export function optionalText(value: string | null | undefined): ExportCell {
  if (value == null) return blank();
  const trimmed = value.trim();
  return trimmed === "" ? blank() : text(trimmed);
}

export function optionalNumber(value: number | null | undefined): ExportCell {
  if (value == null || Number.isNaN(value)) return blank();
  return num(value);
}

/** Excel date serial. Job date is midnight. Timestamps keep the wall-clock time. */
export function optionalDate(value: Date | null | undefined, withTime: boolean): ExportCell {
  if (value == null) return blank();
  return withTime ? { kind: "datetime", value } : { kind: "date", value };
}
