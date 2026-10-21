import { DatabaseNotice } from "@/components/office/database-notice";
import { ReportDownloads } from "@/components/office/report-downloads";
import { SectionTitle } from "@/components/section-title";
import { loadReportDates } from "@/server/office/load";

export const dynamic = "force-dynamic";

export default async function Page() {
  try {
    const dates = await loadReportDates();
    return (
      <div className="space-y-4">
        <div>
          <SectionTitle>Exports</SectionTitle>
          <p className="mt-3 text-sm text-muted">Pick a day or a month. The spreadsheet and the stock report both use that period. Days and months with a dot already have captures or stock movements.</p>
        </div>
        <ReportDownloads today={dates.today} captureDates={dates.captureDates} movementDates={dates.movementDates} spreadsheet stock />
      </div>
    );
  } catch (error) {
    return <DatabaseNotice title="Exports" error={error} />;
  }
}
