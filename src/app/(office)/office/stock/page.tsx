import { DatabaseNotice } from "@/components/office/database-notice";
import { ReportDownloads } from "@/components/office/report-downloads";
import { StockForm } from "@/components/office/stock-form";
import { StockList } from "@/components/office/stock-list";
import { SectionTitle } from "@/components/section-title";
import { loadReportDates, loadStock, loadTeam } from "@/server/office/load";

export const dynamic = "force-dynamic";

export default async function Page() {
  try {
    const [rows, team, dates] = await Promise.all([loadStock(), loadTeam(), loadReportDates()]);
    return (
      <div className="space-y-4">
        <div>
          <SectionTitle>Stock</SectionTitle>
          <p className="mt-3 text-sm text-muted">
            Meters and smart devices held by the company. Mark an item as gone out once it has been installed. It stays on this list as Installed, and you can return it to stock.
          </p>
        </div>
        <ReportDownloads today={dates.today} movementDates={dates.movementDates} stock />
        <StockForm />
        <StockList items={rows} team={team} />
      </div>
    );
  } catch (error) {
    return <DatabaseNotice title="Stock" error={error} />;
  }
}
