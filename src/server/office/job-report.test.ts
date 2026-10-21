import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import type { JobRecord } from "@/server/office/load";
import { renderJobReport } from "./job-report";

function job(status: JobRecord["status"], rejectionMessage: string | null): JobRecord {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    status,
    installer: "Amahle Dlamini",
    jobDate: "2026-10-21",
    responseCode: "MV100",
    submittedOn: new Date("2026-10-21T08:00:00.000Z"),
    companyName: "MeterVault",
    cardNumber: "4412",
    jobNumber: "18",
    houseNumber: "12",
    street: "Point Road",
    unitNumber: null,
    lotNumber: null,
    town: "Durban",
    installation: "meter_only",
    premise: "domestic",
    faults: ["rm"],
    otherReason: "Meter replacement",
    newMeterNumber: "CZZ863",
    meterSize: "15mm",
    meterClass: "Class D",
    meterType: "Ultrasonic",
    smartDeviceNumber: "12345678901",
    smartDeviceReading: 0,
    oldMeterNumber: "OLD123",
    oldMeterNotOnList: true,
    oldMeterListNote: "Painted over",
    oldMeterReading: 1204,
    connectionNumber: "9981",
    connectionNotOnList: false,
    connectionListNote: null,
    accountNumber: "A-22",
    rejectionMessage,
    rejectionCount: rejectionMessage ? 1 : 0,
    organisationName: "MeterVault",
    photos: [],
  };
}

test("a rejected job renders as a pdf", async () => {
  const bytes = await renderJobReport(job("rejected", "Wrong meter number"), "Manager", new Map());
  assert.equal(Buffer.from(bytes.subarray(0, 5)).toString(), "%PDF-");
  const doc = await PDFDocument.load(bytes);
  assert.equal(doc.getPageCount() >= 1, true);
  assert.equal(doc.getTitle(), "12 Point Road 21 October 2026");
});
