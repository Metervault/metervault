import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Sql = ReturnType<typeof postgres>;

const globalForDb = globalThis as unknown as {
  metervaultSql?: Sql;
  metervaultUrl?: string;
};

export function databaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is not set. Add the Supabase connection string to .env and restart.");
  return url;
}

export function getDb() {
  const url = databaseUrl();
  const supabase = url.includes("supabase");
  if (globalForDb.metervaultUrl !== url) {
    void globalForDb.metervaultSql?.end({ timeout: 1 });
    globalForDb.metervaultSql = undefined;
    globalForDb.metervaultUrl = url;
  }
  globalForDb.metervaultSql ??= postgres(url, {
    max: 2,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: !supabase,
    ssl: supabase ? "require" : undefined,
  });
  return drizzle(globalForDb.metervaultSql, { schema });
}

export function safeDbMessage(error: unknown) {
  const cause = error instanceof Error && "cause" in error && error.cause instanceof Error ? error.cause.message : "";
  const message = cause || (error instanceof Error ? error.message : "The database could not be reached.");
  return message.replace(/postgres(?:ql)?:\/\/\S+/gi, "postgresql://…");
}
