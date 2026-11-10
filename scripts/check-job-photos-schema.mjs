/**
 * Fails if the live job_photos table drifts from the columns sync depends on.
 * Run with: npm run db:check
 */
import postgres from "postgres";

const REQUIRED = [
  { name: "organisation_id", nullable: false },
  { name: "job_id", nullable: false },
  { name: "type", nullable: false },
  { name: "content", nullable: true },
  { name: "idempotency_key", nullable: true },
];

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = postgres(url, { ssl: url.includes("supabase") ? "require" : undefined, max: 1 });

try {
  const cols = await sql`
    SELECT column_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'job_photos'
  `;
  const byName = new Map(cols.map((col) => [col.column_name, col.is_nullable === "YES"]));
  const problems = [];
  for (const required of REQUIRED) {
    if (!byName.has(required.name)) {
      problems.push(`missing column ${required.name}`);
      continue;
    }
    const nullable = byName.get(required.name);
    if (required.nullable === false && nullable) problems.push(`${required.name} should be NOT NULL`);
  }
  if (problems.length > 0) {
    console.error("job_photos schema check failed:");
    for (const problem of problems) console.error(`- ${problem}`);
    process.exit(1);
  }
  console.log("job_photos schema check passed.");
} finally {
  await sql.end({ timeout: 5 });
}
