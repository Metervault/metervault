import Link from "next/link";
import { StatusPill } from "@/components/office/status-pill";
import { jobHeading, jobSections, photoCaption } from "@/lib/job-facts";
import type { JobRecord } from "@/server/office/load";

const waiting = new Set(["submitted", "in_review", "resubmitted"]);

function Facts({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-4 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>
      <dl className="mt-3 space-y-2">
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

export function JobRecordView({ job }: { job: JobRecord }) {
  const heading = jobHeading(job);
  return (
    <div className="space-y-4">
      <div>
        <Link href="/office/jobs" className="text-sm font-semibold text-brand">
          Jobs
        </Link>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold leading-tight">{heading}</h1>
            <p className="mt-1 text-sm text-muted">{[job.town, job.installer, job.jobDate].filter(Boolean).join(" · ") || "Capture"}</p>
          </div>
          <StatusPill value={job.status} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={`/api/office/jobs/${job.id}/report`}
            download
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-5 text-base font-semibold text-on-primary"
          >
            Download PDF
          </a>
          {waiting.has(job.status) ? (
            <Link href="/office/review" className="inline-flex min-h-12 items-center justify-center rounded-md border-2 border-primary px-5 text-sm font-semibold text-brand">
              Review this capture
            </Link>
          ) : null}
        </div>
      </div>
      {jobSections(job).map((section) => (
        <Facts key={section.title} title={section.title} rows={section.rows} />
      ))}
      <section className="rounded-lg border border-line bg-surface p-4 shadow-sm">
        <h2 className="text-base font-semibold">Photos</h2>
        {job.photos.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No photos were attached.</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {job.photos.map((photo) => (
              <li key={photo.id}>
                <p className="text-sm text-muted">{photoCaption(photo)}</p>
                <a href={`/api/office/photos/${photo.id}`} target="_blank" rel="noreferrer" className="mt-1 block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/office/photos/${photo.id}`} alt={photoCaption(photo)} className="max-h-72 w-full rounded-md bg-canvas object-contain" />
                </a>
                {photo.latitude != null && photo.longitude != null ? (
                  <a
                    className="mt-1 inline-flex text-sm font-semibold text-brand"
                    href={`https://www.openstreetmap.org/?mlat=${photo.latitude}&mlon=${photo.longitude}#map=17/${photo.latitude}/${photo.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open location
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
