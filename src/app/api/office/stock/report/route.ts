import { readReportSpan } from "@/lib/report-period";
import { requireAdmin } from "@/server/auth/require-admin";
import { safeDbMessage } from "@/server/db/client";
import { buildStockReportPdf } from "@/server/office/stock-report";

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const parsed = readReportSpan(request.url);
  if (parsed.error) return Response.json({ error: parsed.error }, { status: 400 });
  try {
    const report = await buildStockReportPdf(gate.user.organisationId, gate.user.name, parsed.span);
    return new Response(Buffer.from(report.pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${report.filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return Response.json({ error: safeDbMessage(error) }, { status: 500 });
  }
}
