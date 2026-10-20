import { DatabaseNotice } from "@/components/office/database-notice";
import { TeamList } from "@/components/office/team-list";
import { SectionTitle } from "@/components/section-title";
import { getSessionUser } from "@/server/auth/session";
import { loadTeam } from "@/server/office/load";

export const dynamic = "force-dynamic";

export default async function Page() {
  try {
    const user = await getSessionUser();
    const people = await loadTeam();
    return (
      <div className="space-y-4">
        <div>
          <SectionTitle>Team</SectionTitle>
          <p className="mt-3 text-sm text-muted">Managers use this dashboard. Field people use the capture app. A new account starts as field.</p>
        </div>
        <TeamList people={people} currentUserId={user?.id ?? ""} />
      </div>
    );
  } catch (error) {
    return <DatabaseNotice title="Team" error={error} />;
  }
}
