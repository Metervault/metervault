"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusPill } from "@/components/office/status-pill";
import type { ReviewCapture } from "@/server/office/load";

const installationLabel: Record<string, string> = {
  meter_only: "Meter only",
  white_and_blue_box: "Meter with white and blue box",
  non_straight: "Non-straight",
};

const premiseLabel: Record<string, string> = {
  business: "Business",
  domestic: "Domestic",
};

const faultLabel: Record<string, string> = {
  rm: "Meter stopped (RM)",
  rp: "Dial damaged (RP)",
  rn: "Meter damaged (RN)",
  rc: "Meter moving backwards (RC)",
  ro: "Meter leak (RO)",
  rv: "Meter test (RV)",
};

const catalogLabel: Record<string, string> = {
  "15mm": "15mm",
  class_d: "Class D",
  ultrasonic: "Ultrasonic",
};

const photoLabel: Record<string, string> = {
  meter_number: "Meter number",
  new_meter: "New meter",
  old_meter: "Old meter",
  water_point: "Water point",
  ciu_card: "CIU and card",
  other: "Other",
};

function shown(value: string | number | null | undefined) {
  if (value == null) return "—";
  const text = String(value).trim();
  return text ? text : "—";
}

function named(value: string | null, labels: Record<string, string>) {
  if (!value) return "—";
  return labels[value] ?? value;
}

function Facts({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return (
    <section className="mt-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <dl className="mt-2 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[9.5rem_1fr] gap-3 text-sm">
            <dt className="text-muted">{row.label}</dt>
            <dd className="font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ReviewQueue({ jobs }: { jobs: ReviewCapture[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function decide(jobId: string, decision: "approved" | "rejected") {
    setPending(jobId);
    setError("");
    const response = await fetch("/api/office/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId, decision, message: decision === "rejected" ? message : "" }),
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    setPending(null);
    if (!response.ok) {
      setError(body?.error ?? "Could not save the decision.");
      return;
    }
    setRejecting(null);
    setMessage("");
    router.refresh();
  }

  if (jobs.length === 0) {
    return <p className="rounded-lg border border-line bg-surface px-4 py-6 text-sm text-muted">No captures are waiting.</p>;
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}
      <ul className="space-y-4">
        {jobs.map((job) => {
          const title = [job.houseNumber, job.street].filter(Boolean).join(" ") || job.town || job.newMeterNumber || "Capture";
          const busy = pending === job.id;
          const flags = [
            job.oldMeterNotOnList ? "Old meter was not on the list" : "",
            job.oldMeterListNote ? `Old meter note: ${job.oldMeterListNote}` : "",
            job.connectionNotOnList ? "Connection was not on the list" : "",
            job.connectionListNote ? `Connection note: ${job.connectionListNote}` : "",
          ].filter(Boolean);
          return (
            <li key={job.id} className="rounded-lg border border-line bg-surface p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold">{title}</p>
                  <p className="mt-1 text-sm text-muted">{[job.town, job.installer, job.jobDate].filter(Boolean).join(" · ") || "Waiting for review"}</p>
                </div>
                <StatusPill value={job.status} />
              </div>
              {job.rejectionCount > 0 ? (
                <p className="mt-3 text-sm text-danger">
                  Sent back {job.rejectionCount} {job.rejectionCount === 1 ? "time" : "times"}
                  {job.rejectionMessage ? `: ${job.rejectionMessage}` : "."}
                </p>
              ) : null}
              <Facts
                title="Job"
                rows={[
                  { label: "Installer", value: shown(job.installer) },
                  { label: "Date", value: shown(job.jobDate) },
                  { label: "Company", value: shown(job.companyName) },
                  { label: "Job number", value: shown(job.jobNumber) },
                  { label: "Card number", value: shown(job.cardNumber) },
                  { label: "Installation", value: named(job.installation, installationLabel) },
                  { label: "Premise", value: named(job.premise, premiseLabel) },
                ]}
              />
              <Facts
                title="Address"
                rows={[
                  { label: "House", value: shown(job.houseNumber) },
                  { label: "Street", value: shown(job.street) },
                  { label: "Unit", value: shown(job.unitNumber) },
                  { label: "Lot", value: shown(job.lotNumber) },
                  { label: "Town", value: shown(job.town) },
                ]}
              />
              <Facts
                title="Reason"
                rows={[
                  { label: "Faults", value: job.faults.length > 0 ? job.faults.map((code) => faultLabel[code] ?? code).join(", ") : "None ticked" },
                  { label: "Other", value: shown(job.otherReason) },
                ]}
              />
              <Facts
                title="Meters"
                rows={[
                  { label: "New meter", value: shown(job.newMeterNumber) },
                  { label: "Size", value: named(job.meterSize, catalogLabel) },
                  { label: "Class", value: named(job.meterClass, catalogLabel) },
                  { label: "Type", value: named(job.meterType, catalogLabel) },
                  { label: "Smart device", value: shown(job.smartDeviceNumber) },
                  { label: "Device reading", value: shown(job.smartDeviceReading) },
                  { label: "Old meter", value: shown(job.oldMeterNumber) },
                  { label: "Old reading", value: shown(job.oldMeterReading) },
                  { label: "Connection", value: shown(job.connectionNumber) },
                  { label: "Account", value: shown(job.accountNumber) },
                ]}
              />
              {flags.length > 0 ? <p className="mt-3 text-sm font-medium">{flags.join(". ")}</p> : null}
              <section className="mt-4">
                <h3 className="text-sm font-semibold">Photos</h3>
                {job.photos.length === 0 ? (
                  <p className="mt-2 text-sm text-muted">No photos on this capture.</p>
                ) : (
                  <ul className="mt-2 space-y-3">
                    {job.photos.map((photo) => (
                      <li key={photo.id}>
                        <p className="text-sm text-muted">{photoLabel[photo.type] ?? photo.type}</p>
                        <a href={`/api/office/photos/${photo.id}`} target="_blank" rel="noreferrer" className="mt-1 block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/api/office/photos/${photo.id}`} alt={photoLabel[photo.type] ?? "Capture photo"} className="max-h-72 w-full rounded-md bg-canvas object-contain" />
                        </a>
                        {photo.latitude != null && photo.longitude != null ? (
                          <a
                            className="mt-1 inline-flex text-sm font-semibold text-brand"
                            href={`https://www.openstreetmap.org/?mlat=${photo.latitude}&mlon=${photo.longitude}#map=17/${photo.latitude}/${photo.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {photo.latitude.toFixed(5)}, {photo.longitude.toFixed(5)}
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              {rejecting === job.id ? (
                <label className="mt-4 block text-sm font-semibold">
                  Reason for rejection
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={3}
                    className="mt-1 min-h-20 w-full rounded-md border border-line bg-canvas px-3 py-2 text-base font-normal"
                  />
                </label>
              ) : null}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void decide(job.id, "approved")}
                  className="min-h-12 rounded-md bg-primary text-base font-semibold text-on-primary disabled:opacity-60"
                >
                  {busy ? "Saving" : "Approve"}
                </button>
                {rejecting === job.id ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void decide(job.id, "rejected")}
                    className="min-h-12 rounded-md bg-danger text-base font-semibold text-white disabled:opacity-60"
                  >
                    {busy ? "Saving" : "Confirm reject"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setRejecting(job.id);
                      setMessage("");
                    }}
                    className="min-h-12 rounded-md border-2 border-danger text-base font-semibold text-danger disabled:opacity-60"
                  >
                    Reject
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
