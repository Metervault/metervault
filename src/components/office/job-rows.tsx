import Link from "next/link";
import { StatusPill } from "@/components/office/status-pill";
import type { OfficeJob } from "@/server/office/load";

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
      <Link key={`${job.id}-open`} href={`/office/jobs/${job.id}`} className="font-semibold text-brand">
        View
      </Link>,
    ],
  }));
}

export const jobColumns = ["Street", "Town", "Installer", "Date", "New meter", "Status", "Record"];
