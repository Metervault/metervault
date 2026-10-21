import { notFound, unstable_rethrow } from "next/navigation";
import { DatabaseNotice } from "@/components/office/database-notice";
import { JobRecordView } from "@/components/office/job-record";
import { loadJob } from "@/server/office/load";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let job;
  try {
    job = await loadJob(id);
  } catch (error) {
    unstable_rethrow(error);
    return <DatabaseNotice title="Job" error={error} />;
  }
  if (!job) notFound();
  return <JobRecordView job={job} />;
}
