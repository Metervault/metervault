import { DataTable } from "@/components/office/data-table";
import { DatabaseNotice } from "@/components/office/database-notice";
import { StatusPill } from "@/components/office/status-pill";
import { StockForm } from "@/components/office/stock-form";
import { SectionTitle } from "@/components/section-title";
import { loadStock } from "@/server/office/load";

export const dynamic = "force-dynamic";

export default async function Page() {
  try {
    const rows = await loadStock();
    return (
      <div className="space-y-4">
        <div>
          <SectionTitle>Stock</SectionTitle>
          <p className="mt-3 text-sm text-muted">Meters and smart devices held by the company.</p>
        </div>
        <StockForm />
        <DataTable
          columns={["Serial", "Kind", "Status", "Holder"]}
          rows={rows.map((row) => ({
            key: row.id,
            cells: [row.serial, row.kind === "smart_device" ? "Smart device" : "Meter", <StatusPill value={row.status} />, row.holder ?? "—"],
          }))}
          empty="No meters or smart devices are in stock."
        />
      </div>
    );
  } catch (error) {
    return <DatabaseNotice title="Stock" error={error} />;
  }
}
