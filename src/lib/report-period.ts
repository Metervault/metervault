export const REPORT_ZONE = "Africa/Johannesburg";

export type ReportSpan = { mode: "day"; date: string } | { mode: "month"; month: string };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function todayInZone(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function dayKey(date: Date) {
  return todayInZone(date);
}

export function isValidDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isValidMonth(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const month = Number(value.slice(5));
  return month >= 1 && month <= 12;
}

export function readReportSpan(url: string): { span: ReportSpan | null; error?: string } {
  const params = new URL(url).searchParams;
  const mode = params.get("period");
  const date = params.get("date");
  if (!mode && !date) return { span: null };
  if (mode === "day" && date && isValidDay(date)) return { span: { mode: "day", date } };
  if (mode === "month" && date && isValidMonth(date)) return { span: { mode: "month", month: date } };
  return { span: null, error: "Choose a day or a month." };
}

export function monthRange(month: string) {
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5));
  const nextYear = index === 12 ? year + 1 : year;
  const nextMonth = index === 12 ? 1 : index + 1;
  return {
    start: `${month}-01`,
    end: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`,
  };
}

export function spanLabel(span: ReportSpan) {
  if (span.mode === "month") return `${MONTHS[Number(span.month.slice(5)) - 1]} ${span.month.slice(0, 4)}`;
  const [year, month, day] = span.date.split("-");
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
}

export function spanDuring(span: ReportSpan) {
  return `${span.mode === "day" ? "on" : "in"} ${spanLabel(span)}`;
}

export function pdfTitle(name: string, date: string) {
  const clean = `${name} ${date}`
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return clean.slice(0, 120) || "MeterVault report";
}

export function spanFilePart(span: ReportSpan | null) {
  if (!span) return "";
  return span.mode === "day" ? `-${span.date}` : `-${span.month}`;
}

export function dateInSpan(day: string, span: ReportSpan) {
  if (span.mode === "day") return day === span.date;
  return day.slice(0, 7) === span.month;
}

export function shiftMonth(month: string, delta: number) {
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5)) - 1 + delta;
  const date = new Date(Date.UTC(year, index, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthName(index: number) {
  return MONTHS[index] ?? "";
}
