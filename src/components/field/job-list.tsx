"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppLoading } from "@/components/brand/app-loading";
import { SectionTitle } from "@/components/section-title";
import { fieldDb, subscribeField, type DraftRecord, type SyncState } from "@/lib/field/db";
import { createDraft, jobTitle } from "@/lib/field/drafts";

const stateLabel: Record<SyncState, string> = {
  local: "On this phone",
  syncing: "Syncing",
  synced: "Synced",
  failed: "Sync failed",
};

export function JobList() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const load = () => void fieldDb.drafts.orderBy("updatedAt").reverse().toArray().then(setDrafts).finally(() => setReady(true));
    load();
    return subscribeField(load);
  }, []);

  async function start() {
    if (starting) return;
    setStarting(true);
    const draft = await createDraft();
    router.push(`/field/capture?draft=${draft.id}`);
  }

  if (!ready) return <AppLoading label="Loading your jobs" />;

  return (
    <div className="space-y-4">
      <SectionTitle className="text-xl">My jobs</SectionTitle>
      <p className="text-sm text-muted">Jobs stay on this phone until they sync. You can keep capturing with no signal.</p>
      <button type="button" disabled={starting} onClick={() => void start()} className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-primary text-base font-semibold text-on-primary disabled:opacity-60">
        {starting ? "Opening" : "Start a capture"}
      </button>
      {drafts.length === 0 ? <p className="text-sm text-muted">No jobs on this phone yet.</p> : null}
      <ul className="space-y-3">
        {drafts.map((draft) => (
          <li key={draft.id} className="field-target rounded-lg border border-line bg-surface p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold">{jobTitle(draft)}</p>
                <p className="text-sm text-muted">{typeof draft.answers.newMeterNumber === "string" ? draft.answers.newMeterNumber : "Meter not entered"}</p>
              </div>
              <span className="text-xs font-semibold text-brand">{draft.lifecycle === "draft" ? "Draft" : stateLabel[draft.syncState]}</span>
            </div>
            <Link href={`/field/capture?draft=${draft.id}`} className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-md border-2 border-brand text-sm font-semibold text-brand">
              Open
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
