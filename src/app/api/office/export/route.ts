import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { monthRange, readReportSpan, spanFilePart } from "@/lib/report-period";
import { requireAdmin } from "@/server/auth/require-admin";
import { getDb, safeDbMessage } from "@/server/db/client";
import { jobs, towns, users } from "@/server/db/schema";

const columns = ["Status", "Date", "Installer", "Town", "House", "Street", "Job number", "New meter", "Old meter", "Connection", "Account", "Response"] as const;

function cell(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const parsed = readReportSpan(request.url);
  if (parsed.error) return Response.json({ error: parsed.error }, { status: 400 });
  const span = parsed.span;
  const filters = [eq(jobs.organisationId, gate.user.organisationId), isNull(jobs.deletedAt)];
  if (span?.mode === "day") filters.push(eq(jobs.jobDate, span.date));
  if (span?.mode === "month") {
    const range = monthRange(span.month);
    filters.push(gte(jobs.jobDate, range.start), lt(jobs.jobDate, range.end));
  }
  try {
    const rows = await getDb()
      .select({
        status: jobs.status,
        jobDate: jobs.jobDate,
        installer: users.name,
        town: sql<string | null>`coalesce(${towns.name}, ${jobs.answers}->>'townId')`,
        houseNumber: jobs.houseNumber,
        street: jobs.street,
        jobNumber: jobs.jobNumber,
        newMeterNumber: jobs.newMeterNumber,
        oldMeterNumber: jobs.oldMeterNumber,
        connectionNumber: jobs.connectionNumber,
        accountNumber: jobs.accountNumber,
        responseCode: jobs.responseCode,
      })
      .from(jobs)
      .leftJoin(users, eq(jobs.enumeratorId, users.id))
      .leftJoin(towns, eq(jobs.townId, towns.id))
      .where(and(...filters))
      .orderBy(desc(jobs.createdAt));
    const lines = [
      columns.join(","),
      ...rows.map((row) => {
        return [
          row.status,
          row.jobDate,
          row.installer,
          row.town,
          row.houseNumber,
          row.street,
          row.jobNumber,
          row.newMeterNumber,
          row.oldMeterNumber,
          row.connectionNumber,
          row.accountNumber,
          row.responseCode,
        ]
          .map(cell)
          .join(",");
      }),
    ];
    return new Response(lines.join("\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="metervault-captures${spanFilePart(span)}.csv"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return Response.json({ error: safeDbMessage(error) }, { status: 500 });
  }
}
