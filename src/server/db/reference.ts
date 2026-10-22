import { and, count, eq } from "drizzle-orm";
import { getDb } from "./client";
import { meterClasses, meterSizes, meterTypes, organisations, users } from "./schema";

let ready: Promise<{ id: string }> | null = null;

export function ensureOrganisation() {
  ready ??= upsert().catch((error: unknown) => {
    ready = null;
    throw error;
  });
  return ready;
}

async function upsert() {
  const db = getDb();
  const [organisation] = await db
    .insert(organisations)
    .values({ name: "MeterVault", legalName: "MeterVault", slug: "metervault" })
    .onConflictDoUpdate({
      target: organisations.slug,
      set: { name: "MeterVault", legalName: "MeterVault", updatedAt: new Date() },
    })
    .returning({ id: organisations.id });
  return organisation;
}

export async function catalogId(contractId: string, kind: "size" | "class" | "type", code: string) {
  if (!code) return null;
  const db = getDb();
  if (kind === "size") {
    const [row] = await db.select({ id: meterSizes.id }).from(meterSizes).where(and(eq(meterSizes.contractId, contractId), eq(meterSizes.code, code))).limit(1);
    return row?.id ?? null;
  }
  if (kind === "class") {
    const [row] = await db.select({ id: meterClasses.id }).from(meterClasses).where(and(eq(meterClasses.contractId, contractId), eq(meterClasses.code, code))).limit(1);
    return row?.id ?? null;
  }
  const [row] = await db.select({ id: meterTypes.id }).from(meterTypes).where(and(eq(meterTypes.contractId, contractId), eq(meterTypes.code, code))).limit(1);
  return row?.id ?? null;
}

export async function organisationRole(organisationId: string) {
  const db = getDb();
  const [row] = await db.select({ value: count() }).from(users).where(eq(users.organisationId, organisationId));
  return Number(row?.value ?? 0) === 0 ? "head" : "member";
}
