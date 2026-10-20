import { redirect } from "next/navigation";
import { and, count, desc, eq, inArray, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import { getSessionUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { installers, jobFaults, jobPhotos, jobs, organisations, stockItems, towns, users, workOrders } from "@/server/db/schema";

const REVIEW_STATUSES = ["submitted", "in_review", "resubmitted"] as const;

export type OfficeJob = {
  id: string;
  responseCode: string | null;
  jobDate: string | null;
  town: string | null;
  street: string | null;
  newMeterNumber: string | null;
  installer: string | null;
  status: string;
};

export type OfficeHome = {
  organisationName: string;
  installsToday: number;
  awaitingReview: number;
  approved: number;
  teamCount: number;
  openWorkOrders: number;
  firstTimeRight: string;
  latest: OfficeJob[];
};

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  orgRole: "admin" | "member";
};

function todayInJohannesburg() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
}

function openJobs() {
  return isNull(jobs.deletedAt);
}

async function jobRows(where: ReturnType<typeof and> | ReturnType<typeof openJobs>, limit?: number) {
  const db = getDb();
  const query = db
    .select({
      id: jobs.id,
      responseCode: jobs.responseCode,
      jobDate: jobs.jobDate,
      town: sql<string | null>`coalesce(${towns.name}, ${jobs.answers}->>'townId')`,
      street: jobs.street,
      newMeterNumber: jobs.newMeterNumber,
      installer: installers.displayName,
      enumerator: users.name,
      status: jobs.status,
    })
    .from(jobs)
    .leftJoin(towns, eq(jobs.townId, towns.id))
    .leftJoin(installers, eq(jobs.installerId, installers.id))
    .leftJoin(users, eq(jobs.enumeratorId, users.id))
    .where(where)
    .orderBy(desc(jobs.createdAt));
  const rows = await (limit ? query.limit(limit) : query);
  return rows.map((row) => ({
    id: row.id,
    responseCode: row.responseCode,
    jobDate: row.jobDate,
    town: row.town,
    street: row.street,
    newMeterNumber: row.newMeterNumber,
    installer: row.installer ?? row.enumerator,
    status: row.status,
  }));
}

async function countJobs(extra?: ReturnType<typeof eq> | ReturnType<typeof inArray> | ReturnType<typeof ne> | ReturnType<typeof and>) {
  const db = getDb();
  const [row] = await db.select({ value: count() }).from(jobs).where(extra ? and(openJobs(), extra) : openJobs());
  return Number(row?.value ?? 0);
}

async function currentOrganisation() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const db = getDb();
  const [organisation] = await db.select({ name: organisations.name }).from(organisations).where(eq(organisations.id, user.organisationId)).limit(1);
  return {
    user,
    organisationName: organisation?.name ?? "MeterVault",
  };
}

export async function loadOfficeHome(): Promise<OfficeHome> {
  const scope = await currentOrganisation();
  const db = getDb();
  const scoped = eq(jobs.organisationId, scope.user.organisationId);
  const [decisions] = await db
    .select({
      clean: sql<number>`count(*) filter (where ${jobs.status} = 'approved' and ${jobs.rejectionCount} = 0)`,
      decided: sql<number>`count(*) filter (where ${jobs.status} in ('approved', 'rejected'))`,
    })
    .from(jobs)
    .where(and(openJobs(), scoped));
  const decided = Number(decisions?.decided ?? 0);
  const clean = Number(decisions?.clean ?? 0);
  return {
    organisationName: scope.organisationName,
    installsToday: await countJobs(and(scoped, eq(jobs.jobDate, todayInJohannesburg()), ne(jobs.status, "draft"))),
    awaitingReview: await countJobs(and(scoped, inArray(jobs.status, [...REVIEW_STATUSES]))),
    approved: await countJobs(and(scoped, eq(jobs.status, "approved"))),
    teamCount: await countUsers(scope.user.organisationId),
    openWorkOrders: await countOpenWorkOrders(scope.user.organisationId),
    firstTimeRight: decided === 0 ? "—" : `${Math.round((clean / decided) * 100)}%`,
    latest: await jobRows(and(openJobs(), scoped), 12),
  };
}

