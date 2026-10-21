import { eq, inArray, sql } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { dateInSpan, dayKey, pdfTitle, spanDuring, spanLabel, todayInZone, type ReportSpan } from "@/lib/report-period";
import { getDb } from "@/server/db/client";
import { installers, jobs, organisations, stockItems, stockMovements, towns, users } from "@/server/db/schema";
import { syncStockHistory, type StockAction } from "@/server/office/stock-history";

const ZONE = "Africa/Johannesburg";
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;
const BOTTOM = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;
const TEAL = rgb(0.039, 0.42, 0.455);
const BRASS = rgb(0.541, 0.369, 0.086);
const INK = rgb(0.1, 0.14, 0.15);
const MUTED = rgb(0.35, 0.4, 0.42);
const LINE = rgb(0.82, 0.86, 0.86);
const WHITE = rgb(1, 1, 1);
const CANVAS = rgb(0.953, 0.969, 0.969);
const ROW = 16;

type JobPlace = { houseNumber: string | null; street: string | null; town: string | null; jobDate: string | null };

export type StockReportLine = {
  serial: string;
  kind: string;
  since: Date;
  days: number;
  holder: string;
  place: string;
};

export type StockMovementLine = {
  at: Date;
  serial: string;
  kind: string;
  what: string;
  detail: string;
};

export type StockReportData = {
  organisationName: string;
  preparedBy: string;
  generatedAt: Date;
  periodLabel: string;
  periodDuring: string;
  brief: string;
  inStore: StockReportLine[];
  withTeam: StockReportLine[];
  goneOut: StockReportLine[];
  movements: StockMovementLine[];
  cameIn: StockMovementLine[];
  issued: StockMovementLine[];
  wentOut: StockMovementLine[];
  cameBack: StockMovementLine[];
  tiles: { label: string; value: string }[];
};

