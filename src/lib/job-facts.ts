import { statusLabel } from "@/components/office/status-pill";

const ZONE = "Africa/Johannesburg";

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

const photoLabels: Record<string, string> = {
  meter_number: "Meter number",
  new_meter: "New meter",
  old_meter: "Old meter",
  water_point: "Water point",
  ciu_card: "CIU and card",
  other: "Other",
};

export type JobFactSource = {
  status: string;
  installer: string | null;
  jobDate: string | null;
  responseCode: string | null;
  submittedOn: Date | null;
  companyName: string | null;
  cardNumber: string | null;
  jobNumber: string | null;
  houseNumber: string | null;
  street: string | null;
  unitNumber: string | null;
  lotNumber: string | null;
  town: string | null;
  installation: string | null;
  premise: string | null;
  faults: string[];
  otherReason: string | null;
  newMeterNumber: string | null;
  meterSize: string | null;
  meterClass: string | null;
  meterType: string | null;
  smartDeviceNumber: string | null;
  smartDeviceReading: number | null;
  oldMeterNumber: string | null;
  oldMeterNotOnList: boolean;
  oldMeterListNote: string | null;
  oldMeterReading: number | null;
  connectionNumber: string | null;
  connectionNotOnList: boolean;
  connectionListNote: string | null;
  accountNumber: string | null;
  rejectionMessage: string | null;
  rejectionCount: number;
};

export type JobPhotoFact = {
  type: string;
  capturedAt: Date | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
};

export function shown(value: string | number | null | undefined) {
  if (value == null) return "—";
  const text = String(value).trim();
  return text ? text : "—";
}

export function formatJobWhen(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function jobHeading(job: Pick<JobFactSource, "houseNumber" | "street" | "town" | "newMeterNumber">) {
  return [job.houseNumber, job.street].filter(Boolean).join(" ") || job.town || job.newMeterNumber || "Capture";
}

export function photoLabel(type: string) {
  return photoLabels[type] ?? type;
}

export function photoCaption(photo: JobPhotoFact) {
  const when = photo.capturedAt ? formatJobWhen(photo.capturedAt) : "time not recorded";
  const place =
    photo.latitude != null && photo.longitude != null
      ? `${photo.latitude.toFixed(5)}, ${photo.longitude.toFixed(5)}${photo.accuracy != null ? ` (±${Math.round(photo.accuracy)} m)` : ""}`
      : "no location";
  return `${photoLabel(photo.type)} · ${when} · ${place}`;
}

function named(value: string | null, labels: Record<string, string>) {
  if (!value) return "—";
  return labels[value] ?? value;
}

function times(count: number) {
  return `${count} ${count === 1 ? "time" : "times"}`;
}

export function decisionSummary(job: Pick<JobFactSource, "status" | "rejectionCount" | "rejectionMessage">) {
  const note = job.rejectionMessage?.trim() ?? "";
  if (job.status === "approved") {
    return job.rejectionCount > 0 ? `Accepted after being sent back ${times(job.rejectionCount)}.` : "Accepted on the first review.";
  }
  if (job.status === "rejected") {
    return `Rejected. ${note || "No reason was written."}`;
  }
  if (job.status === "submitted" || job.status === "in_review" || job.status === "resubmitted") {
    const prior = job.rejectionCount > 0 ? ` Sent back ${times(job.rejectionCount)}.` : "";
    const last = note ? ` Last note: ${note}` : "";
    return `Waiting for review.${prior}${last}`;
  }
  if (job.status === "draft") return "This capture is still a draft.";
  return statusLabel(job.status);
}

export function jobSections(job: JobFactSource) {
  return [
    {
      title: "Decision",
      rows: [
        { label: "Status", value: statusLabel(job.status) },
        { label: "Outcome", value: decisionSummary(job) },
        { label: "Response", value: shown(job.responseCode) },
        { label: "Submitted", value: formatJobWhen(job.submittedOn) },
        { label: "Sent back", value: job.rejectionCount > 0 ? times(job.rejectionCount) : "Never" },
        { label: "Reason given", value: shown(job.rejectionMessage) },
      ],
    },
    {
      title: "Job",
      rows: [
        { label: "Installer", value: shown(job.installer) },
        { label: "Date", value: shown(job.jobDate) },
        { label: "Company", value: shown(job.companyName) },
        { label: "Job number", value: shown(job.jobNumber) },
        { label: "Card number", value: shown(job.cardNumber) },
        { label: "Installation", value: named(job.installation, installationLabel) },
        { label: "Premise", value: named(job.premise, premiseLabel) },
      ],
    },
    {
      title: "Address",
      rows: [
        { label: "House", value: shown(job.houseNumber) },
        { label: "Street", value: shown(job.street) },
        { label: "Unit", value: shown(job.unitNumber) },
        { label: "Lot", value: shown(job.lotNumber) },
        { label: "Town", value: shown(job.town) },
      ],
    },
    {
      title: "Reason",
      rows: [
        { label: "Faults", value: job.faults.length > 0 ? job.faults.map((code) => faultLabel[code] ?? code).join(", ") : "None ticked" },
        { label: "Other", value: shown(job.otherReason) },
      ],
    },
    {
      title: "Meters",
      rows: [
        { label: "New meter", value: shown(job.newMeterNumber) },
        { label: "Size", value: shown(job.meterSize) },
        { label: "Class", value: shown(job.meterClass) },
        { label: "Type", value: shown(job.meterType) },
        { label: "Smart device", value: shown(job.smartDeviceNumber) },
        { label: "Device reading", value: shown(job.smartDeviceReading) },
        { label: "Old meter", value: shown(job.oldMeterNumber) },
        { label: "Old reading", value: shown(job.oldMeterReading) },
        { label: "Old meter list", value: job.oldMeterNotOnList ? "Not on the list" : "On the list" },
        { label: "Old meter note", value: shown(job.oldMeterListNote) },
        { label: "Connection", value: shown(job.connectionNumber) },
        { label: "Connection list", value: job.connectionNotOnList ? "Not on the list" : "On the list" },
        { label: "Connection note", value: shown(job.connectionListNote) },
        { label: "Account", value: shown(job.accountNumber) },
      ],
    },
  ];
}
