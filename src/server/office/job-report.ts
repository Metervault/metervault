import { eq } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { formatJobWhen, jobHeading, jobSections, photoCaption } from "@/lib/job-facts";
import { isValidDay, pdfTitle, spanLabel, todayInZone } from "@/lib/report-period";
import { getDb } from "@/server/db/client";
import { jobPhotos } from "@/server/db/schema";
import { loadJob, type JobRecord } from "@/server/office/load";

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
const DANGER = rgb(0.62, 0.16, 0.14);

type Draw = {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  cursor: number;
};

function latin(value: string) {
  const clean = [...value]
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code <= 255;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return clean || "-";
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

function addPage(draw: Draw) {
  draw.page = draw.doc.addPage([PAGE_W, PAGE_H]);
  draw.page.drawRectangle({ x: 0, y: PAGE_H - 28, width: PAGE_W, height: 28, color: TEAL });
  draw.page.drawText("MeterVault", { x: MARGIN, y: PAGE_H - 18, size: 10, font: draw.bold, color: WHITE });
  draw.page.drawText("Job report", { x: MARGIN + 72, y: PAGE_H - 18, size: 10, font: draw.font, color: WHITE });
  draw.cursor = 46;
}

function ensure(draw: Draw, height: number) {
  if (draw.cursor + height <= PAGE_H - BOTTOM) return;
  addPage(draw);
}

function text(draw: Draw, value: string, x: number, size: number, font: PDFFont, color = INK) {
  draw.page.drawText(latin(value), { x: MARGIN + x, y: PAGE_H - draw.cursor - size, size, font, color });
}

function section(draw: Draw, title: string) {
  ensure(draw, 28);
  text(draw, title.toUpperCase(), 0, 11, draw.bold, BRASS);
  draw.cursor += 16;
  draw.page.drawRectangle({ x: MARGIN, y: PAGE_H - draw.cursor, width: CONTENT_W, height: 1, color: LINE });
  draw.cursor += 12;
}

function facts(draw: Draw, rows: { label: string; value: string }[]) {
  for (const row of rows) {
    const lines = wrap(row.value, draw.font, 9, CONTENT_W - 150);
    const height = Math.max(16, lines.length * 12);
    ensure(draw, height);
    text(draw, row.label, 0, 9, draw.font, MUTED);
    lines.forEach((line, index) => {
      draw.page.drawText(line, { x: MARGIN + 150, y: PAGE_H - draw.cursor - 9 - index * 12, size: 9, font: draw.font, color: INK });
    });
    draw.cursor += height;
  }
  draw.cursor += 10;
}

function statusColor(status: string) {
  if (status === "approved") return TEAL;
  if (status === "rejected") return DANGER;
  return BRASS;
}

async function drawPhoto(draw: Draw, doc: PDFDocument, caption: string, bytes: Uint8Array | null) {
  const lines = wrap(caption, draw.font, 9, CONTENT_W);
  ensure(draw, lines.length * 12 + 8);
  lines.forEach((line) => {
    text(draw, line, 0, 9, draw.bold);
    draw.cursor += 12;
  });
  draw.cursor += 4;
  if (!bytes || bytes.byteLength === 0) {
    ensure(draw, 14);
    text(draw, "Photo was not stored.", 0, 9, draw.font, MUTED);
    draw.cursor += 18;
    return;
  }
  let image: PDFImage | null = null;
  try {
    image = await doc.embedJpg(bytes);
  } catch {
    try {
      image = await doc.embedPng(bytes);
    } catch {
      image = null;
    }
  }
  if (!image) {
    ensure(draw, 14);
    text(draw, "This photo could not be placed in the report.", 0, 9, draw.font, MUTED);
    draw.cursor += 18;
    return;
  }
  const fitted = image.scaleToFit(CONTENT_W, 260);
  ensure(draw, fitted.height + 12);
  draw.page.drawImage(image, { x: MARGIN, y: PAGE_H - draw.cursor - fitted.height, width: fitted.width, height: fitted.height });
  draw.cursor += fitted.height + 14;
}

export async function renderJobReport(job: JobRecord, preparedBy: string, photos: Map<string, Uint8Array | null>) {
  const doc = await PDFDocument.create();
  const draw: Draw = {
    doc,
    page: null as unknown as PDFPage,
    font: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    cursor: 0,
  };
  addPage(draw);
  const heading = jobHeading(job);
  for (const line of wrap(heading, draw.bold, 18, CONTENT_W)) {
    text(draw, line, 0, 18, draw.bold);
    draw.cursor += 22;
  }
  draw.cursor += 4;
  text(draw, job.organisationName, 0, 12, draw.bold, TEAL);
  draw.cursor += 18;
  const prepared = [job.responseCode ? `Response ${job.responseCode}` : "", `Prepared by ${preparedBy}`, formatJobWhen(new Date())].filter(Boolean).join("  ·  ");
  for (const line of wrap(prepared, draw.font, 9, CONTENT_W)) {
    text(draw, line, 0, 9, draw.font, MUTED);
    draw.cursor += 12;
  }
  draw.cursor += 8;
  const outcome = jobSections(job)[0]?.rows.find((row) => row.label === "Status")?.value ?? job.status;
  text(draw, outcome, 0, 14, draw.bold, statusColor(job.status));
  draw.cursor += 20;
  for (const line of wrap(jobSections(job).find((section) => section.title === "Decision")?.rows.find((row) => row.label === "Outcome")?.value ?? "", draw.font, 10, CONTENT_W)) {
    ensure(draw, 14);
    text(draw, line, 0, 10, draw.font);
    draw.cursor += 14;
  }
  draw.cursor += 8;

  for (const block of jobSections(job)) {
    section(draw, block.title);
    facts(draw, block.rows);
  }

  section(draw, "Photos");
  if (job.photos.length === 0) {
    text(draw, "No photos were attached.", 0, 9, draw.font, MUTED);
    draw.cursor += 14;
  }
  for (const photo of job.photos) {
    await drawPhoto(draw, doc, photoCaption(photo), photos.get(photo.id) ?? null);
  }

  const pages = doc.getPages();
  pages.forEach((page, index) => {
    page.drawText(`Page ${index + 1} of ${pages.length}`, { x: MARGIN, y: 18, size: 8, font: draw.font, color: MUTED });
    const label = "MeterVault  |  Durban  |  Internal job record";
    page.drawText(label, { x: PAGE_W - MARGIN - draw.font.widthOfTextAtSize(label, 8), y: 18, size: 8, font: draw.font, color: MUTED });
  });
  const title = jobReportTitle(job);
  doc.setTitle(title);
  doc.setAuthor(preparedBy);
  return doc.save();
}

export function jobReportTitle(job: Pick<JobRecord, "houseNumber" | "street" | "town" | "newMeterNumber" | "jobDate" | "submittedOn">) {
  const date = job.jobDate && isValidDay(job.jobDate)
    ? spanLabel({ mode: "day", date: job.jobDate })
    : job.submittedOn
      ? spanLabel({ mode: "day", date: todayInZone(job.submittedOn) })
      : "Undated";
  return pdfTitle(jobHeading(job), date);
}

export function jobReportFilename(job: Pick<JobRecord, "houseNumber" | "street" | "town" | "newMeterNumber" | "jobDate" | "submittedOn">) {
  return `${jobReportTitle(job)}.pdf`;
}

export async function buildJobReportPdf(jobId: string, preparedBy: string) {
  const job = await loadJob(jobId);
  if (!job) return null;
  const stored = await getDb()
    .select({ id: jobPhotos.id, content: jobPhotos.content })
    .from(jobPhotos)
    .where(eq(jobPhotos.jobId, job.id));
  const photos = new Map(stored.map((photo) => [photo.id, photo.content ? new Uint8Array(photo.content) : null]));
  return { pdf: await renderJobReport(job, preparedBy, photos), filename: jobReportFilename(job) };
}
