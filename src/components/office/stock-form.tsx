"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const input = "mt-1 min-h-12 w-full rounded-md border border-line bg-canvas px-3 text-base font-normal";

export function StockForm() {
  const router = useRouter();
  const [kind, setKind] = useState<"meter" | "smart_device">("meter");
  const [serial, setSerial] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const response = await fetch("/api/office/stock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, serial }),
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    setPending(false);
    if (!response.ok) {
      setError(body?.error ?? "Could not add that item.");
      return;
    }
    setSerial("");
    router.refresh();
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-3 rounded-lg border border-line bg-surface p-4 shadow-sm">
      <h2 className="text-base font-semibold">Add a meter or smart device</h2>
      <label className="block text-sm font-semibold">
        Kind
        <select value={kind} onChange={(event) => setKind(event.target.value === "smart_device" ? "smart_device" : "meter")} className={input}>
          <option value="meter">Meter</option>
          <option value="smart_device">Smart device</option>
        </select>
      </label>
      <label className="block text-sm font-semibold">
        Serial
        <input value={serial} onChange={(event) => setSerial(event.target.value)} required className={input} />
      </label>
      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}
      <button type="submit" disabled={pending} className="min-h-12 w-full rounded-md bg-primary text-base font-semibold text-on-primary disabled:opacity-60 sm:w-auto sm:px-6">
        {pending ? "Saving" : "Add to stock"}
      </button>
    </form>
  );
}
