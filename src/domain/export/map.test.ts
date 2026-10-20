import assert from "node:assert/strict";
import test from "node:test";
import { METER_CHANGE_V1 } from "../forms/meter-change-v1";
import { normaliseAnswers } from "../forms/normalise";
import { blockingIssues, validateForm } from "../forms/validate";
import { EXPORT_HEADERS } from "./headers";
import type { ExportJob } from "./job";
import { INSTALLATION_EXPORT, PREMISE_EXPORT, toExportRow } from "./map";

function job(overrides: Partial<ExportJob> = {}): ExportJob {
  return {
    deployment: "MeterVault",
    enumerator: "KeeganM",
    exportedStatus: "Final",
    responseCode: "KeeganM-E442NZ",
    draftedOn: new Date("2026-04-29T07:02:23"),
    submittedOn: new Date("2026-04-29T07:08:40"),
    draftName: null,
    lastModifiedOn: new Date("2026-04-29T07:08:40"),
    lastModifiedBy: "KeeganM",
    approvalLevel: null,
    rejectionMessage: null,
    rejectionCount: 0,
    editCount: 0,
    ipAddress: "156.155.25.208",
    jobDate: new Date("2026-04-29T00:00:00"),
    installation: "meter_only",
    premise: "domestic",
    companyName: "MeterVault",
    cardNumber: null,
    jobNumber: null,
    houseNumber: "0",
    street: "154 MAHATMA GANDHI, FLAMINGO HEIGHTS, TONGAAT",
    unitNumber: "63",
    lotNumber: "3473",
    town: "Tongaat",
    faults: { rm: false, rp: false, rn: false, rc: false, ro: false, rv: false },
    other: "Meter replacement",
    newMeterNumber: "CZZ863",
    newMeterSize: "15mm",
    newMeterClass: "Class D",
    newMeterType: "Ultrasonic",
    smartDeviceNumber: "41258821168",
    smartDeviceReading: 0,
    oldMeterNumber: "CXV220",
    oldMeterNotOnList: false,
    oldMeterReading: 7920,
    connectionNumber: "W168706",
    connectionNotOnList: false,
    connectionAnsweredAt: new Date("2026-04-29T07:07:00"),
    accountNumber: null,
    photos: {
      meterNumber: { url: "https://files.example/meter.jpg", answeredAt: new Date("2026-04-29T07:07:00"), latitude: -29.94, longitude: 31.0, accuracy: 14.5, altitude: 20 },
      newMeter: { url: "https://files.example/new.jpg" },
      oldMeter: { url: "https://files.example/old.jpg" },
      waterPoint: { url: "https://files.example/water.jpg", answeredAt: new Date("2026-04-29T07:08:00"), latitude: -29.94, longitude: 31.0, accuracy: 14.5, altitude: 20 },
    },
    installerName: "Keegan",
    ...overrides,
  };
}

function cell(header: string, source: ExportJob = job()) {
  const index = EXPORT_HEADERS.indexOf(header as (typeof EXPORT_HEADERS)[number]);
  assert.notEqual(index, -1);
  return toExportRow(source)[index];
}

test("export has the 66 municipal headers in order", () => {
  assert.equal(EXPORT_HEADERS.length, 66);
  assert.equal(EXPORT_HEADERS[44], "PLEASE TAKE A PHOTO FO THE METER NUMBER (CODE:CZC)");
  assert.equal(EXPORT_HEADERS[22], "UNIT NUMBER");
  assert.equal(toExportRow(job()).length, 66);
});

test("enums export as the municipal strings", () => {
  assert.deepEqual(cell("Please select meter installation -meter only or meter with white and blue box"), { kind: "text", value: "meter only" });
  assert.equal(INSTALLATION_EXPORT.white_and_blue_box, "white and blue box");
  assert.equal(INSTALLATION_EXPORT.non_straight, "Non-straight");
  assert.deepEqual(cell("Please select Business or Domestic"), { kind: "text", value: "Domestic" });
  assert.equal(PREMISE_EXPORT.business, "Business");
  assert.deepEqual(cell("COMPANY NAME:"), { kind: "text", value: "MeterVault" });
});

test("a ticked fault is boolean true and an unticked fault is blank", () => {
  assert.deepEqual(cell("METER LEAK (RO)", job({ faults: { rm: false, rp: false, rn: false, rc: false, ro: true, rv: false } })), { kind: "bool", value: true });
  assert.deepEqual(cell("METER STOPPED (RM)"), { kind: "blank" });
});

test("list flags use the legacy wording and do not export the note", () => {
  assert.deepEqual(cell("OLD METER NUMBER", job({ oldMeterNotOnList: true })), { kind: "text", value: "CXV220 was not on the list" });
  assert.deepEqual(cell("CONNECTION NUMBER (2)", job({ connectionNotOnList: true, connectionNumber: "W168706" })), { kind: "text", value: "Not on the list" });
  assert.deepEqual(cell("CONNECTION NUMBER (1)"), { kind: "blank" });
});

test("ids keep their sample types", () => {
  assert.deepEqual(cell("HOUSE NUMBER:"), { kind: "number", value: 0 });
  assert.deepEqual(cell("UNIT NUMBER"), { kind: "number", value: 63 });
  assert.deepEqual(cell("HOUSE NUMBER:", job({ houseNumber: "12A" })), { kind: "text", value: "12A" });
  assert.deepEqual(cell("SMART DEVICE NUMBER"), { kind: "number", value: 41258821168 });
  assert.deepEqual(cell("NEW METER NUMBER"), { kind: "text", value: "CZZ863" });
  assert.deepEqual(cell("CARD NUMBER:"), { kind: "blank" });
  assert.deepEqual(cell("Status"), { kind: "text", value: "Final" });
  assert.deepEqual(cell("Approval Level"), { kind: "blank" });
  assert.deepEqual(cell("DATE:"), { kind: "date", value: new Date("2026-04-29T00:00:00") });
  assert.equal(cell("Drafted On").kind, "datetime");
});

test("submit blocks missing evidence and warns on a swapped reading", () => {
  const missing = validateForm(METER_CHANGE_V1, { companyName: "MeterVault" }, "submit");
  assert.ok(blockingIssues(missing).some((issue) => issue.fieldId === "street"));
  assert.ok(blockingIssues(missing).some((issue) => issue.fieldId === "photoMeterNumber"));
  assert.ok(!blockingIssues(missing).some((issue) => issue.fieldId === "photoCiu"));
  const waived = validateForm(METER_CHANGE_V1, { connectionNotOnList: true }, "submit");
  assert.ok(!waived.some((issue) => issue.fieldId === "connectionNumber" && issue.severity === "block"));
  const swapped = validateForm(METER_CHANGE_V1, { smartDeviceReading: 41258821168 }, "draft");
  assert.equal(swapped[0]?.severity, "warn");
  assert.match(swapped[0]?.message ?? "", /device number/);
});

test("normalise trims and uppercases meter ids", () => {
  const answers = normaliseAnswers(METER_CHANGE_V1, { newMeterNumber: " czz863 ", street: "  Bohmer   Road " });
  assert.equal(answers.newMeterNumber, "CZZ863");
  assert.equal(answers.street, "Bohmer Road");
});
