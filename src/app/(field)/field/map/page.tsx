import { DatabaseNotice } from "@/components/office/database-notice";
import { StatusPill } from "@/components/office/status-pill";
import { SectionTitle } from "@/components/section-title";
import { loadWorkOrders } from "@/server/office/load";

export const dynamic = "force-dynamic";

export default async function Page() {
  try {
    const rows = await loadWorkOrders("field");
    return (
      <div className="space-y-4">
        <SectionTitle className="text-xl">Work near you</SectionTitle>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No work has been assigned yet. Your manager adds it from the manager dashboard.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.id} className="rounded-lg border border-line bg-surface p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{[row.houseNumber, row.street].filter(Boolean).join(" ") || "Address not set"}</p>
                  <StatusPill value={row.status} />
                </div>
                <p className="mt-1 text-sm text-muted">{[row.town, row.connectionNumber].filter(Boolean).join(" · ") || "No connection number"}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  } catch (error) {
    return <DatabaseNotice title="Work near you" error={error} />;
  }
}
