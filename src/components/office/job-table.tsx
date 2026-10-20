import { DataTable } from "@/components/office/data-table";
import { StatusPill } from "@/components/office/status-pill";
import type { OfficeJob } from "@/server/office/load";

const columns = ["Response", "Date", "Town", "Street", "New meter", "Installer", "Status"];

export function JobTable({ rows, empty }: { rows: OfficeJob[]; empty: string }) {
  return (
    <DataTable
      columns={columns}
      empty={empty}
      rows={rows.map((job) => ({
        key: job.id,
        cells: [
          job.responseCode ?? "—",
          job.jobDate ?? "—",
          job.town ?? "—",
          job.street ?? "—",
          job.newMeterNumber ?? "—",
          job.installer ?? "—",
          <StatusPill key={job.id} value={job.status} />,
        ],
      }))}
    />
  );
}