function formatWhen(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function formatCompact(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function formatDay(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function monthKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit" }).format(date);
}

function daysSince(date: Date, now: Date) {
  return Math.max(0, Math.round((now.getTime() - date.getTime()) / 86_400_000));
}

function formatStoredDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${match[3]} ${months[Number(match[2]) - 1] ?? match[2]} ${match[1]}`;
}

function kindLabel(kind: string) {
  return kind === "smart_device" ? "Smart device" : "Meter";
}

function placeOf(job: JobPlace | undefined) {
  if (!job) return "";
  const street = [job.houseNumber, job.street].filter(Boolean).join(" ");
  return [street, job.town].filter(Boolean).join(", ");
}

function latestAt(events: { action: string; at: Date }[], actions: string[], fallback: Date) {
  const match = events.filter((event) => actions.includes(event.action)).sort((a, b) => b.at.getTime() - a.at.getTime())[0];
  return match?.at ?? fallback;
}

export async function loadStockReport(organisationId: string, preparedBy: string, span: ReportSpan | null = null): Promise<StockReportData> {
  await syncStockHistory(organisationId);
  const db = getDb();
  const now = new Date();
  const [organisation] = await db.select({ name: organisations.name }).from(organisations).where(eq(organisations.id, organisationId)).limit(1);
  const items = await db.select().from(stockItems).where(eq(stockItems.organisationId, organisationId));
  const movements = await db.select().from(stockMovements).where(eq(stockMovements.organisationId, organisationId));
  const people = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.organisationId, organisationId));
  const names = new Map(people.map((person) => [person.id, person.name]));
  const jobIds = [...new Set([...items.map((item) => item.jobId), ...movements.map((movement) => movement.jobId)].filter((id): id is string => Boolean(id)))];
  const jobRows = jobIds.length
    ? await db
        .select({
          id: jobs.id,
          houseNumber: jobs.houseNumber,
          street: jobs.street,
          jobDate: jobs.jobDate,
          town: sql<string | null>`coalesce(${towns.name}, ${jobs.answers}->>'townId')`,
          installer: installers.displayName,
          enumerator: users.name,
        })
        .from(jobs)
        .leftJoin(towns, eq(jobs.townId, towns.id))
        .leftJoin(installers, eq(jobs.installerId, installers.id))
        .leftJoin(users, eq(jobs.enumeratorId, users.id))
        .where(inArray(jobs.id, jobIds))
    : [];
  const jobById = new Map(jobRows.map((job) => [job.id, job]));
  const eventsByItem = new Map<string, { action: string; at: Date }[]>();
  for (const movement of movements) {
    const list = eventsByItem.get(movement.stockItemId) ?? [];
    list.push({ action: movement.action, at: movement.at });
    eventsByItem.set(movement.stockItemId, list);
  }

  function line(item: (typeof items)[number], since: Date): StockReportLine {
    const job = item.jobId ? jobById.get(item.jobId) : undefined;
    return {
      serial: item.serial,
      kind: kindLabel(item.kind),
      since,
      days: daysSince(since, now),
      holder: item.issuedTo ? names.get(item.issuedTo) ?? "Unknown" : "",
      place: placeOf(job),
    };
  }

  const inStore = items
    .filter((item) => item.status === "in_stock" || item.status === "returned")
    .map((item) => line(item, latestAt(eventsByItem.get(item.id) ?? [], ["returned", "received"], item.createdAt)))
    .sort((a, b) => b.days - a.days);
  const withTeam = items
    .filter((item) => item.status === "issued")
    .map((item) => line(item, latestAt(eventsByItem.get(item.id) ?? [], ["issued"], item.updatedAt)))
    .sort((a, b) => b.days - a.days);
  const goneOut = items
    .filter((item) => item.status === "installed")
    .map((item) => line(item, latestAt(eventsByItem.get(item.id) ?? [], ["installed"], item.updatedAt)))
    .sort((a, b) => b.since.getTime() - a.since.getTime());

  const thisMonth = monthKey(now);
  const monthCount = (action: StockAction) => movements.filter((movement) => movement.action === action && monthKey(movement.at) === thisMonth).length;
  const meters = (status: string[]) => items.filter((item) => item.kind === "meter" && status.includes(item.status)).length;
  const devices = (status: string[]) => items.filter((item) => item.kind === "smart_device" && status.includes(item.status)).length;
  const longIssued = withTeam.filter((item) => item.days >= 7).length;
  const oldest = inStore[0]?.days ?? null;

  function movementLine(movement: (typeof movements)[number], annotateIssued: boolean): StockMovementLine {
    const job = movement.jobId ? jobById.get(movement.jobId) : undefined;
    const holder = movement.holderId ? names.get(movement.holderId) : "";
    const where = placeOf(job);
    const what = movement.action === "received" ? "Came in" : movement.action === "issued" ? "Issued" : movement.action === "installed" ? "Went out" : "Came back";
    let detail =
      movement.action === "received"
        ? "Added to stock"
        : movement.action === "issued"
          ? holder
            ? `With ${holder}`
            : "Issued to the team"
          : movement.action === "installed"
            ? [where ? `Installed at ${where}` : "Installed, no capture linked", job?.jobDate ? formatStoredDate(job.jobDate) : "", holder ? `was with ${holder}` : ""]
                .filter(Boolean)
                .join(" · ")
            : "Returned to the store";
    if (annotateIssued && movement.action === "issued") {
      const current = items.find((item) => item.id === movement.stockItemId)?.status;
      const now = current === "issued" ? "still with them" : current === "installed" ? "since installed" : current === "in_stock" || current === "returned" ? "back in the store" : "";
      if (now) detail = `${detail} · ${now}`;
    }
    return { at: movement.at, serial: movement.serial, kind: kindLabel(movement.kind), what, detail };
  }

  const movementLines = movements.map((movement) => movementLine(movement, false)).sort((a, b) => b.at.getTime() - a.at.getTime());

  if (span) {
    const chosen = movements.filter((movement) => dateInSpan(dayKey(movement.at), span));
    const lines = chosen.map((movement) => movementLine(movement, true)).sort((a, b) => b.at.getTime() - a.at.getTime());
    const cameIn = lines.filter((line) => line.what === "Came in");
    const issued = lines.filter((line) => line.what === "Issued");
    const wentOut = lines.filter((line) => line.what === "Went out");
    const cameBack = lines.filter((line) => line.what === "Came back");
    const stillOut = new Set(chosen.filter((movement) => movement.action === "issued" && items.find((item) => item.id === movement.stockItemId)?.status === "issued").map((movement) => movement.stockItemId)).size;
    const during = spanDuring(span);
    const brief = lines.length
      ? [
          `${spanLabel(span)}. ${cameIn.length} came in, ${issued.length} ${issued.length === 1 ? "was" : "were"} issued, ${wentOut.length} went out, and ${cameBack.length} came back.`,
          stillOut ? `${stillOut} issued ${stillOut === 1 ? "item is" : "items are"} still with the team.` : "",
        ]
          .filter(Boolean)
          .join(" ")
      : `No stock moved ${during}.`;
    return {
      organisationName: organisation?.name ?? "MeterVault",
      preparedBy,
      generatedAt: now,
      periodLabel: spanLabel(span),
      periodDuring: during,
      brief,
      inStore: [],
      withTeam: [],
      goneOut: [],
      movements: lines,
      cameIn,
      issued,
      wentOut,
      cameBack,
      tiles: [
        { label: "Came in", value: String(cameIn.length) },
        { label: "Issued", value: String(issued.length) },
        { label: "Went out", value: String(wentOut.length) },
        { label: "Came back", value: String(cameBack.length) },
      ],
    };
  }

  const brief = items.length
    ? [
        `${items.length} ${items.length === 1 ? "item is" : "items are"} on the stock record.`,
        `${inStore.length} ${inStore.length === 1 ? "is" : "are"} in the store (${meters(["in_stock", "returned"])} ${meters(["in_stock", "returned"]) === 1 ? "meter" : "meters"}, ${devices(["in_stock", "returned"])} ${devices(["in_stock", "returned"]) === 1 ? "smart device" : "smart devices"}).`,
        `${withTeam.length} ${withTeam.length === 1 ? "is" : "are"} with the team${longIssued ? `, ${longIssued} for 7 days or more` : ""}.`,
        `${goneOut.length} ${goneOut.length === 1 ? "has" : "have"} gone out.`,
        oldest != null ? `The longest-held item in the store has been there ${oldest} ${oldest === 1 ? "day" : "days"}.` : "",
        `This month ${monthCount("received")} came in, ${monthCount("installed")} went out, and ${monthCount("returned")} came back.`,
      ]
        .filter(Boolean)
        .join(" ")
    : "Nothing has been received into stock yet.";

  return {
    organisationName: organisation?.name ?? "MeterVault",
    preparedBy,
    generatedAt: now,
    periodLabel: "",
    periodDuring: "",
    brief,
    inStore,
    withTeam,
    goneOut,
    movements: movementLines,
    cameIn: [],
    issued: [],
    wentOut: [],
    cameBack: [],
    tiles: [
      { label: "In the store", value: String(inStore.length) },
      { label: "With the team", value: String(withTeam.length) },
      { label: "Gone out", value: String(goneOut.length) },
      { label: "Came in this month", value: String(monthCount("received")) },
    ],
  };
}

function latin(value: string) {
  const clean = [...value].filter((char) => {
    const code = char.charCodeAt(0);
    return code >= 32 && code <= 255;
  }).join("").replace(/\s+/g, " ").trim();
  return clean || "-";
}

function fit(text: string, font: PDFFont, size: number, width: number) {
  const value = latin(text);
  if (font.widthOfTextAtSize(value, size) <= width) return value;
  let out = value;
  while (out.length > 1 && font.widthOfTextAtSize(`${out}...`, size) > width) out = out.slice(0, -1);
  return `${out}...`;
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const words = latin(text).split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= width) line = next;
    else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length > 0 ? lines : ["-"];
}

type Draw = {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  cursor: number;
};

function addPage(draw: Draw) {
  draw.page = draw.doc.addPage([PAGE_W, PAGE_H]);
  draw.page.drawRectangle({ x: 0, y: PAGE_H - 28, width: PAGE_W, height: 28, color: TEAL });
  draw.page.drawText("MeterVault", { x: MARGIN, y: PAGE_H - 18, size: 10, font: draw.bold, color: WHITE });
  draw.page.drawText("Stock report", { x: MARGIN + 72, y: PAGE_H - 18, size: 10, font: draw.font, color: WHITE });
  draw.cursor = 46;
}

function ensure(draw: Draw, height: number) {
  if (draw.cursor + height <= PAGE_H - BOTTOM) return;
  addPage(draw);
}

function text(draw: Draw, value: string, x: number, size: number, font: PDFFont, color = INK) {
  draw.page.drawText(latin(value), { x: MARGIN + x, y: PAGE_H - draw.cursor - size, size, font, color });
}

function section(draw: Draw, title: string, note: string) {
  ensure(draw, 36);
  text(draw, title.toUpperCase(), 0, 11, draw.bold, BRASS);
  draw.cursor += 16;
  draw.page.drawRectangle({ x: MARGIN, y: PAGE_H - draw.cursor, width: CONTENT_W, height: 1, color: LINE });
  draw.cursor += 12;
  for (const line of wrap(note, draw.font, 9, CONTENT_W)) {
    ensure(draw, 12);
    text(draw, line, 0, 9, draw.font, MUTED);
    draw.cursor += 12;
  }
  draw.cursor += 4;
}

function table(draw: Draw, headers: string[], widths: number[], rows: string[][]) {
  const drawHeader = () => {
    ensure(draw, ROW + 4);
    draw.page.drawRectangle({ x: MARGIN, y: PAGE_H - draw.cursor - ROW + 4, width: CONTENT_W, height: ROW, color: TEAL });
    let x = 0;
    headers.forEach((header, index) => {
      draw.page.drawText(header, { x: MARGIN + x + 4, y: PAGE_H - draw.cursor - 11, size: 8, font: draw.bold, color: WHITE });
      x += widths[index];
    });
    draw.cursor += ROW;
  };
  drawHeader();
  if (rows.length === 0) {
    ensure(draw, ROW);
    text(draw, "None.", 4, 9, draw.font, MUTED);
    draw.cursor += ROW;
    return;
  }
  rows.forEach((row, rowIndex) => {
    if (draw.cursor + ROW > PAGE_H - BOTTOM) {
      addPage(draw);
      drawHeader();
    }
    if (rowIndex % 2 === 0) {
      draw.page.drawRectangle({ x: MARGIN, y: PAGE_H - draw.cursor - ROW + 4, width: CONTENT_W, height: ROW, color: CANVAS });
    }
    let x = 0;
    row.forEach((cell, index) => {
      draw.page.drawText(fit(cell, draw.font, 8, widths[index] - 8), {
        x: MARGIN + x + 4,
        y: PAGE_H - draw.cursor - 11,
        size: 8,
        font: draw.font,
        color: INK,
      });
      x += widths[index];
    });
    draw.cursor += ROW;
  });
  draw.cursor += 8;
}

export async function renderStockReport(report: StockReportData) {
  const doc = await PDFDocument.create();
  const draw: Draw = {
    doc,
    page: null as unknown as PDFPage,
    font: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    cursor: 0,
  };
  addPage(draw);
  text(draw, "Stock in and stock out", 0, 20, draw.bold);
  draw.cursor += 28;
  text(draw, report.organisationName, 0, 12, draw.bold, TEAL);
  draw.cursor += 18;
  const prepared = [report.periodLabel, `Prepared by ${report.preparedBy}`, formatWhen(report.generatedAt)].filter(Boolean).join("  ·  ");
  for (const line of wrap(prepared, draw.font, 9, CONTENT_W)) {
    text(draw, line, 0, 9, draw.font, MUTED);
    draw.cursor += 12;
  }
  draw.cursor += 6;

  const boxW = (CONTENT_W - 18) / 4;
  ensure(draw, 54);
  report.tiles.forEach((tile, index) => {
    const x = MARGIN + index * (boxW + 6);
    draw.page.drawRectangle({ x, y: PAGE_H - draw.cursor - 48, width: boxW, height: 48, color: CANVAS });
    draw.page.drawText(tile.value, { x: x + 8, y: PAGE_H - draw.cursor - 24, size: 16, font: draw.bold, color: TEAL });
    draw.page.drawText(fit(tile.label, draw.font, 8, boxW - 16), { x: x + 8, y: PAGE_H - draw.cursor - 38, size: 8, font: draw.font, color: MUTED });
  });
  draw.cursor += 62;

  for (const line of wrap(report.brief, draw.font, 10, CONTENT_W)) {
    ensure(draw, 14);
    text(draw, line, 0, 10, draw.font);
    draw.cursor += 14;
  }
  draw.cursor += 12;

  if (report.periodLabel) {
    section(draw, "Came in", `Received into stock ${report.periodDuring}.`);
    table(
      draw,
      ["When", "Serial", "Kind"],
      [140, 185, 190],
      report.cameIn.map((item) => [formatCompact(item.at), item.serial, item.kind]),
    );
    section(draw, "Issued", `Handed to someone on the team ${report.periodDuring}.`);
    table(
      draw,
      ["When", "Serial", "Kind", "Detail"],
      [110, 130, 90, 185],
      report.issued.map((item) => [formatCompact(item.at), item.serial, item.kind, item.detail]),
    );
    section(draw, "Went out", `Installed ${report.periodDuring}. A linked capture shows where it went.`);
    table(
      draw,
      ["When", "Serial", "Kind", "Detail"],
      [110, 120, 80, 205],
      report.wentOut.map((item) => [formatCompact(item.at), item.serial, item.kind, item.detail]),
    );
    section(draw, "Came back", `Returned to the store ${report.periodDuring}.`);
    table(
      draw,
      ["When", "Serial", "Kind"],
      [140, 185, 190],
      report.cameBack.map((item) => [formatCompact(item.at), item.serial, item.kind]),
    );
    section(draw, "Full record", `Every movement ${report.periodDuring}, newest first.`);
  } else {
  section(draw, "In the store", "On hand now. Days on hand counts from the day it arrived, or from the day it came back.");
  table(
    draw,
    ["Serial", "Kind", "Arrived", "Days"],
    [190, 110, 120, 95],
    report.inStore.map((item) => [item.serial, item.kind, formatDay(item.since), String(item.days)]),
  );

  section(draw, "With the team", "Issued, and not yet installed. The longest outstanding items are listed first.");
  table(
    draw,
    ["Serial", "Kind", "Holder", "Since", "Days"],
    [140, 90, 120, 90, 75],
    report.withTeam.map((item) => [item.serial, item.kind, item.holder || "-", formatDay(item.since), String(item.days)]),
  );

  section(draw, "Gone out", "Installed and no longer in inventory. A linked capture shows where it went.");
  table(
    draw,
    ["Serial", "Kind", "Left", "Where"],
    [130, 90, 80, 215],
    report.goneOut.map((item) => [item.serial, item.kind, formatDay(item.since), item.place || "No capture linked"]),
  );

  section(draw, "Full record", "Every time stock came in, went out to the team, was installed, or came back. Newest first.");
  }
  table(
    draw,
    ["When", "Serial", "Kind", "What", "Detail"],
    [90, 110, 78, 62, 175],
    report.movements.map((movement) => [formatCompact(movement.at), movement.serial, movement.kind, movement.what, movement.detail]),
  );

  const pages = doc.getPages();
  pages.forEach((page, index) => {
    page.drawText(`Page ${index + 1} of ${pages.length}`, { x: MARGIN, y: 18, size: 8, font: draw.font, color: MUTED });
    const label = "MeterVault  |  Durban  |  Internal stock record";
    const labelWidth = draw.font.widthOfTextAtSize(label, 8);
    page.drawText(label, { x: PAGE_W - MARGIN - labelWidth, y: 18, size: 8, font: draw.font, color: MUTED });
  });
  const title = stockReportTitle(report);
  doc.setTitle(title);
  doc.setAuthor(report.preparedBy);
  return doc.save();
}

export function stockReportTitle(report: Pick<StockReportData, "periodLabel" | "generatedAt">) {
  const date = report.periodLabel || spanLabel({ mode: "day", date: todayInZone(report.generatedAt) });
  return pdfTitle("MeterVault stock report", date);
}

export async function buildStockReportPdf(organisationId: string, preparedBy: string, span: ReportSpan | null = null) {
  const report = await loadStockReport(organisationId, preparedBy, span);
  return { pdf: await renderStockReport(report), filename: `${stockReportTitle(report)}.pdf` };
}
