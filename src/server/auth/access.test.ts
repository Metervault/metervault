import assert from "node:assert/strict";
import test from "node:test";
import { canMutateJob, canReadJob, exportStatuses, type Actor, type JobRef } from "./access";

const contract = "ws7761";
const org = "metervault";

function actor(overrides: Partial<Actor> = {}): Actor {
  return { userId: "tech-1", organisationId: org, orgRole: "member", grants: [{ contractId: contract, role: "technician" }], ...overrides };
}

function job(overrides: Partial<JobRef> = {}): JobRef {
  return { contractId: contract, organisationId: org, enumeratorId: "tech-1", status: "draft", ...overrides };
}

test("a technician sees and edits only their own open jobs", () => {
  const tech = actor();
  assert.equal(canReadJob(tech, job()), true);
  assert.equal(canReadJob(tech, job({ enumeratorId: "tech-2" })), false);
  assert.equal(canMutateJob(tech, "capture_own_draft", job({ status: "rejected" })), true);
  assert.equal(canMutateJob(tech, "capture_own_draft", job({ status: "approved" })), false);
  assert.equal(canMutateJob(tech, "approve_or_reject", job({ status: "in_review" })), false);
  assert.equal(canMutateJob(tech, "export", job({ status: "approved" })), false);
});

test("a supervisor reviews the contract and cannot unlock", () => {
  const supervisor = actor({ userId: "sup-1", grants: [{ contractId: contract, role: "supervisor" }] });
  assert.equal(canReadJob(supervisor, job({ enumeratorId: "tech-2", status: "submitted" })), true);
  assert.equal(canMutateJob(supervisor, "approve_or_reject", job({ status: "in_review" })), true);
  assert.equal(canMutateJob(supervisor, "unlock_approved", job({ status: "approved" })), false);
  assert.equal(canMutateJob(supervisor, "edit_submitted", job({ status: "approved" })), false);
  assert.equal(canMutateJob(supervisor, "edit_submitted", job({ status: "in_review" })), true);
});

test("an admin unlocks, a client viewer sees approved jobs only", () => {
  const admin = actor({ userId: "admin-1", grants: [{ contractId: contract, role: "admin" }] });
  assert.equal(canMutateJob(admin, "unlock_approved", job({ status: "approved" })), true);
  assert.equal(canMutateJob(admin, "manage_setup", job()), true);
  const viewer = actor({ userId: "muni-1", grants: [{ contractId: contract, role: "client_viewer" }] });
  assert.equal(canReadJob(viewer, job({ status: "draft" })), false);
  assert.equal(canReadJob(viewer, job({ status: "approved", enumeratorId: "tech-2" })), true);
  assert.deepEqual(exportStatuses(viewer, contract), ["approved"]);
  assert.equal(canMutateJob(viewer, "edit_submitted", job({ status: "approved" })), false);
});

test("an organisation admin is not limited to one contract, and another organisation is refused", () => {
  const orgAdmin = actor({ orgRole: "admin", grants: [] });
  assert.equal(canMutateJob(orgAdmin, "unlock_approved", job({ contractId: "other", status: "approved" })), true);
  const outsider = actor({ organisationId: "other-org" });
  assert.equal(canReadJob(outsider, job()), false);
});
