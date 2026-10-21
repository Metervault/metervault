"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusPill } from "@/components/office/status-pill";
import { fieldDb } from "@/lib/field/db";
import { createDraft } from "@/lib/field/drafts";

type FieldWork = {
  id: string;
  status: string;
  town: string | null;
  street: string | null;
  houseNumber: string | null;
  oldMeterNumber: string | null;
  connectionNumber: string | null;
};

export function WorkList({ orders }: { orders: FieldWork[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function start(order: FieldWork) {
    setPending(order.id);
    setError("");
    const response = await fetch("/api/field/work-orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: order.id }),
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setPending(null);
      setError(body?.error ?? "Could not start that job.");
      return;
    }
    const drafts = await fieldDb.drafts.toArray();
    const existing = drafts.find((draft) => draft.lifecycle === "draft" && draft.answers.workOrderId === order.id);
    const draft =
      existing ??
      (await createDraft({
        workOrderId: order.id,
        houseNumber: order.houseNumber ?? "",
        street: order.street ?? "",
        townId: order.town ?? "",
        oldMeterNumber: order.oldMeterNumber ?? "",
        connectionNumber: order.connectionNumber ?? "",
      }));
    router.push(`/field/capture?draft=${draft.id}`);
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}
      <ul className="space-y-3">
        {orders.map((order) => {
          const closed = order.status === "completed" || order.status === "exception";
          return (
            <li key={order.id} className="rounded-lg border border-line bg-surface p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold">{[order.houseNumber, order.street].filter(Boolean).join(" ") || "Address not set"}</p>
                  <p className="mt-1 text-sm text-muted">{[order.town, order.connectionNumber].filter(Boolean).join(" · ") || "No connection number"}</p>
                </div>
                <StatusPill value={order.status} />
              </div>
              {closed ? null : (
                <button
                  type="button"
                  disabled={pending === order.id}
                  onClick={() => void start(order)}
                  className="mt-3 min-h-12 w-full rounded-md bg-primary text-base font-semibold text-on-primary disabled:opacity-60"
                >
                  {pending === order.id ? "Opening" : "Start capture"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
