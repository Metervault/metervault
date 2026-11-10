import assert from "node:assert/strict";
import test from "node:test";
import { missingRequiredPhotos, photoCoverageLabel, REQUIRED_PHOTO_TYPES } from "./photo-types";

test("meter-change still requires the four core photos", () => {
  assert.deepEqual(REQUIRED_PHOTO_TYPES, ["meter_number", "new_meter", "old_meter", "water_point"]);
});

test("missingRequiredPhotos lists only absent required types", () => {
  assert.deepEqual(missingRequiredPhotos(["meter_number", "new_meter"]), ["old_meter", "water_point"]);
  assert.deepEqual(missingRequiredPhotos(["meter_number", "new_meter", "old_meter", "water_point", "other"]), []);
});

test("photoCoverageLabel stays readable for office and field errors", () => {
  assert.equal(photoCoverageLabel(["old_meter", "water_point"]), "old meter, water point");
  assert.equal(photoCoverageLabel([]), null);
});
