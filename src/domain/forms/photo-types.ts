import { fieldsOf, METER_CHANGE_V1 } from "@/domain/forms/meter-change-v1";

/** Field id → stored photo_type for meter-change captures. */
export const FIELD_PHOTO_TYPES = {
  photoMeterNumber: "meter_number",
  photoNewMeter: "new_meter",
  photoOldMeter: "old_meter",
  photoWaterPoint: "water_point",
  photoCiu: "ciu_card",
  photoOther: "other",
} as const;

export type FieldPhotoType = (typeof FIELD_PHOTO_TYPES)[keyof typeof FIELD_PHOTO_TYPES];

export const REQUIRED_PHOTO_TYPES = fieldsOf(METER_CHANGE_V1)
  .filter((field) => field.type === "photo" && field.required)
  .map((field) => FIELD_PHOTO_TYPES[field.id as keyof typeof FIELD_PHOTO_TYPES])
  .filter(Boolean) as FieldPhotoType[];

export function missingRequiredPhotos(present: Iterable<string>) {
  const have = new Set(present);
  return REQUIRED_PHOTO_TYPES.filter((type) => !have.has(type));
}

export function photoCoverageLabel(missing: string[]) {
  if (missing.length === 0) return null;
  const labels: Record<string, string> = {
    meter_number: "meter number",
    new_meter: "new meter",
    old_meter: "old meter",
    water_point: "water point",
  };
  return missing.map((type) => labels[type] ?? type).join(", ");
}
