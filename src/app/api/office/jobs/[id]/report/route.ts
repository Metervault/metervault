import { requireAdmin } from "@/server/auth/require-admin";
import { safeDbMessage } from "@/server/db/client";
import { buildJobReportPdf } from "@/server/office/job-report";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { id } = await context.params;
  try {
    const report = await buildJobReportPdf(id, gate.user.name);
    if (!report) return new Response("Job not found.", { status: 404 });
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
