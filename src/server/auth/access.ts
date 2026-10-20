import type { JobStatus } from "../../domain/export/job";

export const CONTRACT_ROLES = ["technician", "supervisor", "admin", "client_viewer"] as const;
export type ContractRole = (typeof CONTRACT_ROLES)[number];

export const CAPABILITIES = [
  "capture_own_draft",
  "see_own_jobs",
  "see_contract_jobs",
  "see_approved_only",
  "edit_submitted",
  "assign_and_stock",
  "approve_or_reject",
  "unlock_approved",
  "manage_setup",
  "export",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

/** Org admin is not a contract role. They can do every capability on every contract in the organisation. */
export const ROLE_MATRIX: Record<ContractRole | "org_admin", Record<Capability, boolean>> = {
  technician: {
    capture_own_draft: true,
    see_own_jobs: true,
    see_contract_jobs: false,
    see_approved_only: false,
    edit_submitted: false,
    assign_and_stock: false,
    approve_or_reject: false,
    unlock_approved: false,
    manage_setup: false,
    export: false,
  },
  supervisor: {
    capture_own_draft: false,
    see_own_jobs: false,
    see_contract_jobs: true,
    see_approved_only: false,
    edit_submitted: true,
    assign_and_stock: true,
    approve_or_reject: true,
    unlock_approved: false,
    manage_setup: false,
    export: true,
  },
  admin: {
    capture_own_draft: false,
    see_own_jobs: false,
    see_contract_jobs: true,
    see_approved_only: false,
    edit_submitted: true,
    assign_and_stock: true,
    approve_or_reject: true,
    unlock_approved: true,
    manage_setup: true,
    export: true,
  },
  client_viewer: {
    capture_own_draft: false,
    see_own_jobs: false,
    see_contract_jobs: false,
    see_approved_only: true,
    edit_submitted: false,
    assign_and_stock: false,
    approve_or_reject: false,
    unlock_approved: false,
    manage_setup: false,
    export: true,
  },
  org_admin: {
    capture_own_draft: false,
    see_own_jobs: false,
    see_contract_jobs: true,
    see_approved_only: false,
    edit_submitted: true,
    assign_and_stock: true,
    approve_or_reject: true,
    unlock_approved: true,
    manage_setup: true,
    export: true,
  },
};

export type Grant = { contractId: string; role: ContractRole };

export type Actor = {
  userId: string;
  organisationId: string;
  orgRole: "admin" | "member";
  grants: Grant[];
};

export type JobRef = {
  contractId: string;
  organisationId: string;
  enumeratorId: string;
  status: JobStatus;
};

export class AccessError extends Error {
  constructor(message = "Not allowed") {
    super(message);
    this.name = "AccessError";
  }
}

export type ContractScope =
  | { contractId: string; mode: "own"; userId: string }
  | { contractId: string; mode: "all" }
  | { contractId: string; mode: "approved" };

function roleOn(actor: Actor, contractId: string): ContractRole | "org_admin" | null {
  if (actor.orgRole === "admin") return "org_admin";
  return actor.grants.find((grant) => grant.contractId === contractId)?.role ?? null;
}

export function allows(actor: Actor, capability: Capability, contractId?: string): boolean {
  if (actor.orgRole === "admin") return ROLE_MATRIX.org_admin[capability];
  if (!contractId) return actor.grants.some((grant) => ROLE_MATRIX[grant.role][capability]);
  const role = roleOn(actor, contractId);
  return role != null && ROLE_MATRIX[role][capability];
}

export function jobScopes(actor: Actor): ContractScope[] | "organisation" {
  if (actor.orgRole === "admin") return "organisation";
  return actor.grants.map((grant) => {
    if (grant.role === "technician") return { contractId: grant.contractId, mode: "own" as const, userId: actor.userId };
    if (grant.role === "client_viewer") return { contractId: grant.contractId, mode: "approved" as const };
    return { contractId: grant.contractId, mode: "all" as const };
  });
}

export function canReadJob(actor: Actor, job: JobRef): boolean {
  if (job.organisationId !== actor.organisationId) return false;
  const role = roleOn(actor, job.contractId);
  if (role == null) return false;
  if (role === "org_admin" || role === "supervisor" || role === "admin") return true;
  if (role === "client_viewer") return job.status === "approved";
  return job.enumeratorId === actor.userId;
}

export function canMutateJob(actor: Actor, capability: Capability, job: JobRef): boolean {
  if (!canReadJob(actor, job) && capability !== "capture_own_draft") return false;
  if (!allows(actor, capability, job.contractId)) return false;
  if (capability === "capture_own_draft") {
    return job.enumeratorId === actor.userId && (job.status === "draft" || job.status === "rejected");
  }
  if (capability === "unlock_approved") return job.status === "approved";
  if (capability === "approve_or_reject") return job.status === "submitted" || job.status === "in_review" || job.status === "resubmitted";
  if (capability === "edit_submitted") return job.status === "submitted" || job.status === "in_review" || job.status === "resubmitted" || job.status === "rejected";
  return true;
}

export function assertCan(actor: Actor, capability: Capability, job?: JobRef): void {
  const allowed = job
    ? canMutateJob(actor, capability, job) || (capability === "export" && canReadJob(actor, job))
    : allows(actor, capability);
  if (!allowed) throw new AccessError();
}

/** Client viewers may export only the approved jobs their read scope already allows. */
export function exportStatuses(actor: Actor, contractId: string): JobStatus[] | "all" {
  const role = roleOn(actor, contractId);
  if (role == null || !allows(actor, "export", contractId)) return [];
  if (role === "client_viewer") return ["approved"];
  return "all";
}
