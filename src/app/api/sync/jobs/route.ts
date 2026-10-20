import { METER_CHANGE_V1 } from "@/domain/forms/meter-change-v1";
import { normaliseAnswers } from "@/domain/forms/normalise";
import { blockingIssues, validateForm } from "@/domain/forms/validate";
import { getSessionUser } from "@/server/auth/session";
import { safeDbMessage } from "@/server/db/client";
import { acceptSyncedJob } from "@/server/sync/persist";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const body = (await request.json()) as {
    idempotencyKey?: string;
    answers?: Record<string, unknown>;
  };
  if (!body.idempotencyKey || !body.answers) {
    return Response.json({ error: "Missing job." }, { status: 400 });
  }
  const answers = normaliseAnswers(METER_CHANGE_V1, body.answers);
  const issues = blockingIssues(validateForm(METER_CHANGE_V1, answers, "submit"));
  if (issues.length > 0) {
    return Response.json({ error: "Job is incomplete.", issues }, { status: 422 });
  }
  try {
    const saved = await acceptSyncedJob(body.idempotencyKey, answers, user);
    return Response.json(saved);
  } catch (error) {
    const cause = error instanceof Error && "cause" in error ? error.cause : error;
    const detail = cause instanceof Error ? cause.message : safeDbMessage(error);
    console.error("Job sync failed:", detail.replace(/postgres(?:ql)?:\/\/\S+/gi, "postgresql://…"));
    return Response.json({ error: safeDbMessage(error) }, { status: 500 });
  }
}
