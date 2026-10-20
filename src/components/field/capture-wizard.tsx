"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { METER_CHANGE_V1 } from "@/domain/forms/meter-change-v1";
import { blockingIssues, validateForm } from "@/domain/forms/validate";
import type { Answers, FormField } from "@/domain/forms/types";
import { AppLoading } from "@/components/brand/app-loading";
import { BarcodeScanner } from "@/components/field/barcode-scanner";
import { catalogOptions, installerOptions } from "@/lib/field/contract";
import { fieldDb, subscribeField, type DraftRecord, type PhotoRecord } from "@/lib/field/db";
import { answersWithPhotos, createDraft, lastAddress, saveAnswers } from "@/lib/field/drafts";
import { addPhoto, removePhoto } from "@/lib/field/photos";
import { enqueueSubmit } from "@/lib/field/sync";

let pendingDraft: Promise<string> | null = null;

const STEPS = [
  { id: "job", title: "Job" },
  { id: "address", title: "Address" },
  { id: "reason", title: "Reason" },
  { id: "meter", title: "Meter" },
  { id: "photos", title: "Photos" },
  { id: "review", title: "Review" },
] as const;

const SCAN_FIELDS = new Set(["newMeterNumber", "smartDeviceNumber"]);

function maskValue(id: string, value: string) {
  if (id === "newMeterNumber" || id === "oldMeterNumber" || id === "connectionNumber") return value.toUpperCase();
  if (id === "smartDeviceNumber") return value.replace(/\D/g, "").slice(0, 11);
  if (id === "smartDeviceReading" || id === "oldMeterReading") return value.replace(/[^\d-]/g, "");
  return value;
}

function stepIndexForField(fieldId: string) {
  const section = METER_CHANGE_V1.sections.find((item) => item.fields.some((field) => field.id === fieldId));
  if (!section || section.id === "signoff") return STEPS.findIndex((item) => item.id === "review");
  const index = STEPS.findIndex((item) => item.id === section.id);
  return index === -1 ? STEPS.length - 1 : index;
}

