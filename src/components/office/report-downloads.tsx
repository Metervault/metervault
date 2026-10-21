"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dateInSpan, monthName, shiftMonth, spanDuring, spanLabel, type ReportSpan } from "@/lib/report-period";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function cellsFor(month: string) {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5));
  const lead = (new Date(Date.UTC(year, monthIndex - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  const cells: Array<{ date: string; label: number } | null> = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= count; day += 1) {
    cells.push({ date: `${month}-${String(day).padStart(2, "0")}`, label: day });
  }
  return cells;
}

function downloadHref(path: string, span: ReportSpan) {
  const date = span.mode === "day" ? span.date : span.month;
  return `${path}?period=${span.mode}&date=${date}`;
}

export function ReportDownloads({
  today,
  captureDates = [],
  movementDates = [],
  spreadsheet = false,
  stock = false,
}: {
  today: string;
  captureDates?: string[];
  movementDates?: string[];
  spreadsheet?: boolean;
  stock?: boolean;
}) {
  const [mode, setMode] = useState<"day" | "month">("month");
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [visible, setVisible] = useState(today.slice(0, 7));
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const span: ReportSpan = mode === "day" ? { mode: "day", date: day } : { mode: "month", month };
  const activeDays = useMemo(() => new Set([...captureDates, ...movementDates]), [captureDates, movementDates]);
  const captures = captureDates.filter((date) => dateInSpan(date, span)).length;
  const movements = movementDates.filter((date) => dateInSpan(date, span)).length;
  const captureNoun = captures === 1 ? "capture" : "captures";
  const movementNoun = movements === 1 ? "stock movement" : "stock movements";

  return (
    <section className="max-w-sm rounded-lg border border-line bg-surface p-4 shadow-sm">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" aria-pressed={mode === "day"} onClick={() => setMode("day")} className={`min-h-12 rounded-md text-sm font-semibold ${mode === "day" ? "bg-primary text-on-primary" : "border border-line"}`}>
          Daily
        </button>
        <button type="button" aria-pressed={mode === "month"} onClick={() => setMode("month")} className={`min-h-12 rounded-md text-sm font-semibold ${mode === "month" ? "bg-primary text-on-primary" : "border border-line"}`}>
          Monthly
        </button>
      </div>

      {mode === "day" ? (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <button type="button" aria-label="Previous month" onClick={() => setVisible((value) => shiftMonth(value, -1))} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line">
              <ChevronLeft aria-hidden="true" size={18} />
            </button>
            <p className="text-sm font-semibold">{monthName(Number(visible.slice(5)) - 1)} {visible.slice(0, 4)}</p>
            <button type="button" aria-label="Next month" onClick={() => setVisible((value) => shiftMonth(value, 1))} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line">
              <ChevronRight aria-hidden="true" size={18} />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cellsFor(visible).map((cell, index) =>
              cell ? (
                <button
                  key={cell.date}
                  type="button"
                  aria-pressed={cell.date === day}
                  aria-label={spanLabel({ mode: "day", date: cell.date })}
                  onClick={() => {
                    setDay(cell.date);
                    setMonth(cell.date.slice(0, 7));
                  }}
                  className={`flex h-10 flex-col items-center justify-center rounded-md text-sm font-semibold ${cell.date === day ? "bg-primary text-on-primary" : cell.date === today ? "border border-primary text-brand" : "hover:bg-canvas"}`}
                >
                  {cell.label}
                  <span className={`h-1 w-1 rounded-full ${activeDays.has(cell.date) ? (cell.date === day ? "bg-on-primary" : "bg-primary") : "bg-transparent"}`} />
                </button>
              ) : (
                <span key={`empty-${index}`} />
              ),
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <button type="button" aria-label="Previous year" onClick={() => setYear((value) => value - 1)} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line">
              <ChevronLeft aria-hidden="true" size={18} />
            </button>
            <p className="text-sm font-semibold">{year}</p>
            <button type="button" aria-label="Next year" onClick={() => setYear((value) => value + 1)} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line">
              <ChevronRight aria-hidden="true" size={18} />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }, (_, index) => {
              const value = `${year}-${String(index + 1).padStart(2, "0")}`;
              const selected = value === month;
              const hasActivity = captureDates.some((date) => date.startsWith(value)) || movementDates.some((date) => date.startsWith(value));
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setMonth(value)}
                  className={`flex min-h-12 flex-col items-center justify-center rounded-md text-sm font-semibold ${selected ? "bg-primary text-on-primary" : "border border-line"}`}
                >
                  {monthName(index).slice(0, 3)}
                  <span className={`mx-auto mt-1 block h-1 w-1 rounded-full ${hasActivity ? (selected ? "bg-on-primary" : "bg-primary") : "bg-transparent"}`} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="mt-4 text-sm font-semibold" aria-live="polite">{spanLabel(span)}</p>
      {spreadsheet ? <p className="text-sm text-muted">{captures === 0 ? `No captures ${spanDuring(span)}.` : `${captures} ${captureNoun} ${spanDuring(span)}.`}</p> : null}
      {stock ? <p className="text-sm text-muted">{movements === 0 ? `No stock movements ${spanDuring(span)}.` : `${movements} ${movementNoun} ${spanDuring(span)}.`}</p> : null}
      <div className="mt-4 flex flex-col gap-2">
        {spreadsheet ? (
          <a href={downloadHref("/api/office/export", span)} className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-5 text-base font-semibold text-on-primary">
            Download spreadsheet
          </a>
        ) : null}
        {stock ? (
          <a href={downloadHref("/api/office/stock/report", span)} className="inline-flex min-h-12 items-center justify-center rounded-md border-2 border-primary px-5 text-sm font-semibold text-brand">
            Download stock report
          </a>
        ) : null}
      </div>
    </section>
  );
}
