import { and, count, eq, inArray, sql } from "drizzle-orm";
import type { SessionUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { catalogId } from "@/server/db/reference";
import { contractGrants, contracts, formVersions, installers, jobFaults, jobPhotos, jobs, stockItems, stockMovements, towns, workOrders } from "@/server/db/schema";

const FAULTS = [
  ["faultRm", "rm"],
  ["faultRp", "rp"],
  ["faultRn", "rn"],
  ["faultRc", "rc"],
  ["faultRo", "ro"],
  ["faultRv", "rv"],
] as const;

const PHOTO_TYPES = {
  photoMeterNumber: "meter_number",
  photoNewMeter: "new_meter",
  photoOldMeter: "old_meter",
  photoWaterPoint: "water_point",
  photoCiu: "ciu_card",
  photoOther: "other",
} as const;

const INSTALLATIONS = new Set(["meter_only", "white_and_blue_box", "non_straight"]);
const PREMISES = new Set(["business", "domestic"]);

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function wholeNumber(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

function flag(value: unknown) {
  return value === true;
}

function uniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export async function acceptSyncedJob(idempotencyKey: string, answers: Record<string, unknown>, user: SessionUser) {
  const db = getDb();
  const [existing] = await db.select({ id: jobs.id }).from(jobs).where(and(eq(jobs.enumeratorId, user.id), eq(jobs.idempotencyKey, idempotencyKey))).limit(1);
  if (existing) {
    await settleInstall(existing.id, answers, user);
    return { id: existing.id, duplicate: true };
  }

  const [contract] = await db.select({ id: contracts.id }).from(contracts).where(eq(contracts.organisationId, user.organisationId)).limit(1);
  const [form] = contract
    ? await db
        .select({ id: formVersions.id })
        .from(formVersions)
        .where(and(eq(formVersions.contractId, contract.id), eq(formVersions.key, "meter-change"), eq(formVersions.version, 1)))
        .limit(1)
    : [];
  const townName = text(answers.townId);
  const [town] = contract && townName
    ? await db.select({ id: towns.id }).from(towns).where(and(eq(towns.contractId, contract.id), eq(towns.normalisedName, townName.toLowerCase()))).limit(1)
    : [];
  const installerName = text(answers.installerId) ?? user.name;
  const [knownInstaller] = contract
    ? await db.select().from(installers).where(and(eq(installers.contractId, contract.id), eq(installers.displayName, installerName))).limit(1)
    : [];
  const installer = knownInstaller ?? (contract
    ? (await db.insert(installers).values({ contractId: contract.id, userId: user.id, displayName: installerName }).returning())[0]
    : null);
  if (contract) await db.insert(contractGrants).values({ userId: user.id, contractId: contract.id, role: "technician" }).onConflictDoNothing();

  const installation = text(answers.installation);
  const premise = text(answers.premise);
  const now = new Date();
  try {
    const [job] = await db
      .insert(jobs)
      .values({
        organisationId: user.organisationId,
        contractId: contract?.id ?? null,
        formVersionId: form?.id ?? null,
        enumeratorId: user.id,
        installerId: installer?.id ?? null,
        townId: town?.id ?? null,
        meterSizeId: contract ? await catalogId(contract.id, "size", text(answers.meterSizeId) ?? "") : null,
        meterClassId: contract ? await catalogId(contract.id, "class", text(answers.meterClassId) ?? "") : null,
        meterTypeId: contract ? await catalogId(contract.id, "type", text(answers.meterTypeId) ?? "") : null,
        status: "submitted",
        draftedOn: now,
        submittedOn: now,
        lastModifiedBy: user.id,
        jobDate: text(answers.date),
        installation: installation && INSTALLATIONS.has(installation) ? (installation as "meter_only") : null,
        premise: premise && PREMISES.has(premise) ? (premise as "domestic") : null,
        companyName: text(answers.companyName),
        cardNumber: text(answers.cardNumber),
        jobNumber: text(answers.jobNumber),
        houseNumber: text(answers.houseNumber),
        street: text(answers.street),
        unitNumber: text(answers.unitNumber),
        lotNumber: text(answers.lotNumber),
        otherReason: text(answers.other),
        newMeterNumber: text(answers.newMeterNumber),
        smartDeviceNumber: text(answers.smartDeviceNumber),
        smartDeviceReading: wholeNumber(answers.smartDeviceReading),
        oldMeterNumber: text(answers.oldMeterNumber),
        oldMeterNotOnList: flag(answers.oldMeterNotOnList),
        oldMeterListNote: text(answers.oldMeterListNote),
        oldMeterReading: wholeNumber(answers.oldMeterReading),
        connectionNumber: text(answers.connectionNumber),
        connectionNotOnList: flag(answers.connectionNotOnList),
        connectionListNote: text(answers.connectionListNote),
        accountNumber: text(answers.accountNumber),
        answers,
        idempotencyKey,
      })
      .returning({ id: jobs.id });

    const faults = FAULTS.filter(([field]) => flag(answers[field])).map(([, code]) => ({ jobId: job.id, code }));
    if (faults.length > 0) await db.insert(jobFaults).values(faults);
    await settleInstall(job.id, answers, user);
    return { id: job.id, duplicate: false };
  } catch (error) {
    if (!uniqueViolation(error)) throw error;
    const [again] = await db.select({ id: jobs.id }).from(jobs).where(and(eq(jobs.enumeratorId, user.id), eq(jobs.idempotencyKey, idempotencyKey))).limit(1);
    if (again) {
      await settleInstall(again.id, answers, user);
      return { id: again.id, duplicate: true };
    }
    throw error;
  }
}

/** Close the work order this capture came from, and take matching stock out of inventory. */
async function settleInstall(jobId: string, answers: Record<string, unknown>, user: SessionUser) {
  const db = getDb();
  const workOrderId = text(answers.workOrderId);
  const workOrderKey = workOrderId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workOrderId) ? workOrderId : null;
  if (workOrderKey) {
    const [order] = await db
      .select({ id: workOrders.id, status: workOrders.status, assignedTo: workOrders.assignedTo })
      .from(workOrders)
      .where(and(eq(workOrders.id, workOrderKey), eq(workOrders.organisationId, user.organisationId)))
      .limit(1);
    if (order && order.status !== "exception") {
      await db.update(jobs).set({ workOrderId: order.id, updatedAt: new Date() }).where(eq(jobs.id, jobId));
      if (order.status !== "completed") {
        await db
          .update(workOrders)
          .set({ status: "completed", assignedTo: order.assignedTo ?? user.id, updatedAt: new Date() })
          .where(eq(workOrders.id, order.id));
      }
    }
  }

  const pairs = [
    ["meter", text(answers.newMeterNumber)],
    ["smart_device", text(answers.smartDeviceNumber)],
  ] as const;
  for (const [kind, serial] of pairs) {
    if (!serial) continue;
    const updated = await db
      .update(stockItems)
      .set({ status: "installed", jobId, updatedAt: new Date() })
      .where(
        and(
          eq(stockItems.organisationId, user.organisationId),
          eq(stockItems.kind, kind),
          sql`lower(${stockItems.serial}) = ${serial.toLowerCase()}`,
          inArray(stockItems.status, ["in_stock", "issued", "returned"]),
        ),
      )
      .returning({ id: stockItems.id, kind: stockItems.kind, serial: stockItems.serial, issuedTo: stockItems.issuedTo });
    if (updated.length > 0) {
      await db.insert(stockMovements).values(
        updated.map((item) => ({
          organisationId: user.organisationId,
          stockItemId: item.id,
          kind: item.kind,
          serial: item.serial,
          action: "installed" as const,
          actorId: user.id,
          holderId: item.issuedTo,
          jobId,
        })),
      );
    }
  }
}

export async function acceptSyncedPhoto(input: {
  idempotencyKey: string;
  jobKey: string;
  fieldId: string;
  bytes: Buffer;
  capturedAt: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  altitude: number | null;
}) {
  const type = PHOTO_TYPES[input.fieldId as keyof typeof PHOTO_TYPES];
  if (!type) return { error: "Unknown photo." as const };
  const db = getDb();
  const [existing] = await db.select({ id: jobPhotos.id }).from(jobPhotos).where(eq(jobPhotos.idempotencyKey, input.idempotencyKey)).limit(1);
  if (existing) return { id: existing.id, duplicate: true };
  const [job] = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.idempotencyKey, input.jobKey)).limit(1);
  if (!job) return { error: "job-missing" as const };
  const [prior] = await db.select({ value: count() }).from(jobPhotos).where(and(eq(jobPhotos.jobId, job.id), eq(jobPhotos.type, type)));
  const capturedAt = input.capturedAt && !Number.isNaN(Date.parse(input.capturedAt)) ? new Date(input.capturedAt) : null;
  try {
    const [photo] = await db
      .insert(jobPhotos)
      .values({
        jobId: job.id,
        type,
        sequence: Number(prior?.value ?? 0),
        content: input.bytes,
        idempotencyKey: input.idempotencyKey,
        capturedAt,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy,
        altitude: input.altitude,
      })
      .returning({ id: jobPhotos.id });
    return { id: photo.id, duplicate: false };
  } catch (error) {
    if (!uniqueViolation(error)) throw error;
    const [again] = await db.select({ id: jobPhotos.id }).from(jobPhotos).where(eq(jobPhotos.idempotencyKey, input.idempotencyKey)).limit(1);
    if (again) return { id: again.id, duplicate: true };
    throw error;
  }
}
