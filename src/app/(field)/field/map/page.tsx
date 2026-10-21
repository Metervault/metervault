import { WorkList } from "@/components/field/work-list";
import { DatabaseNotice } from "@/components/office/database-notice";
import { SectionTitle } from "@/components/section-title";
import { loadWorkOrders } from "@/server/office/load";

export const dynamic = "force-dynamic";

export default async function Page() {
  try {
    const rows = await loadWorkOrders("field");
    return (
      <div className="space-y-4">
        <SectionTitle className="text-xl">Work near you</SectionTitle>
        <p className="text-sm text-muted">Open work from the manager dashboard. Start a capture to fill in the address.</p>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No work has been assigned yet. Your manager adds it from the manager dashboard.</p>
        ) : (
          <WorkList orders={rows} />
        )}
      </div>
    );
  } catch (error) {
    return <DatabaseNotice title="Work near you" error={error} />;
  }
}