export function CaptureWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const draftId = params.get("draft");
  const [draft, setDraft] = useState<DraftRecord | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [step, setStep] = useState(0);
  const [scanField, setScanField] = useState<string | null>(null);
  const [townQuery, setTownQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [focusFieldId, setFocusFieldId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showWait, setShowWait] = useState(false);
  const ready = useRef(false);
  const holdSave = useRef(false);
  const lastSaved = useRef("");

  useEffect(() => {
    let cancelled = false;
    async function open() {
      ready.current = false;
      const existing = draftId ? await fieldDb.drafts.get(draftId) : undefined;
      if (existing) {
        if (cancelled) return;
        lastSaved.current = JSON.stringify(existing.answers);
        setDraft(existing);
        setAnswers(existing.answers);
        setTownQuery(typeof existing.answers.townId === "string" ? existing.answers.townId : "");
        ready.current = true;
        return;
      }
      const latest = (await fieldDb.drafts.orderBy("updatedAt").reverse().toArray()).find((item) => item.lifecycle === "draft");
      if (!draftId && latest) {
        router.replace(`/field/capture?draft=${latest.id}`);
        return;
      }
      if (!pendingDraft) pendingDraft = createDraft().then((created) => created.id);
      const id = await pendingDraft;
      pendingDraft = null;
      if (!cancelled) router.replace(`/field/capture?draft=${id}`);
    }
    void open();
    return () => {
      cancelled = true;
    };
  }, [draftId, router]);

  useEffect(() => {
    if (!draftId) return;
    const load = () => {
      void fieldDb.drafts.get(draftId).then((row) => {
        if (!row) return;
        setDraft(row);
        void fieldDb.photos.where("draftId").equals(draftId).toArray().then(setPhotos);
      });
    };
    load();
    return subscribeField(load);
  }, [draftId]);

  useEffect(() => {
    if (!draft || !ready.current || holdSave.current) return;
    const serial = JSON.stringify(answers);
    if (serial === lastSaved.current) return;
    lastSaved.current = serial;
    const timer = window.setTimeout(() => void saveAnswers(draft.id, answers), 300);
    return () => window.clearTimeout(timer);
  }, [answers, draft]);

  const section = METER_CHANGE_V1.sections.find((item) => item.id === (STEPS[step].id === "review" ? "signoff" : STEPS[step].id));
  const reviewAnswers = useMemo(() => {
    if (!draft) return answers;
    const merged = { ...answers };
    for (const field of METER_CHANGE_V1.sections.flatMap((item) => item.fields)) {
      if (field.type !== "photo") continue;
      const mine = photos.filter((photo) => photo.fieldId === field.id);
      if (field.multiple) merged[field.id] = mine.map((photo) => photo.id);
      else if (mine[0]) merged[field.id] = mine[0].id;
    }
    return merged;
  }, [answers, draft, photos]);
  const issues = useMemo(() => validateForm(METER_CHANGE_V1, reviewAnswers, "submit"), [reviewAnswers]);
  const missing = blockingIssues(issues);
  const reviewStep = STEPS.findIndex((item) => item.id === "review");
  const jumpedFromReview = focusFieldId != null && step !== reviewStep;

  useEffect(() => {
    if (!focusFieldId) return;
    const node = document.getElementById(focusFieldId);
    if (!node) return;
    node.scrollIntoView({ block: "center" });
    if (node instanceof HTMLInputElement || node instanceof HTMLSelectElement || node instanceof HTMLTextAreaElement) node.focus();
  }, [focusFieldId, step]);

  function setField(id: string, value: unknown) {
    setAnswers((current) => {
      const next = { ...current };
      if (value === "" || value == null) delete next[id];
      else next[id] = value;
      return next;
    });
  }

  async function repeatAddress() {
    if (!draft) return;
    const copy = await lastAddress(draft.id);
    if (!copy) {
      setNotice("No earlier address on this phone yet.");
      return;
    }
    setAnswers((current) => ({ ...current, ...copy }));
    setTownQuery(typeof copy.townId === "string" ? copy.townId : "");
    setNotice("Address copied from the previous job.");
  }

  function openMissing(fieldId: string) {
    if (draft) {
      const serial = JSON.stringify(answers);
      if (serial !== lastSaved.current) {
        lastSaved.current = serial;
        void saveAnswers(draft.id, answers);
      }
    }
    setNotice("Saved on this phone.");
    setFocusFieldId(fieldId);
    setStep(stepIndexForField(fieldId));
  }

  function returnToReview() {
    setFocusFieldId(null);
    setStep(reviewStep);
  }

  async function submit() {
    if (!draft || missing.length > 0 || submitting) return;
    setSubmitting(true);
    const timer = window.setTimeout(() => setShowWait(true), 400);
    holdSave.current = true;
    try {
      const withPhotos = await answersWithPhotos({ ...draft, answers }, photos);
      await saveAnswers(draft.id, withPhotos);
      const failure = await enqueueSubmit(draft.id);
      const fresh = await fieldDb.drafts.get(draft.id);
      if (fresh) setDraft(fresh);
      if (!navigator.onLine) setNotice("Submitted on this phone. It will send when you are back online.");
      else if (failure) setNotice(failure);
      else setNotice(fresh?.syncState === "synced" ? "Submitted." : "Submitted. Sending now.");
    } finally {
      window.clearTimeout(timer);
      holdSave.current = false;
      setSubmitting(false);
      setShowWait(false);
    }
  }

  if (!draft || !section) return <AppLoading label="Opening this job" />;

  return (
    <div className="space-y-4 pb-8">
      <p className="text-sm font-semibold text-muted">
        Step {step + 1} of {STEPS.length}
      </p>
      <ol className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Capture steps">
        {STEPS.map((item, index) => (
          <li key={item.id} className="shrink-0">
            <button
              type="button"
              onClick={() => {
                if (STEPS[index].id === "review") setFocusFieldId(null);
                setStep(index);
              }}
              aria-current={index === step ? "step" : undefined}
              className={`min-h-11 rounded-full px-4 text-sm font-semibold ${index === step ? "bg-primary text-on-primary" : "bg-surface text-muted"}`}
            >
              {item.title}
            </button>
          </li>
        ))}
      </ol>
      <h1 className="text-xl font-bold">{STEPS[step].title}</h1>
      {notice ? <p className="text-sm text-brand">{notice}</p> : null}

      {STEPS[step].id === "address" ? (
        <button type="button" onClick={() => void repeatAddress()} className="min-h-12 w-full rounded-md border-2 border-brand text-sm font-semibold text-brand">
          Repeat last address
        </button>
      ) : null}

      {STEPS[step].id === "review" ? (
        <>
          {section.fields.map((field) => (
            <FieldControl
              key={field.id}
              field={field}
              answers={answers}
              photos={photos.filter((photo) => photo.fieldId === field.id)}
              frozen={draft.lifecycle === "queued" && draft.syncState !== "failed"}
              marked={focusFieldId === field.id}
              warning={issues.find((issue) => issue.fieldId === field.id && issue.severity === "warn")?.message}
              townQuery={townQuery}
              onTownQuery={setTownQuery}
              onScan={() => setScanField(field.id)}
              onChange={setField}
              onPhoto={(file) => void addPhoto(draft.id, field.id, file, Boolean(field.multiple))}
              onRemovePhoto={(id) => void removePhoto(id)}
            />
          ))}
          <Review answers={reviewAnswers} photos={photos} missing={missing} warnings={issues.filter((issue) => issue.severity === "warn")} syncState={draft.syncState} onOpen={openMissing} />
        </>
      ) : (
        <div className="space-y-4">
          {section.fields.map((field) => (
            <FieldControl
              key={field.id}
              field={field}
              answers={answers}
              photos={photos.filter((photo) => photo.fieldId === field.id)}
              frozen={draft.lifecycle === "queued" && draft.syncState !== "failed"}
              marked={focusFieldId === field.id}
              warning={issues.find((issue) => issue.fieldId === field.id && issue.severity === "warn")?.message}
              townQuery={townQuery}
              onTownQuery={setTownQuery}
              onScan={() => setScanField(field.id)}
              onChange={setField}
              onPhoto={(file) => void addPhoto(draft.id, field.id, file, Boolean(field.multiple))}
              onRemovePhoto={(id) => void removePhoto(id)}
            />
          ))}
        </div>
      )}

      {jumpedFromReview ? (
        <button
          type="button"
          disabled={submitting || (missing.length === 0 && (draft.lifecycle === "queued" && draft.syncState !== "failed"))}
          onClick={() => (missing.length === 0 ? void submit() : returnToReview())}
          className="min-h-12 w-full rounded-md bg-primary text-base font-semibold text-on-primary disabled:opacity-40"
        >
          {missing.length === 0 ? "Submit" : "See what's left"}
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={step === 0} onClick={() => setStep((value) => value - 1)} className="min-h-12 rounded-md border border-line text-sm font-semibold disabled:opacity-40">
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={() => setStep((value) => value + 1)} className="min-h-12 rounded-md bg-primary text-base font-semibold text-on-primary">
              Next
            </button>
          ) : (
            <button type="button" disabled={submitting || missing.length > 0 || (draft.lifecycle === "queued" && draft.syncState !== "failed")} onClick={() => void submit()} className="min-h-12 rounded-md bg-primary text-base font-semibold text-on-primary disabled:opacity-40">
              Submit
            </button>
          )}
        </div>
      )}
      {showWait ? (
        <div className="fixed inset-0 z-50 bg-canvas">
          <AppLoading full label="Submitting this job" />
        </div>
      ) : null}
      {scanField ? (
        <BarcodeScanner
          onClose={() => setScanField(null)}
          onResult={(value) => {
            setField(scanField, maskValue(scanField, value));
            setScanField(null);
          }}
        />
      ) : null}
    </div>
  );
}

