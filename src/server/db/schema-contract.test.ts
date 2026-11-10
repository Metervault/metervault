import assert from "node:assert/strict";
import { getTableColumns } from "drizzle-orm";
import test from "node:test";
import { jobPhotos, jobs } from "./schema";

test("job_photos keeps organisation_id required so sync inserts cannot omit it", () => {
  const cols = getTableColumns(jobPhotos);
  assert.equal(cols.organisationId.name, "organisation_id");
  assert.equal(cols.organisationId.notNull, true);
  assert.equal(cols.jobId.notNull, true);
  assert.equal(cols.type.notNull, true);
  assert.ok("content" in cols);
});

test("jobs keep organisation_id so photos can inherit it on sync", () => {
  const cols = getTableColumns(jobs);
  assert.equal(cols.organisationId.notNull, true);
  assert.equal(cols.idempotencyKey.name, "idempotency_key");
});
