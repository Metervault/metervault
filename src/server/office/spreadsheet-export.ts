import { and, asc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { buildExportWorkbook } from "@/domain/export/workbook";
import type { ExportJob, FaultCode, InstallationCode, PhotoEvidence, PremiseCode } from "@/domain/export/job";
import { LIST_PHRASES } from "@/domain/export/phrases";
import { monthRange, spanFilePart, type ReportSpan } from "@/lib/report-period";
import { getDb } from "@/server/db/client";
import {
  contracts,
  installers,
  jobFaults,
  jobPhotos,
  jobs,
  meterClasses,
  meterSizes,
  meterTypes,
  towns,
  users,
} from "@/server/db/schema";

const INSTALLATIONS = new Set<InstallationCode>(["meter_only", "white_and_blue_box", "non_straight"]);
const PREMISES = new Set<PremiseCode>(["business", "domestic"]);
const FAULTS = new Set<FaultCode>(["rm", "rp", "rn", "rc", "ro", "rv"]);

type SinglePhotoSlot = "meterNumber" | "newMeter" | "oldMeter" | "waterPoint" | "ciu";

const PHOTO_SLOT: Record<string, SinglePhotoSlot> = {
  meter_number: "meterNumber",
  new_meter: "newMeter",
  old_meter: "oldMeter",
  water_point: "waterPoint",
  ciu_card: "ciu",
};

function asInstallation(value: string | null): InstallationCode | null {
  return value && INSTALLATIONS.has(value as InstallationCode) ? (value as InstallationCode) : null;
}

function asPremise(value: string | null): PremiseCode | null {
  return value && PREMISES.has(value as PremiseCode) ? (value as PremiseCode) : null;
}

function parseJobDate(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function photoUrl(baseUrl: string, photo: { id: string; legacyUrl: string | null }): string {
  if (photo.legacyUrl?.trim()) return photo.legacyUrl.trim();
  return `${baseUrl}/api/office/photos/${photo.id}`;
}

function evidence(
  baseUrl: string,
  photo: {
    id: string;
    legacyUrl: string | null;
    capturedAt: Date | null;
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    altitude: number | null;
  },
): PhotoEvidence {
  return {
    url: photoUrl(baseUrl, photo),
    answeredAt: photo.capturedAt,
    latitude: photo.latitude,
    longitude: photo.longitude,
    accuracy: photo.accuracy,
    altitude: photo.altitude,
  };
}

function emptyFaults(): Record<FaultCode, boolean> {
  return { rm: false, rp: false, rn: false, rc: false, ro: false, rv: false };
}

export async function buildCaptureSpreadsheet(organisationId: string, span: ReportSpan | null, origin: string) {
  const db = getDb();
  const modifiers = alias(users, "modifiers");
  const filters = [eq(jobs.organisationId, organisationId), isNull(jobs.deletedAt)];
  if (span?.mode === "day") filters.push(eq(jobs.jobDate, span.date));
  if (span?.mode === "month") {
    const range = monthRange(span.month);
    filters.push(gte(jobs.jobDate, range.start), lt(jobs.jobDate, range.end));
  }

  const rows = await db
    .select({
      id: jobs.id,
      status: jobs.status,
      responseCode: jobs.responseCode,
      draftedOn: jobs.draftedOn,
      submittedOn: jobs.submittedOn,
      draftName: jobs.draftName,
      updatedAt: jobs.updatedAt,
      approvalLevel: jobs.approvalLevel,
      rejectionMessage: jobs.rejectionMessage,
      rejectionCount: jobs.rejectionCount,
      editCount: jobs.editCount,
      submitIp: jobs.submitIp,
      jobDate: jobs.jobDate,
      installation: jobs.installation,
      premise: jobs.premise,
      companyName: jobs.companyName,
      cardNumber: jobs.cardNumber,
      jobNumber: jobs.jobNumber,
      houseNumber: jobs.houseNumber,
      street: jobs.street,
      unitNumber: jobs.unitNumber,
      lotNumber: jobs.lotNumber,
      otherReason: jobs.otherReason,
      newMeterNumber: jobs.newMeterNumber,
      smartDeviceNumber: jobs.smartDeviceNumber,
      smartDeviceReading: jobs.smartDeviceReading,
      oldMeterNumber: jobs.oldMeterNumber,
      oldMeterNotOnList: jobs.oldMeterNotOnList,
      oldMeterReading: jobs.oldMeterReading,
      connectionNumber: jobs.connectionNumber,
      connectionNotOnList: jobs.connectionNotOnList,
      connectionAnsweredAt: jobs.connectionAnsweredAt,
      accountNumber: jobs.accountNumber,
      enumeratorUsername: users.username,
      lastModifierUsername: modifiers.username,
      installerName: installers.displayName,
      town: sql<string | null>`coalesce(${towns.name}, ${jobs.answers}->>'townId')`,
      meterSize: sql<string | null>`coalesce(${meterSizes.exportString}, ${jobs.answers}->>'meterSizeId')`,
      meterClass: sql<string | null>`coalesce(${meterClasses.exportString}, ${jobs.answers}->>'meterClassId')`,
      meterType: sql<string | null>`coalesce(${meterTypes.exportString}, ${jobs.answers}->>'meterTypeId')`,
      deploymentName: contracts.deploymentName,
      statusExportValue: contracts.statusExportValue,
      listPhrases: contracts.listPhrases,
      exportFilenamePattern: contracts.exportFilenamePattern,
      municipalityName: contracts.municipalityName,
      contractCode: contracts.code,
      companyFromContract: contracts.companyName,
    })
    .from(jobs)
    .leftJoin(users, eq(jobs.enumeratorId, users.id))
    .leftJoin(modifiers, eq(jobs.lastModifiedBy, modifiers.id))
    .leftJoin(installers, eq(jobs.installerId, installers.id))
    .leftJoin(towns, eq(jobs.townId, towns.id))
    .leftJoin(meterSizes, eq(jobs.meterSizeId, meterSizes.id))
    .leftJoin(meterClasses, eq(jobs.meterClassId, meterClasses.id))
    .leftJoin(meterTypes, eq(jobs.meterTypeId, meterTypes.id))
    .leftJoin(contracts, eq(jobs.contractId, contracts.id))
    .where(and(...filters))
    .orderBy(asc(jobs.jobDate), asc(jobs.submittedOn), asc(jobs.createdAt));

  if (rows.length === 0) {
    return {
      buffer: await buildExportWorkbook([]),
      filename: spreadsheetFilename(null, span),
      count: 0,
    };
  }

  const ids = rows.map((row) => row.id);
  const [faultRows, photoRows] = await Promise.all([
    db.select({ jobId: jobFaults.jobId, code: jobFaults.code }).from(jobFaults).where(inArray(jobFaults.jobId, ids)),
    db
      .select({
        id: jobPhotos.id,
        jobId: jobPhotos.jobId,
        type: jobPhotos.type,
        sequence: jobPhotos.sequence,
        legacyUrl: jobPhotos.legacyUrl,
        capturedAt: jobPhotos.capturedAt,
        latitude: jobPhotos.latitude,
        longitude: jobPhotos.longitude,
        accuracy: jobPhotos.accuracy,
        altitude: jobPhotos.altitude,
      })
      .from(jobPhotos)
      .where(inArray(jobPhotos.jobId, ids))
      .orderBy(asc(jobPhotos.sequence)),
  ]);

  const faultsByJob = new Map<string, Record<FaultCode, boolean>>();
  for (const row of faultRows) {
    const current = faultsByJob.get(row.jobId) ?? emptyFaults();
    if (FAULTS.has(row.code as FaultCode)) current[row.code as FaultCode] = true;
    faultsByJob.set(row.jobId, current);
  }

  const photosByJob = new Map<string, ExportJob["photos"]>();
  for (const photo of photoRows) {
    const bucket = photosByJob.get(photo.jobId) ?? {};
    const slot = PHOTO_SLOT[photo.type];
    if (slot) {
      bucket[slot] = evidence(origin, photo);
    } else if (photo.type === "other") {
      bucket.other = [...(bucket.other ?? []), evidence(origin, photo)];
    }
    photosByJob.set(photo.jobId, bucket);
  }

  const exportJobs: ExportJob[] = rows.map((row) => {
    const phrases = row.listPhrases ?? LIST_PHRASES;
    const approved = row.status === "approved";
    return {
      deployment: row.deploymentName ?? row.companyFromContract ?? row.companyName ?? "MeterVault",
      enumerator: row.enumeratorUsername ?? "",
      exportedStatus: approved ? (row.statusExportValue ?? "Final") : null,
      responseCode: row.responseCode,
      draftedOn: row.draftedOn,
      submittedOn: row.submittedOn,
      draftName: row.draftName,
      lastModifiedOn: row.updatedAt,
      lastModifiedBy: row.lastModifierUsername,
      approvalLevel: row.approvalLevel,
      rejectionMessage: row.rejectionMessage,
      rejectionCount: row.rejectionCount,
      editCount: row.editCount,
      ipAddress: row.submitIp,
      jobDate: parseJobDate(row.jobDate),
      installation: asInstallation(row.installation),
      premise: asPremise(row.premise),
      companyName: row.companyName,
      cardNumber: row.cardNumber,
      jobNumber: row.jobNumber,
      houseNumber: row.houseNumber,
      street: row.street,
      unitNumber: row.unitNumber,
      lotNumber: row.lotNumber,
      town: row.town,
      faults: faultsByJob.get(row.id) ?? emptyFaults(),
      other: row.otherReason,
      newMeterNumber: row.newMeterNumber,
      newMeterSize: row.meterSize,
      newMeterClass: row.meterClass,
      newMeterType: row.meterType,
      smartDeviceNumber: row.smartDeviceNumber,
      smartDeviceReading: row.smartDeviceReading,
      oldMeterNumber: row.oldMeterNumber,
      oldMeterNotOnList: row.oldMeterNotOnList,
      oldMeterReading: row.oldMeterReading,
      connectionNumber: row.connectionNumber,
      connectionNotOnList: row.connectionNotOnList,
      connectionAnsweredAt: row.connectionAnsweredAt,
      accountNumber: row.accountNumber,
      photos: photosByJob.get(row.id) ?? {},
      installerName: row.installerName,
      listPhrases: phrases,
    };
  });

  const sample = rows[0];
  return {
    buffer: await buildExportWorkbook(exportJobs),
    filename: spreadsheetFilename(
      sample
        ? {
            pattern: sample.exportFilenamePattern,
            municipalityName: sample.municipalityName,
            code: sample.contractCode,
            companyName: sample.companyFromContract ?? sample.companyName,
            deploymentName: sample.deploymentName,
          }
        : null,
      span,
    ),
    count: exportJobs.length,
  };
}

function spreadsheetFilename(
  contract: {
    pattern: string | null;
    municipalityName: string | null;
    code: string | null;
    companyName: string | null;
    deploymentName: string | null;
  } | null,
  span: ReportSpan | null,
) {
  const datePart = spanFilePart(span) || `-${new Date().toISOString().slice(0, 10)}`;
  if (contract?.pattern) {
    const filled = contract.pattern
      .replaceAll("{municipality}", contract.municipalityName ?? "Municipality")
      .replaceAll("{code}", contract.code ?? "contract")
      .replaceAll("{company}", contract.companyName ?? "MeterVault")
      .replaceAll("{deployment}", contract.deploymentName ?? "MeterVault")
      .replaceAll("{date}", datePart.replace(/^-/, ""));
    return filled.endsWith(".xlsx") ? filled : `${filled}.xlsx`;
  }
  const company = contract?.companyName ?? contract?.deploymentName ?? "MeterVault";
  return `${company}${datePart}.xlsx`;
}