function FieldControl({
  field,
  answers,
  photos,
  warning,
  frozen,
  marked = false,
  townQuery,
  onTownQuery,
  onScan,
  onChange,
  onPhoto,
  onRemovePhoto,
}: {
  field: FormField;
  answers: Answers;
  photos: PhotoRecord[];
  warning?: string;
  frozen: boolean;
  marked?: boolean;
  townQuery: string;
  onTownQuery: (value: string) => void;
  onScan: () => void;
  onChange: (id: string, value: unknown) => void;
  onPhoto: (file: File) => void;
  onRemovePhoto: (id: string) => void;
}) {
  const value = answers[field.id];
  const inputClass = "field-target min-h-12 w-full rounded-md border border-line bg-surface px-3 text-base";
  const mark = marked ? " ring-2 ring-danger" : "";

  if (field.type === "photo") {
    return (
      <div id={field.id} className={`space-y-2 rounded-lg border border-line bg-surface p-3${mark}`}>
        <p className="text-sm font-semibold">{field.label}{field.required ? "" : " (optional)"}</p>
        <label className={`inline-flex min-h-12 w-full items-center justify-center rounded-md bg-primary text-sm font-semibold text-on-primary ${frozen ? "pointer-events-none opacity-40" : ""}`}>
          {photos.length > 0 && !field.multiple ? "Retake photo" : "Take photo"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onPhoto(file);
            }}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {photos.map((photo) => (
            <PhotoThumb key={photo.id} photo={photo} onRemove={() => onRemovePhoto(photo.id)} />
          ))}
        </div>
      </div>
    );
  }

  if (field.type === "boolean") {
    const checked = value === true;
    return (
      <label className={`flex min-h-12 items-center gap-3 rounded-md border border-line bg-surface px-3 text-sm font-semibold${mark}`}>
        <input id={field.id} type="checkbox" className="h-6 w-6" checked={checked} disabled={frozen} onChange={(event) => onChange(field.id, event.target.checked)} />
        {field.label}
      </label>
    );
  }

  if (field.type === "town") {
    return (
      <div className={`space-y-1 rounded-md${mark}`}>
        <label className="text-sm font-semibold" htmlFor={field.id}>{field.label}</label>
        <input
          id={field.id}
          value={townQuery}
          readOnly={frozen}
          onChange={(event) => {
            onTownQuery(event.target.value);
            onChange(field.id, event.target.value.trim());
          }}
          className={inputClass}
          placeholder="Town"
          autoComplete="off"
        />
      </div>
    );
  }

  if (field.type === "select" || field.type === "catalog" || field.type === "installer") {
    const options = field.type === "select" ? field.options ?? [] : field.type === "catalog" && field.catalog ? catalogOptions(field.catalog) : installerOptions();
    return (
      <label className={`block space-y-1 rounded-md text-sm font-semibold${mark}`}>
        {field.label}
          <select id={field.id} className={inputClass} value={typeof value === "string" ? value : ""} onChange={(event) => onChange(field.id, event.target.value)} disabled={field.locked || frozen}>
          <option value="">Choose</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
    );
  }

  const text = value == null ? "" : String(value);
  return (
    <div className={`space-y-1 rounded-md${mark}`}>
      <label className="text-sm font-semibold" htmlFor={field.id}>{field.label}</label>
      {field.help ? <p className="text-xs text-muted">{field.help}</p> : null}
      <div className="flex gap-2">
        <input
          id={field.id}
          value={text}
          inputMode={field.type === "integer" || field.id === "smartDeviceNumber" ? "numeric" : "text"}
          readOnly={field.locked || frozen}
          onChange={(event) => {
            const next = maskValue(field.id, event.target.value);
            if (field.type === "integer") onChange(field.id, next === "" ? "" : Number(next));
            else onChange(field.id, next);
          }}
          className={inputClass}
        />
        {SCAN_FIELDS.has(field.id) ? (
          <button type="button" onClick={onScan} disabled={frozen} className="min-h-12 shrink-0 rounded-md border-2 border-brand px-3 text-sm font-semibold text-brand disabled:opacity-40">
            Scan
          </button>
        ) : null}
      </div>
      {warning ? <p className="text-sm font-semibold text-danger">{warning}</p> : null}
    </div>
  );
}

