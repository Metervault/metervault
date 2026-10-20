import { DataTable } from "@/components/office/data-table";
import { DatabaseNotice } from "@/components/office/database-notice";
import { StatusPill } from "@/components/office/status-pill";
import { WorkOrderForm } from "@/components/office/work-order-form";
import { SectionTitle } from "@/components/section-title";
import { loadTeam, loadWorkOrders } from "@/server/office/load";

export const dynamic = "force-dynamic";

function cell(value: string | null) {
  return value && value.trim() ? value : "—";
}

export default async function Page() {
  try {
    const [rows, team] = await Promise.all([loadWorkOrders("company"), loadTeam()]);
    return (
      <div className="space-y-4">
        <div>
          <SectionTitle>Work orders</SectionTitle>
          <p className="mt-3 text-sm text-muted">Add an address here. It shows up in the field app for the person you assign, or for anyone if you leave it open.</p>
        </div>
        <WorkOrderForm team={team} />
        <DataTable
          columns={["Address", "Town", "Status", "Old meter", "Connection", "Assigned"]}
          rows={rows.map((row) => ({
            key: row.id,
            cells: [
              cell([row.houseNumber, row.street].filter(Boolean).join(" ")),
              cell(row.town),
              <StatusPill value={row.status} />,
              cell(row.oldMeterNumber),
              cell(row.connectionNumber),
              cell(row.assignee),
            ],
          }))}
          empty="No work orders yet."
        />
      </div>
    );
  } catch (error) {
    return <DatabaseNotice title="Work orders" error={error} />;
  }
}
