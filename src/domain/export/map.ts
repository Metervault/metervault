import { blank, integerOrText, num, optionalDate, optionalNumber, optionalText, ticked, text, type ExportCell } from "./cells";
import { EXPORT_HEADERS, type ExportHeader } from "./headers";
import { FAULT_EXPORT, INSTALLATION_EXPORT, PREMISE_EXPORT, type ExportJob, type FaultCode, type PhotoEvidence } from "./job";
import { LIST_PHRASES, exportConnectionNumber, exportOldMeterNumber } from "./phrases";

function fault(job: ExportJob, code: FaultCode): ExportCell {
  return job.faults[code] ? ticked() : blank();
}

function photoUrl(photo: PhotoEvidence | null | undefined): ExportCell {
  return optionalText(photo?.url);
}

function photoTime(photo: PhotoEvidence | null | undefined): ExportCell {
  return optionalDate(photo?.answeredAt ?? null, true);
}

function photoNumber(photo: PhotoEvidence | null | undefined, key: "latitude" | "longitude" | "accuracy" | "altitude"): ExportCell {
  return optionalNumber(photo?.[key] ?? null);
}

function otherPhotos(job: ExportJob): ExportCell {
  const urls = (job.photos.other ?? []).map((photo) => photo.url?.trim() ?? "").filter((url) => url !== "");
  if (urls.length === 0) return blank();
  return text(urls.join("\n"));
}

function smartDeviceNumber(value: string | null): ExportCell {
  if (value == null || value.trim() === "") return blank();
  const trimmed = value.trim();
  if (/^\d{1,15}$/.test(trimmed)) return num(Number(trimmed));
  return text(trimmed);
}