function PhotoThumb({ photo, onRemove }: { photo: PhotoRecord; onRemove: () => void }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(photo.blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [photo.blob]);
  return (
    <div className="w-28">
      {url ? <img src={url} alt="" className="h-24 w-28 rounded-md object-cover" /> : null}
      <button type="button" onClick={onRemove} className="mt-1 min-h-12 w-full text-xs font-semibold text-danger">
        Remove
      </button>
    </div>
  );
}

function Review({
  answers,
  photos,
  missing,
  warnings,
  syncState,
  onOpen,
}: {
  answers: Answers;
  photos: PhotoRecord[];
  missing: { fieldId: string; message: string }[];
  warnings: { fieldId: string; message: string }[];
  syncState: DraftRecord["syncState"];
  onOpen: (fieldId: string) => void;
}) {
  const lines: [string, unknown][] = [
    ["Date", answers.date],
    ["Street", answers.street],
    ["Unit", answers.unitNumber],
    ["Town", answers.townId],
    ["New meter", answers.newMeterNumber],
    ["Smart device", answers.smartDeviceNumber],
    ["Reading", answers.smartDeviceReading],
    ["Old meter", answers.oldMeterNumber],
    ["Installer", answers.installerId],
  ];
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{photos.length} photo{photos.length === 1 ? "" : "s"} on this phone. Status: {syncState}.</p>
      <dl className="space-y-2 rounded-lg border border-line bg-surface p-3 text-sm">
        {lines.map(([label, value]) => (
          <div key={String(label)} className="flex justify-between gap-3">
            <dt className="text-muted">{label}</dt>
            <dd className="font-semibold">{value == null || value === "" ? "—" : String(value)}</dd>
          </div>
        ))}
      </dl>
      {missing.length > 0 ? (
        <div className="rounded-lg border border-danger bg-surface p-3">
          <p className="text-sm font-semibold">Still needed before submit</p>
          <p className="mt-1 text-sm text-muted">Tap a line to fill it. The rest stays saved on this phone.</p>
          <ul className="mt-2 space-y-2">
            {missing.map((issue) => (
              <li key={issue.fieldId}>
                <button type="button" onClick={() => onOpen(issue.fieldId)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-md border border-danger px-3 text-left text-sm font-semibold">
                  <span>{issue.message}</span>
                  <span className="shrink-0 text-brand">Open</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm font-semibold text-brand">Required fields and photos are on this phone.</p>
      )}
      {warnings.map((issue) => (
        <p key={issue.fieldId} className="text-sm font-semibold text-danger">{issue.message}</p>
      ))}
    </div>
  );
}
