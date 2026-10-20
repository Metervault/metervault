"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { TeamMember } from "@/server/office/load";

const input = "mt-1 min-h-12 w-full rounded-md border border-line bg-canvas px-3 text-base font-normal";

export function WorkOrderForm({ team }: { team: TeamMember[] }) {
  const router = useRouter();
  const [street, setStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [town, setTown] = useState("");
  const [oldMeterNumber, setOldMeterNumber] = useState("");
  const [connectionNumber, setConnectionNumber] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const response = await fetch("/api/office/work-orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ street, houseNumber, town, oldMeterNumber, connectionNumber, assignedTo }),
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    setPending(false);
    if (!response.ok) {
      setError(body?.error ?? "Could not add the work order.");
      return;
    }
    setStreet("");
    setHouseNumber("");
    setTown("");
    setOldMeterNumber("");
    setConnectionNumber("");
    setAssignedTo("");
    router.refresh();
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-3 rounded-lg border border-line bg-surface p-4 shadow-sm">
      <h2 className="text-base font-semibold">Add work for the field team</h2>
      <label className="block text-sm font-semibold">
        Street
        <input value={street} onChange={(event) => setStreet(event.target.value)} required className={input} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          House number
          <input value={houseNumber} onChange={(event) => setHouseNumber(event.target.value)} className={input} />
        </label>
        <label className="block text-sm font-semibold">
          Town
          <input value={town} onChange={(event) => setTown(event.target.value)} className={input} />
        </label>
        <label className="block text-sm font-semibold">
          Old meter
          <input value={oldMeterNumber} onChange={(event) => setOldMeterNumber(event.target.value)} className={input} />
        </label>
        <label className="block text-sm font-semibold">
          Connection
          <input value={connectionNumber} onChange={(event) => setConnectionNumber(event.target.value)} className={input} />
        </label>
      </div>
      <label className="block text-sm font-semibold">
        Assign to
        <select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} className={input}>
          <option value="">Leave unassigned</option>
          {team.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </label>
      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}
      <button type="submit" disabled={pending} className="min-h-12 w-full rounded-md bg-primary text-base font-semibold text-on-primary disabled:opacity-60 sm:w-auto sm:px-6">
        {pending ? "Saving" : "Add work order"}
      </button>
    </form>
  );
}
