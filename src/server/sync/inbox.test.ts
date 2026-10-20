import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createInbox } from "./inbox";

test("a retried job keeps the first id", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "metervault-inbox-"));
  const inbox = createInbox(dir);
  const first = await inbox.acceptJob("job-1", { meter: "CZZ863" });
  const second = await inbox.acceptJob("job-1", { meter: "CZZ863" });
  assert.equal(second.duplicate, true);
  assert.equal(second.id, first.id);
  const stored = JSON.parse(await readFile(path.join(dir, "inbox.json"), "utf8")) as { jobs: Record<string, unknown> };
  assert.equal(Object.keys(stored.jobs).length, 1);
});

test("a retried photo is stored once", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "metervault-inbox-"));
  const inbox = createInbox(dir);
  const bytes = Buffer.from("photo");
  const first = await inbox.acceptPhoto("photo-1", bytes);
  const second = await inbox.acceptPhoto("photo-1", bytes);
  assert.equal(second.id, first.id);
  const file = await readFile(path.join(dir, "photos", "photo-1.jpg"));
  assert.equal(file.toString(), "photo");
});
