"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TeamMember } from "@/server/office/load";

export function TeamList({ people, currentUserId }: { people: TeamMember[]; currentUserId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function setRole(userId: string, orgRole: "admin" | "member") {
    setPending(userId);
    setError("");
    const response = await fetch("/api/office/team", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, orgRole }),
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    setPending(null);
    if (!response.ok) {
      setError(body?.error ?? "Could not change that role.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}
      <ul className="space-y-3">
        {people.map((person) => {
          const manager = person.orgRole === "admin";
          const self = person.id === currentUserId;
          return (
            <li key={person.id} className="rounded-lg border border-line bg-surface p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold">{person.name}</p>
                  <p className="text-sm text-muted">{person.email}</p>
                </div>
                <span className={`rounded-sm px-2 py-0.5 text-xs font-semibold ${manager ? "bg-primary/20 text-brand" : "bg-canvas text-muted"}`}>
                  {manager ? "Manager" : "Field"}
                </span>
              </div>
              {self ? (
                <p className="mt-3 text-sm text-muted">This is you.</p>
              ) : (
                <button
                  type="button"
                  disabled={pending === person.id}
                  onClick={() => void setRole(person.id, manager ? "member" : "admin")}
                  className="mt-3 min-h-12 w-full rounded-md border-2 border-primary text-sm font-semibold text-brand disabled:opacity-60 sm:w-auto sm:px-4"
                >
                  {pending === person.id ? "Saving" : manager ? "Move to field" : "Make manager"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
