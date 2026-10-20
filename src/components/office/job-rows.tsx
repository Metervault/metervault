import Link from "next/link";
import { StatusPill } from "@/components/office/status-pill";
import type { OfficeJob } from "@/server/office/load";

const waiting = new Set(["submitted", "in_review", "resubmitted"]);

function cell(value: string | null) {
  return value && value.trim() ? value : "—";
}

export function jobTableRows(rows: OfficeJob[]) {
  return rows.map((job) => ({
    key: job.id,
    cells: [
      cell(job.street),
      cell(job.town),
      cell(job.installer),
      cell(job.jobDate),
      cell(job.newMeterNumber),
      <StatusPill key={job.id} value={job.status} />,
      waiting.has(job.status) ? (
        <Link key={`${job.id}-review`} href="/office/review" className="font-semibold text-brand">
          Review
        </Link>
      ) : (
        "—"
      ),
    ],
  }));
}

export const jobColumns = ["Street", "Town", "Installer", "Date", "New meter", "Status", "Decision"];
