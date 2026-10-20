import { DataTable } from "@/components/office/data-table";
import { DatabaseNotice } from "@/components/office/database-notice";
import { StatusPill } from "@/components/office/status-pill";
import { SectionTitle } from "@/components/section-title";
import { loadLocatedJobs } from "@/server/office/load";

export const dynamic = "force-dynamic";

export default async function Page() {
  try {
    const rows = await loadLocatedJobs();
    return (
      <div className="space-y-4">
        <div>
          <SectionTitle>Map</SectionTitle>
          <p className="mt-3 text-sm text-muted">Where field photos were taken. This is the company view, separate from the installer’s map.</p>
        </div>
        <DataTable
          columns={["Response", "Place", "Status", "Location"]}
          rows={rows.map((row) => ({
            key: row.id,
            cells: [
              row.responseCode ?? "—",
              [row.street, row.town].filter(Boolean).join(", ") || "—",
              <StatusPill value={row.status} />,
              <a
                className="font-semibold text-brand"
                href={`https://www.openstreetmap.org/?mlat=${row.latitude}&mlon=${row.longitude}#map=17/${row.latitude}/${row.longitude}`}
                target="_blank"
                rel="noreferrer"
              >
                {row.latitude?.toFixed(5)}, {row.longitude?.toFixed(5)}
              </a>,
            ],
          }))}
          empty="No captures have a location yet."
        />
      </div>
    );
  } catch (error) {
    return <DatabaseNotice title="Map" error={error} />;
  }
}
