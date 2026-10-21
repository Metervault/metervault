import Link from "next/link";
import { DataTable } from "@/components/office/data-table";
import { DatabaseNotice } from "@/components/office/database-notice";
import { jobColumns, jobTableRows } from "@/components/office/job-rows";
import { SectionTitle } from "@/components/section-title";
import { loadOfficeHome } from "@/server/office/load";

export const dynamic = "force-dynamic";

const actions = [
  { href: "/office/review", label: "Review", detail: "Approve or reject captures" },
  { href: "/office/jobs", label: "Jobs", detail: "Every capture in the company" },
  { href: "/office/team", label: "Team", detail: "Managers and field installers" },
  { href: "/office/work-orders", label: "Work orders", detail: "Send work to the field app" },
  { href: "/office/stock", label: "Stock", detail: "Meters and smart devices" },
  { href: "/office/exports", label: "Exports", detail: "Download a daily or monthly report" },
];

export default async function OfficeHomePage() {
  try {
    const home = await loadOfficeHome();
    const stats = [
      { label: "Awaiting review", value: String(home.awaitingReview), href: "/office/review", action: "Approve or reject" },
      { label: "Approved", value: String(home.approved) },
      { label: "Installs today", value: String(home.installsToday) },
      { label: "Team", value: String(home.teamCount), href: "/office/team", action: "Manage people" },
      { label: "Open work orders", value: String(home.openWorkOrders), href: "/office/work-orders", action: "Assign work" },
      { label: "First-time-right", value: home.firstTimeRight },
    ];
    return (
      <div className="space-y-6">
        <div>
          <SectionTitle>Company</SectionTitle>
          <p className="mt-3 text-sm text-muted">
            {home.organisationName}. Installers capture jobs in the field app. This dashboard is where you review them, assign work, and keep stock.
          </p>
        </div>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((stat) => (
            <article key={stat.label} className="rounded-lg border border-line bg-surface p-4 shadow-sm">
              <p className="text-sm text-muted">{stat.label}</p>
              <p className="mt-1 text-3xl font-bold leading-none">{stat.value}</p>
              {stat.href ? (
                <Link href={stat.href} className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-brand">
                  {stat.action}
                </Link>
              ) : null}
            </article>
          ))}
        </section>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {actions.map((action) => (
            <Link key={action.href} href={action.href} className="rounded-lg border border-line bg-surface p-4 shadow-sm">
              <p className="text-base font-semibold text-brand">{action.label}</p>
              <p className="mt-1 text-sm text-muted">{action.detail}</p>
            </Link>
          ))}
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Latest captures</h2>
          <DataTable columns={jobColumns} rows={jobTableRows(home.latest)} empty="No captures have come in yet." />
        </section>
      </div>
    );
  } catch (error) {
    return <DatabaseNotice title="Company" error={error} />;
  }
}
