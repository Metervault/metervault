"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusPill } from "@/components/office/status-pill";
import type { TeamMember } from "@/server/office/load";

const input = "mt-1 min-h-12 w-full rounded-md border border-line bg-canvas px-3 text-base font-normal";

type StockItem = {
  id: string;
  kind: string;
  serial: string;
  status: string;
  holder: string | null;
};

export function StockList({ items, team }: { items: StockItem[]; team: TeamMember[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [holders, setHolders] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function save(id: string, status: "in_stock" | "issued" | "installed", issuedTo = "") {
    setPending(id);
    setError("");
    const response = await fetch("/api/office/stock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status, issuedTo }),
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    setPending(null);
    if (!response.ok) {
      setError(body?.error ?? "Could not update that item.");
      return;
    }
    router.refresh();
  }

  if (items.length === 0) {
    return <p className="rounded-lg border border-line bg-surface px-4 py-6 text-sm text-muted">No meters or smart devices are in stock.</p>;
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}
      <ul className="space-y-3">
        {items.map((item) => {
          const busy = pending === item.id;
          const out = item.status === "installed";
          const holder = holders[item.id] ?? "";
          return (
            <li key={item.id} className="rounded-lg border border-line bg-surface p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold">{item.serial}</p>
                  <p className="mt-1 text-sm text-muted">
                    {item.kind === "smart_device" ? "Smart device" : "Meter"}
                    {item.holder ? ` · With ${item.holder}` : ""}
                  </p>
                </div>
                <StatusPill value={item.status} />
              </div>
              {out ? <p className="mt-3 text-sm text-muted">Out of inventory.</p> : null}
              {item.status === "in_stock" || item.status === "returned" ? (
                <label className="mt-3 block text-sm font-semibold">
                  Issue to
                  <select value={holder} onChange={(event) => setHolders((current) => ({ ...current, [item.id]: event.target.value }))} className={input}>
                    <option value="">Choose a person</option>
                    {team.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                {item.status === "in_stock" || item.status === "returned" ? (
                  <button
                    type="button"
                    disabled={busy || !holder}
                    onClick={() => void save(item.id, "issued", holder)}
                    className="min-h-12 rounded-md border-2 border-primary px-4 text-sm font-semibold text-brand disabled:opacity-60"
                  >
                    {busy ? "Saving" : "Issue"}
                  </button>
                ) : null}
                {out ? null : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void save(item.id, "installed")}
                    className="min-h-12 rounded-md bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-60"
                  >
                    {busy ? "Saving" : "Mark as gone out"}
                  </button>
                )}
                {item.status === "in_stock" ? null : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void save(item.id, "in_stock")}
                    className="min-h-12 rounded-md border-2 border-line px-4 text-sm font-semibold disabled:opacity-60"
                  >
                    {busy ? "Saving" : "Return to stock"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
