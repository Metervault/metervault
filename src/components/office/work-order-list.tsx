"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusPill } from "@/components/office/status-pill";
import type { TeamMember } from "@/server/office/load";

const input = "mt-1 min-h-12 w-full rounded-md border border-line bg-canvas px-3 text-base font-normal";

type WorkOrder = {
  id: string;
  status: string;
  town: string | null;
  street: string | null;
  houseNumber: string | null;
  oldMeterNumber: string | null;
  connectionNumber: string | null;
  assignedTo: string | null;
  assignee: string | null;
};

function shown(value: string | null) {
  return value && value.trim() ? value : "";
}

export function WorkOrderList({ orders, team }: { orders: WorkOrder[]; team: TeamMember[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [assignees, setAssignees] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function save(id: string, action: "assign" | "complete" | "exception" | "reopen", assignedTo = "") {
    setPending(`${id}:${action}`);
    setError("");
    const response = await fetch("/api/office/work-orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, action, assignedTo }),
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    setPending(null);
    if (!response.ok) {
      setError(body?.error ?? "Could not update that work order.");
      return;
    }
    router.refresh();
  }

  if (orders.length === 0) {
    return <p className="rounded-lg border border-line bg-surface px-4 py-6 text-sm text-muted">No work orders yet.</p>;
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}
      <ul className="space-y-3">
        {orders.map((order) => {
          const closed = order.status === "completed" || order.status === "exception";
          const address = [order.houseNumber, order.street].filter(Boolean).join(" ") || "Address not set";
          const assignee = assignees[order.id] ?? order.assignedTo ?? "";
          const busy = pending?.startsWith(`${order.id}:`) ?? false;
          return (
            <li key={order.id} className="rounded-lg border border-line bg-surface p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold">{address}</p>
                  <p className="mt-1 text-sm text-muted">
                    {[shown(order.town), shown(order.oldMeterNumber) ? `Old meter ${order.oldMeterNumber}` : "", shown(order.connectionNumber) ? `Connection ${order.connectionNumber}` : "", order.assignee ? `Assigned to ${order.assignee}` : "Unassigned"]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <StatusPill value={order.status} />
              </div>
              {closed ? null : (
                <label className="mt-3 block text-sm font-semibold">
                  Assign to
                  <select value={assignee} onChange={(event) => setAssignees((current) => ({ ...current, [order.id]: event.target.value }))} className={input}>
                    <option value="">Leave unassigned</option>
                    {team.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {closed ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void save(order.id, "reopen")}
                    className="min-h-12 rounded-md border-2 border-primary px-4 text-sm font-semibold text-brand disabled:opacity-60"
                  >
                    {pending === `${order.id}:reopen` ? "Saving" : "Reopen"}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={busy || assignee === (order.assignedTo ?? "")}
                      onClick={() => void save(order.id, "assign", assignee)}
                      className="min-h-12 rounded-md border-2 border-primary px-4 text-sm font-semibold text-brand disabled:opacity-60"
                    >
                      {pending === `${order.id}:assign` ? "Saving" : "Save assignment"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void save(order.id, "complete")}
                      className="min-h-12 rounded-md bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-60"
                    >
                      {pending === `${order.id}:complete` ? "Saving" : "Mark completed"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void save(order.id, "exception")}
                      className="min-h-12 rounded-md border-2 border-danger px-4 text-sm font-semibold text-danger disabled:opacity-60"
                    >
                      {pending === `${order.id}:exception` ? "Saving" : "Mark exception"}
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
