import { DatabaseNotice } from "@/components/office/database-notice";
import { SectionTitle } from "@/components/section-title";
import { loadJobs } from "@/server/office/load";

export const dynamic = "force-dynamic";

export default async function Page() {
  try {
    const rows = await loadJobs();
    return (
      <div className="space-y-4">
        <div>
          <SectionTitle>Exports</SectionTitle>
          <p className="mt-3 text-sm text-muted">Download every capture in the company as a spreadsheet. {rows.length} {rows.length === 1 ? "capture" : "captures"} will be included.</p>
        </div>
        <a href="/api/office/export" className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-5 text-base font-semibold text-on-primary">
          Download spreadsheet
        </a>
      </div>
    );
  } catch (error) {
    return <DatabaseNotice title="Exports" error={error} />;
  }
}
