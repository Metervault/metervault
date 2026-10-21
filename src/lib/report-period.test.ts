import assert from "node:assert/strict";
import test from "node:test";
import { dateInSpan, dayKey, isValidDay, monthRange, pdfTitle, readReportSpan, spanDuring, spanFilePart } from "./report-period";

test("a calendar day is rejected when it does not exist", () => {
  assert.equal(isValidDay("2026-02-29"), false);
  assert.equal(isValidDay("2024-02-29"), true);
  assert.equal(isValidDay("2026-10-21"), true);
});

test("month bounds stop at the first day of the next month", () => {
  assert.deepEqual(monthRange("2026-10"), { start: "2026-10-01", end: "2026-11-01" });
  assert.deepEqual(monthRange("2026-12"), { start: "2026-12-01", end: "2027-01-01" });
});

test("download links accept a day or a month and reject anything else", () => {
  assert.deepEqual(readReportSpan("http://localhost/api/office/export"), { span: null });
  assert.deepEqual(readReportSpan("http://localhost/api/office/export?period=day&date=2026-10-21"), { span: { mode: "day", date: "2026-10-21" } });
  assert.deepEqual(readReportSpan("http://localhost/api/office/export?period=month&date=2026-10"), { span: { mode: "month", month: "2026-10" } });
  assert.equal(readReportSpan("http://localhost/api/office/export?period=day&date=2026-02-31").error, "Choose a day or a month.");
  assert.equal(readReportSpan("http://localhost/api/office/export?period=month&date=2026-10-21").error, "Choose a day or a month.");
});

test("stock movements use the Johannesburg calendar day", () => {
  assert.equal(dayKey(new Date("2026-10-21T21:30:00.000Z")), "2026-10-21");
  assert.equal(dayKey(new Date("2026-10-21T22:30:00.000Z")), "2026-10-22");
  assert.equal(dateInSpan("2026-10-22", { mode: "day", date: "2026-10-22" }), true);
  assert.equal(dateInSpan("2026-10-22", { mode: "month", month: "2026-10" }), true);
  assert.equal(dateInSpan("2026-11-01", { mode: "month", month: "2026-10" }), false);
});

test("a pdf title keeps the name and date readable as a file", () => {
  assert.equal(pdfTitle("12 Point Road", "21 October 2026"), "12 Point Road 21 October 2026");
  assert.equal(pdfTitle("MeterVault stock report", "October 2026"), "MeterVault stock report October 2026");
  assert.equal(pdfTitle("12/Point: Road", "21 October 2026"), "12 Point Road 21 October 2026");
});

test("file names and sentences follow the chosen period", () => {
  assert.equal(spanFilePart({ mode: "day", date: "2026-10-21" }), "-2026-10-21");
  assert.equal(spanFilePart({ mode: "month", month: "2026-10" }), "-2026-10");
  assert.equal(spanDuring({ mode: "day", date: "2026-10-21" }), "on 21 October 2026");
  assert.equal(spanDuring({ mode: "month", month: "2026-10" }), "in October 2026");
});
