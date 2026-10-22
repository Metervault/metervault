"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { roleLabel, type OrgRole } from "@/lib/roles";
import type { TeamMember } from "@/server/office/load";

export function TeamList({ people, currentUserId, viewerRole }: { people: TeamMember[]; currentUserId: string; viewerRole: OrgRole }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState("");
  const head = viewerRole === "head";

  async function send(userId: string, body: { orgRole?: OrgRole; action?: "remove" }) {
    setPending(userId);
    setError("");
    const response = await fetch("/api/office/team", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, ...body }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setPending(null);
    if (!response.ok) {
      setError(payload?.error ?? "Could not update that person.");
      return;
    }
    setConfirming(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}
      <ul className="space-y-3">
        {people.map((person) => {
          const self = person.id === currentUserId;
          const busy = pending === person.id;
          return (
            <li key={person.id} className="rounded-lg border border-line bg-surface p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold">{person.name}</p>
                  <p className="text-sm text-muted">{person.email}</p>
                </div>
                <span className={`rounded-sm px-2 py-0.5 text-xs font-semibold ${person.orgRole === "member" ? "bg-canvas text-muted" : "bg-primary/20 text-brand"}`}>
                  {roleLabel(person.orgRole)}
                </span>
              </div>
              {self ? (
                <p className="mt-3 text-sm text-muted">This is you.</p>
              ) : confirming === person.id ? (
                <div className="mt-3 space-y-2">
                  <p className="text-sm">Remove {person.name}? Their past jobs and stock records stay.</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button type="button" disabled={busy} onClick={() => void send(person.id, { action: "remove" })} className="min-h-12 rounded-md bg-danger px-4 text-sm font-semibold text-white disabled:opacity-60">
                      {busy ? "Removing" : "Remove"}
                    </button>
                    <button type="button" disabled={busy} onClick={() => setConfirming(null)} className="min-h-12 rounded-md border border-line px-4 text-sm font-semibold">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : head ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {person.orgRole !== "head" ? (
                    <button type="button" disabled={busy} onClick={() => void send(person.id, { orgRole: "head" })} className="min-h-12 rounded-md border-2 border-primary px-4 text-sm font-semibold text-brand disabled:opacity-60">
                      {busy ? "Saving" : "Make head manager"}
                    </button>
                  ) : null}
                  {person.orgRole !== "admin" ? (
                    <button type="button" disabled={busy} onClick={() => void send(person.id, { orgRole: "admin" })} className="min-h-12 rounded-md border-2 border-primary px-4 text-sm font-semibold text-brand disabled:opacity-60">
                      {busy ? "Saving" : "Make manager"}
                    </button>
                  ) : null}
                  {person.orgRole !== "member" ? (
                    <button type="button" disabled={busy} onClick={() => void send(person.id, { orgRole: "member" })} className="min-h-12 rounded-md border-2 border-primary px-4 text-sm font-semibold text-brand disabled:opacity-60">
                      {busy ? "Saving" : "Move to field"}
                    </button>
                  ) : null}
                  <button type="button" disabled={busy} onClick={() => setConfirming(person.id)} className="min-h-12 rounded-md border-2 border-danger px-4 text-sm font-semibold text-danger disabled:opacity-60">
                    Remove
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