export async function loadJobs() {
  const scope = await currentOrganisation();
  return jobRows(and(openJobs(), eq(jobs.organisationId, scope.user.organisationId)));
}

export type ReviewPhoto = {
  id: string;
  type: string;
  latitude: number | null;
  longitude: number | null;
};

export type ReviewCapture = {
  id: string;
  status: string;
  installer: string | null;
  jobDate: string | null;
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
  photos: ReviewPhoto[];
};

export async function loadReviewQueue(): Promise<ReviewCapture[]> {
  const scope = await currentOrganisation();
  const db = getDb();
  const rows = await db
    .select({
      id: jobs.id,
      status: jobs.status,
      installer: installers.displayName,
      enumerator: users.name,
      jobDate: jobs.jobDate,
      companyName: jobs.companyName,
      cardNumber: jobs.cardNumber,
      jobNumber: jobs.jobNumber,
      houseNumber: jobs.houseNumber,
      street: jobs.street,
      unitNumber: jobs.unitNumber,
      lotNumber: jobs.lotNumber,
      town: sql<string | null>`coalesce(${towns.name}, ${jobs.answers}->>'townId')`,
      installation: jobs.installation,
      premise: jobs.premise,
      otherReason: jobs.otherReason,
      newMeterNumber: jobs.newMeterNumber,
      meterSize: sql<string | null>`${jobs.answers}->>'meterSizeId'`,
      meterClass: sql<string | null>`${jobs.answers}->>'meterClassId'`,
      meterType: sql<string | null>`${jobs.answers}->>'meterTypeId'`,
      smartDeviceNumber: jobs.smartDeviceNumber,
      smartDeviceReading: jobs.smartDeviceReading,
      oldMeterNumber: jobs.oldMeterNumber,
      oldMeterNotOnList: jobs.oldMeterNotOnList,
      oldMeterListNote: jobs.oldMeterListNote,
      oldMeterReading: jobs.oldMeterReading,
      connectionNumber: jobs.connectionNumber,
      connectionNotOnList: jobs.connectionNotOnList,
      connectionListNote: jobs.connectionListNote,
      accountNumber: jobs.accountNumber,
      rejectionMessage: jobs.rejectionMessage,
      rejectionCount: jobs.rejectionCount,
    })
    .from(jobs)
    .leftJoin(towns, eq(jobs.townId, towns.id))
    .leftJoin(installers, eq(jobs.installerId, installers.id))
    .leftJoin(users, eq(jobs.enumeratorId, users.id))
    .where(and(openJobs(), eq(jobs.organisationId, scope.user.organisationId), inArray(jobs.status, [...REVIEW_STATUSES])))
    .orderBy(desc(jobs.createdAt));
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const [faults, photos] = await Promise.all([
    db.select({ jobId: jobFaults.jobId, code: jobFaults.code }).from(jobFaults).where(inArray(jobFaults.jobId, ids)),
    db
      .select({
        id: jobPhotos.id,
        jobId: jobPhotos.jobId,
        type: jobPhotos.type,
        sequence: jobPhotos.sequence,
        latitude: jobPhotos.latitude,
        longitude: jobPhotos.longitude,
      })
      .from(jobPhotos)
      .where(inArray(jobPhotos.jobId, ids))
      .orderBy(jobPhotos.sequence),
  ]);
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    installer: row.installer ?? row.enumerator,
    jobDate: row.jobDate,
    companyName: row.companyName,
    cardNumber: row.cardNumber,
    jobNumber: row.jobNumber,
    houseNumber: row.houseNumber,
    street: row.street,
    unitNumber: row.unitNumber,
    lotNumber: row.lotNumber,
    town: row.town,
    installation: row.installation,
    premise: row.premise,
    faults: faults.filter((fault) => fault.jobId === row.id).map((fault) => fault.code),
    otherReason: row.otherReason,
    newMeterNumber: row.newMeterNumber,
    meterSize: row.meterSize,
    meterClass: row.meterClass,
    meterType: row.meterType,
    smartDeviceNumber: row.smartDeviceNumber,
    smartDeviceReading: row.smartDeviceReading,
    oldMeterNumber: row.oldMeterNumber,
    oldMeterNotOnList: row.oldMeterNotOnList,
    oldMeterListNote: row.oldMeterListNote,
    oldMeterReading: row.oldMeterReading,
    connectionNumber: row.connectionNumber,
    connectionNotOnList: row.connectionNotOnList,
    connectionListNote: row.connectionListNote,
    accountNumber: row.accountNumber,
    rejectionMessage: row.rejectionMessage,
    rejectionCount: row.rejectionCount,
    photos: photos
      .filter((photo) => photo.jobId === row.id)
      .map((photo) => ({ id: photo.id, type: photo.type, latitude: photo.latitude, longitude: photo.longitude })),
  }));
}

