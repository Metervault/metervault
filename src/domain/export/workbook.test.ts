import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { EXPORT_HEADERS, MAP_EXPORT_HEADERS } from "./headers";
import type { ExportJob } from "./job";
import { buildExportWorkbook } from "./workbook";

function job(overrides: Partial<ExportJob> = {}): ExportJob {
  return {
    deployment: "Nimba",
    enumerator: "amandan",
    exportedStatus: "Final",
    responseCode: "amandan-DMHYTS",
    draftedOn: new Date("2025-11-03T12:52:40+02:00"),
    submittedOn: new Date("2025-11-03T13:00:51+02:00"),
    draftName: null,
    lastModifiedOn: new Date("2025-11-03T13:00:52+02:00"),
    lastModifiedBy: "amandan",
    approvalLevel: null,
    rejectionMessage: null,
    rejectionCount: 0,
    editCount: 0,
    ipAddress: "156.155.22.113",
    jobDate: new Date(2025, 10, 1),
    installation: null,
    premise: null,
    companyName: "Nimba",
    cardNumber: null,
    jobNumber: null,
    houseNumber: "27",
    street: "Bohmer Road",
    unitNumber: "317",
    lotNumber: null,
    town: "The wolds",
    faults: { rm: false, rp: false, rn: false, rc: false, ro: false, rv: false },
    other: "Meter replacement",
    newMeterNumber: "CZB988",
    newMeterSize: "15mm",
    newMeterClass: "D",
    newMeterType: "Ultrasonic",
    smartDeviceNumber: "41258589495",
    smartDeviceReading: 0,
    oldMeterNumber: "CMR159",
    oldMeterNotOnList: false,
    oldMeterReading: 672,
    connectionNumber: "WO31919",
    connectionNotOnList: false,
    connectionAnsweredAt: new Date("2025-11-03T12:57:06+02:00"),
    accountNumber: null,
    photos: {
      meterNumber: {
        url: "https://files.example/meter.jpg",
        answeredAt: new Date("2025-11-03T13:00:17+02:00"),
        latitude: -29.9403962,
        longitude: 31.0013425,
        accuracy: 4.5,
        altitude: 124.9,
      },
      newMeter: { url: "https://files.example/new.jpg" },
      oldMeter: { url: "https://files.example/old.jpg" },
      waterPoint: {
        url: "https://files.example/water.jpg",
        answeredAt: new Date("2025-11-03T13:00:39+02:00"),
        latitude: -29.9403962,
        longitude: 31.0013425,
        accuracy: 4.5,
        altitude: 124.9,
      },
    },
    installerName: "Rodrick",
    ...overrides,
  };
}

test("workbook writes municipal headers plus OpenStreetMap columns", async () => {
  const buffer = await buildExportWorkbook([job()]);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.getWorksheet("Main");
  assert.ok(sheet);
  const headers = (sheet.getRow(1).values as Array<string | null | undefined>).slice(1);
  assert.deepEqual(headers.slice(0, EXPORT_HEADERS.length), [...EXPORT_HEADERS]);
  assert.deepEqual(headers.slice(EXPORT_HEADERS.length), [...MAP_EXPORT_HEADERS]);
  assert.equal(sheet.getCell(2, 1).value, "Nimba");
  assert.equal(sheet.getCell(2, 33).value, "CZB988");
  assert.equal(sheet.getCell(2, 45).value, "https://files.example/meter.jpg");
  assert.equal(sheet.getCell(2, 47).value, -29.9403962);
  assert.equal(sheet.getCell(2, 48).value, 31.0013425);
  assert.match(String(sheet.getCell(2, 67).value), /openstreetmap\.org/);
  assert.match(String(sheet.getCell(2, 68).value), /openstreetmap\.org/);
  assert.equal(sheet.getCell(2, 69).value, null);
});
