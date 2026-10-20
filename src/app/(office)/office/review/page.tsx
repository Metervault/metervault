import { DatabaseNotice } from "@/components/office/database-notice";
import { ReviewQueue } from "@/components/office/review-queue";
import { SectionTitle } from "@/components/section-title";
import { loadReviewQueue } from "@/server/office/load";

export const dynamic = "force-dynamic";

export default async function Page() {
  try {
    const rows = await loadReviewQueue();
    return (
      <div className="space-y-4">
        <div>
          <SectionTitle>Review</SectionTitle>
          <p className="mt-3 text-sm text-muted">Read the address, meters, readings, and photos, then approve or reject.</p>
        </div>
        <ReviewQueue jobs={rows} />
      </div>
    );
  } catch (error) {
    return <DatabaseNotice title="Review" error={error} />;
  }
}