export async function loadTeam() {
  const scope = await currentOrganisation();
  return getDb()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      orgRole: users.orgRole,
    })
    .from(users)
    .where(eq(users.organisationId, scope.user.organisationId))
    .orderBy(users.name);
}

export async function loadWorkOrders(audience: "company" | "field" = "company") {
  const scope = await currentOrganisation();
  const db = getDb();
  const company = eq(workOrders.organisationId, scope.user.organisationId);
  const visible = audience === "field" ? and(company, or(eq(workOrders.assignedTo, scope.user.id), isNull(workOrders.assignedTo))) : company;
  return db
    .select({
      id: workOrders.id,
      status: workOrders.status,
      town: sql<string | null>`coalesce(${towns.name}, ${workOrders.townName})`,
      street: workOrders.street,
      houseNumber: workOrders.houseNumber,
      oldMeterNumber: workOrders.oldMeterNumber,
      connectionNumber: workOrders.connectionNumber,
      assignee: users.name,
    })
    .from(workOrders)
    .leftJoin(towns, eq(workOrders.townId, towns.id))
    .leftJoin(users, eq(workOrders.assignedTo, users.id))
    .where(visible)
    .orderBy(desc(workOrders.createdAt));
}

export async function loadStock() {
  const scope = await currentOrganisation();
  const db = getDb();
  return db
    .select({
      id: stockItems.id,
      kind: stockItems.kind,
      serial: stockItems.serial,
      status: stockItems.status,
      holder: users.name,
    })
    .from(stockItems)
    .leftJoin(users, eq(stockItems.issuedTo, users.id))
    .where(eq(stockItems.organisationId, scope.user.organisationId))
    .orderBy(desc(stockItems.createdAt));
}

async function countUsers(organisationId: string) {
  const [row] = await getDb().select({ value: count() }).from(users).where(eq(users.organisationId, organisationId));
  return Number(row?.value ?? 0);
}

async function countOpenWorkOrders(organisationId: string) {
  const [row] = await getDb()
    .select({ value: count() })
    .from(workOrders)
    .where(and(eq(workOrders.organisationId, organisationId), inArray(workOrders.status, ["unassigned", "assigned", "in_progress"])));
  return Number(row?.value ?? 0);
}

export async function loadLocatedJobs() {
  const scope = await currentOrganisation();
  const db = getDb();
  const rows = await db
    .select({
      id: jobs.id,
      responseCode: jobs.responseCode,
      street: jobs.street,
      town: sql<string | null>`coalesce(${towns.name}, ${jobs.answers}->>'townId')`,
      status: jobs.status,
      type: jobPhotos.type,
      latitude: jobPhotos.latitude,
      longitude: jobPhotos.longitude,
    })
    .from(jobPhotos)
    .innerJoin(jobs, eq(jobPhotos.jobId, jobs.id))
    .leftJoin(towns, eq(jobs.townId, towns.id))
    .where(and(eq(jobs.organisationId, scope.user.organisationId), openJobs(), isNotNull(jobPhotos.latitude), isNotNull(jobPhotos.longitude)));
  const ranked = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const current = ranked.get(row.id);
    if (!current || (current.type !== "water_point" && row.type === "water_point")) ranked.set(row.id, row);
  }
  return [...ranked.values()];
}
