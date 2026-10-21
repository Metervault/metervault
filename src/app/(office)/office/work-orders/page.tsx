import { DatabaseNotice } from "@/components/office/database-notice";
import { WorkOrderForm } from "@/components/office/work-order-form";
import { WorkOrderList } from "@/components/office/work-order-list";
import { SectionTitle } from "@/components/section-title";
import { loadTeam, loadWorkOrders } from "@/server/office/load";

export const dynamic = "force-dynamic";

export default async function Page() {
  try {
    const [rows, team] = await Promise.all([loadWorkOrders("company"), loadTeam()]);
    return (
      <div className="space-y-4">
        <div>
          <SectionTitle>Work orders</SectionTitle>
          <p className="mt-3 text-sm text-muted">
            Add an address, assign it, and close it when the work is done or cannot be done. Open orders show in the field app for the person you assign, or for anyone if you leave them open.
          </p>
        </div>
        <WorkOrderForm team={team} />
        <WorkOrderList orders={rows} team={team} />
      </div>
    );
  } catch (error) {
    return <DatabaseNotice title="Work orders" error={error} />;
  }
}
