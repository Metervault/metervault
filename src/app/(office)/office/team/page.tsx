import { DatabaseNotice } from "@/components/office/database-notice";
import { TeamList } from "@/components/office/team-list";
import { SectionTitle } from "@/components/section-title";
import { isOfficeRole } from "@/lib/roles";
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
          <p className="mt-3 text-sm text-muted">
            Head managers and managers use this dashboard. Only a head manager can change roles or remove someone, and their past jobs stay on record. A new account starts in the field.
          </p>
        </div>
        <TeamList people={people} currentUserId={user?.id ?? ""} viewerRole={user && isOfficeRole(user.orgRole) ? user.orgRole : "admin"} />
      </div>
    );
  } catch (error) {
    return <DatabaseNotice title="Team" error={error} />;
  }
}
