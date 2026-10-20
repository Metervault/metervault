import { DataTable } from "@/components/office/data-table";
import { DatabaseNotice } from "@/components/office/database-notice";
import { jobColumns, jobTableRows } from "@/components/office/job-rows";
import { SectionTitle } from "@/components/section-title";
import { loadJobs } from "@/server/office/load";

export const dynamic = "force-dynamic";

export default async function Page() {
  try {
    const rows = await loadJobs();
    return (
      <div className="space-y-4">
        <div>
          <SectionTitle>Jobs</SectionTitle>
          <p className="mt-3 text-sm text-muted">Every capture in the company. Open Review on a waiting job to approve or reject it.</p>
        </div>
        <DataTable columns={jobColumns} rows={jobTableRows(rows)} empty="No captures have come in yet." />
      </div>
    );
  } catch (error) {
    return <DatabaseNotice title="Jobs" error={error} />;
  }
}