const producers: Record<ExportHeader, (job: ExportJob) => ExportCell> = {
  Deployment: (job) => text(job.deployment),
  Enumerator: (job) => text(job.enumerator),
  Status: (job) => optionalText(job.exportedStatus),
  "Response Code": (job) => optionalText(job.responseCode),
  "Drafted On": (job) => optionalDate(job.draftedOn, true),
  "Submitted On": (job) => optionalDate(job.submittedOn, true),
  "Draft Name": (job) => optionalText(job.draftName),
  "Last Modified On": (job) => optionalDate(job.lastModifiedOn, true),
  "Last Modified By": (job) => optionalText(job.lastModifiedBy),
  "Approval Level": (job) => optionalNumber(job.approvalLevel),
  "Rejection message": (job) => optionalText(job.rejectionMessage),
  "Number of Rejections": (job) => num(job.rejectionCount),
  "Number of Edits": (job) => num(job.editCount),
  "IP Address": (job) => optionalText(job.ipAddress),
  "DATE:": (job) => optionalDate(job.jobDate, false),
  "Please select meter installation -meter only or meter with white and blue box": (job) =>
    job.installation ? text(INSTALLATION_EXPORT[job.installation]) : blank(),
  "Please select Business or Domestic": (job) => (job.premise ? text(PREMISE_EXPORT[job.premise]) : blank()),
  "COMPANY NAME:": (job) => optionalText(job.companyName),
  "CARD NUMBER:": (job) => optionalText(job.cardNumber),
  "JOB NUMBER:": (job) => optionalText(job.jobNumber),
  "HOUSE NUMBER:": (job) => integerOrText(job.houseNumber),
  "STREET:": (job) => optionalText(job.street),
  "UNIT NUMBER": (job) => integerOrText(job.unitNumber),
  "LOT NUMBER": (job) => integerOrText(job.lotNumber),
  "TOWN:": (job) => optionalText(job.town),
  "METER STOPPED (RM)": (job) => fault(job, "rm"),
  "DIAL DAMAGED (RP)": (job) => fault(job, "rp"),
  "METER DAMAGED (RN)": (job) => fault(job, "rn"),
  "METER MOVING BACKWARDS (RC)": (job) => fault(job, "rc"),
  "METER LEAK (RO)": (job) => fault(job, "ro"),
  "METER TEST (RV)": (job) => fault(job, "rv"),
  "OTHER:": (job) => optionalText(job.other),
  "NEW METER NUMBER": (job) => optionalText(job.newMeterNumber),
  "NEW METER SIZE": (job) => optionalText(job.newMeterSize),
  "NEW METER CLASS": (job) => optionalText(job.newMeterClass),
  "NEW METER TYPE": (job) => optionalText(job.newMeterType),
  "SMART DEVICE NUMBER": (job) => smartDeviceNumber(job.smartDeviceNumber),
  "SMART DEVICE READING": (job) => optionalNumber(job.smartDeviceReading),
  "OLD METER NUMBER": (job) => exportOldMeterNumber(job.oldMeterNumber, job.oldMeterNotOnList, job.listPhrases ?? LIST_PHRASES),
  "OLD METER READING": (job) => optionalNumber(job.oldMeterReading),
  "CONNECTION NUMBER (1)": () => blank(),
  "CONNECTION NUMBER (2)": (job) =>
    exportConnectionNumber(job.connectionNumber, job.connectionNotOnList, job.listPhrases ?? LIST_PHRASES),
  "CONNECTION NUMBER (Time Answered)": (job) => optionalDate(job.connectionAnsweredAt, true),
  "ACCOUNT NUMBER": (job) => optionalText(job.accountNumber),
  "PLEASE TAKE A PHOTO FO THE METER NUMBER (CODE:CZC)": (job) => photoUrl(job.photos.meterNumber),
  "PLEASE TAKE A PHOTO FO THE METER NUMBER (CODE:CZC) (Time Answered)": (job) => photoTime(job.photos.meterNumber),
  "PLEASE TAKE A PHOTO FO THE METER NUMBER (CODE:CZC) (Location Answered) (latitude)": (job) =>
    photoNumber(job.photos.meterNumber, "latitude"),
  "PLEASE TAKE A PHOTO FO THE METER NUMBER (CODE:CZC) (Location Answered) (longitude)": (job) =>
    photoNumber(job.photos.meterNumber, "longitude"),
  "PLEASE TAKE A PHOTO FO THE METER NUMBER (CODE:CZC) (Location Answered - accuracy)": (job) =>
    photoNumber(job.photos.meterNumber, "accuracy"),
  "PLEASE TAKE A PHOTO FO THE METER NUMBER (CODE:CZC) (Location Answered - altitude)": (job) =>
    photoNumber(job.photos.meterNumber, "altitude"),
  "PLEASE TAKE A PHOTO OF NEW METER": (job) => photoUrl(job.photos.newMeter),
  "PLEASE TAKE A PHOTO OF OLD METER": (job) => photoUrl(job.photos.oldMeter),
  "PLEASE TAKE A PHOTO OF THE WATER POINT": (job) => photoUrl(job.photos.waterPoint),
  "PLEASE TAKE A PHOTO OF THE WATER POINT (Time Answered)": (job) => photoTime(job.photos.waterPoint),
  "PLEASE TAKE A PHOTO OF THE WATER POINT (Location Answered) (latitude)": (job) =>
    photoNumber(job.photos.waterPoint, "latitude"),
  "PLEASE TAKE A PHOTO OF THE WATER POINT (Location Answered) (longitude)": (job) =>
    photoNumber(job.photos.waterPoint, "longitude"),
  "PLEASE TAKE A PHOTO OF THE WATER POINT (Location Answered - accuracy)": (job) =>
    photoNumber(job.photos.waterPoint, "accuracy"),
  "PLEASE TAKE A PHOTO OF THE WATER POINT (Location Answered - altitude)": (job) =>
    photoNumber(job.photos.waterPoint, "altitude"),
  "PLEASE TAKE A PHOTO OF THE CIU AND NEW METER CARD": (job) => photoUrl(job.photos.ciu),
  "PLEASE TAKE A PHOTO OF THE CIU AND NEW METER CARD (Time Answered)": (job) => photoTime(job.photos.ciu),
  "PLEASE TAKE A PHOTO OF THE CIU AND NEW METER CARD (Location Answered) (latitude)": (job) =>
    photoNumber(job.photos.ciu, "latitude"),
  "PLEASE TAKE A PHOTO OF THE CIU AND NEW METER CARD (Location Answered) (longitude)": (job) =>
    photoNumber(job.photos.ciu, "longitude"),
  "PLEASE TAKE A PHOTO OF THE CIU AND NEW METER CARD (Location Answered - accuracy)": (job) =>
    photoNumber(job.photos.ciu, "accuracy"),
  "PLEASE TAKE A PHOTO OF THE CIU AND NEW METER CARD (Location Answered - altitude)": (job) =>
    photoNumber(job.photos.ciu, "altitude"),
  "ANY OTHER PHOTO": (job) => otherPhotos(job),
  "INSTALLATION DONE BY:": (job) => optionalText(job.installerName),
};

export function toExportRow(job: ExportJob): ExportCell[] {
  return EXPORT_HEADERS.map((header) => producers[header](job));
}

export { FAULT_EXPORT, INSTALLATION_EXPORT, PREMISE_EXPORT };
