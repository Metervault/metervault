import { readReportSpan } from "@/lib/report-period";
import { requireAdmin } from "@/server/auth/require-admin";
import { safeDbMessage } from "@/server/db/client";
import { buildCaptureSpreadsheet } from "@/server/office/spreadsheet-export";

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const parsed = readReportSpan(request.url);
  if (parsed.error) return Response.json({ error: parsed.error }, { status: 400 });
  try {
    const origin = new URL(request.url).origin;
    const report = await buildCaptureSpreadsheet(gate.user.organisationId, parsed.span, origin);
    return new Response(new Uint8Array(report.buffer), {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${report.filename.replace(/"/g, "")}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return Response.json({ error: safeDbMessage(error) }, { status: 500 });
  }
}
