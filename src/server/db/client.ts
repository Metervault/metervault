import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Sql = ReturnType<typeof postgres>;

const poolSettings = "max2-idle60-connect30";

const globalForDb = globalThis as unknown as {
  metervaultSql?: Sql;
  metervaultUrl?: string;
  metervaultPool?: string;
};

export function databaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is not set. Add the Supabase connection string to .env and restart.");
  return url;
}

export function resetDb() {
  void globalForDb.metervaultSql?.end({ timeout: 1 });
  globalForDb.metervaultSql = undefined;
}

export function getDb() {
  const url = databaseUrl();
  const supabase = url.includes("supabase");
  if (globalForDb.metervaultUrl !== url || globalForDb.metervaultPool !== poolSettings) {
    resetDb();
    globalForDb.metervaultUrl = url;
    globalForDb.metervaultPool = poolSettings;
  }
  globalForDb.metervaultSql ??= postgres(url, {
    max: 2,
    idle_timeout: 60,
    connect_timeout: 30,
    prepare: !supabase,
    ssl: supabase ? "require" : undefined,
  });
  return drizzle(globalForDb.metervaultSql, { schema });
}

const transientCodes = new Set(["CONNECT_TIMEOUT", "ENOTFOUND", "EAI_AGAIN", "ETIMEDOUT", "ECONNRESET", "ECONNREFUSED"]);

export function isTransientDbError(error: unknown) {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    if ("code" in current && typeof current.code === "string" && transientCodes.has(current.code)) return true;
    if ("message" in current && typeof current.message === "string" && /ENOTFOUND|EAI_AGAIN|CONNECT_TIMEOUT|ETIMEDOUT/.test(current.message)) return true;
    current = "cause" in current ? current.cause : undefined;
  }
  return false;
}

export function safeDbMessage(error: unknown) {
  if (isTransientDbError(error)) return "The database could not be reached. Check your connection and refresh.";
  const cause = error instanceof Error && "cause" in error && error.cause instanceof Error ? error.cause.message : "";
  const message = cause || (error instanceof Error ? error.message : "The database could not be reached.");
  return message.replace(/postgres(?:ql)?:\/\/\S+/gi, "postgresql://…");
}
