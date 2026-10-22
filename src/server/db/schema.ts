import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  bigint,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  customType,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const orgRole = pgEnum("org_role", ["admin", "member", "head"]);
export const contractRole = pgEnum("contract_role", ["technician", "supervisor", "admin", "client_viewer"]);
export const jobStatus = pgEnum("job_status", ["draft", "submitted", "in_review", "approved", "rejected", "resubmitted"]);
export const installationType = pgEnum("installation_type", ["meter_only", "white_and_blue_box", "non_straight"]);
export const premiseType = pgEnum("premise_type", ["business", "domestic"]);
export const faultCode = pgEnum("fault_code", ["rm", "rp", "rn", "rc", "ro", "rv"]);
export const photoType = pgEnum("photo_type", ["meter_number", "new_meter", "old_meter", "water_point", "ciu_card", "other"]);
export const flagSeverity = pgEnum("flag_severity", ["block", "warn", "info"]);
export const workOrderStatus = pgEnum("work_order_status", ["unassigned", "assigned", "in_progress", "completed", "exception"]);
export const stockKind = pgEnum("stock_kind", ["meter", "smart_device"]);
export const stockStatus = pgEnum("stock_status", ["in_stock", "issued", "installed", "returned"]);
export const stockMovement = pgEnum("stock_movement", ["received", "issued", "installed", "returned"]);
export const formStatus = pgEnum("form_status", ["draft", "published", "retired"]);

const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea";
  },
});

export const organisations = pgTable("organisations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  legalName: text("legal_name").notNull(),
  slug: text("slug").notNull().unique(),
  ...timestamps,
});

/** Compatible with a later Better Auth user table: id, name, email, emailVerified, image, createdAt, updatedAt. */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  organisationId: uuid("organisation_id").notNull().references(() => organisations.id),
  orgRole: orgRole("org_role").notNull().default("member"),
  name: text("name").notNull(),
  username: text("username").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash"),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  removedAt: timestamp("removed_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("users_org_username").on(table.organisationId, table.username),
  uniqueIndex("users_email").on(table.email),
]);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  ...timestamps,
});

export const contracts = pgTable("contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organisationId: uuid("organisation_id").notNull().references(() => organisations.id),
  municipalityName: text("municipality_name").notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  deploymentName: text("deployment_name").notNull(),
  companyName: text("company_name").notNull(),
  exportFilenamePattern: text("export_filename_pattern").notNull(),
  exportSheetName: text("export_sheet_name").notNull().default("Main"),
  /** Word written to the Status column for an approved job. eThekwini sample is "Final". */
  statusExportValue: text("status_export_value").notNull(),
  approvalLevels: integer("approval_levels").notNull().default(1),
  listPhrases: jsonb("list_phrases").$type<{ oldMeterSuffix: string; connectionValue: string }>().notNull(),
  timezone: text("timezone").notNull().default("Africa/Johannesburg"),
  ...timestamps,
}, (table) => [
  uniqueIndex("contracts_org_code").on(table.organisationId, table.code),
]);

export const contractGrants = pgTable("contract_grants", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  contractId: uuid("contract_id").notNull().references(() => contracts.id),
  role: contractRole("role").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("contract_grants_user_contract").on(table.userId, table.contractId),
]);

export const towns = pgTable("towns", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").notNull().references(() => contracts.id),
  name: text("name").notNull(),
  normalisedName: text("normalised_name").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("towns_contract_name").on(table.contractId, table.normalisedName),
]);

export const installers = pgTable("installers", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").notNull().references(() => contracts.id),
  userId: uuid("user_id").references(() => users.id),
  displayName: text("display_name").notNull(),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const meterSizes = pgTable("meter_sizes", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").notNull().references(() => contracts.id),
  code: text("code").notNull(),
  exportString: text("export_string").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
});

export const meterClasses = pgTable("meter_classes", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").notNull().references(() => contracts.id),
  code: text("code").notNull(),
  exportString: text("export_string").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
});

export const meterTypes = pgTable("meter_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").notNull().references(() => contracts.id),
  code: text("code").notNull(),
  exportString: text("export_string").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
});

export const formVersions = pgTable("form_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").notNull().references(() => contracts.id),
  key: text("key").notNull(),
  version: integer("version").notNull(),
  status: formStatus("status").notNull().default("draft"),
  schema: jsonb("schema").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("form_versions_contract_key_version").on(table.contractId, table.key, table.version),
]);

export const workOrders = pgTable("work_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  organisationId: uuid("organisation_id").notNull().references(() => organisations.id),
  contractId: uuid("contract_id").references(() => contracts.id),
  townId: uuid("town_id").references(() => towns.id),
  townName: text("town_name"),
  assignedTo: uuid("assigned_to").references(() => users.id),
  status: workOrderStatus("status").notNull().default("unassigned"),
  externalRef: text("external_ref"),
  houseNumber: text("house_number"),
  street: text("street"),
  unitNumber: text("unit_number"),
  lotNumber: text("lot_number"),
  oldMeterNumber: text("old_meter_number"),
  connectionNumber: text("connection_number"),
  accountNumber: text("account_number"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  ...timestamps,
});

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organisationId: uuid("organisation_id").notNull().references(() => organisations.id),
  contractId: uuid("contract_id").references(() => contracts.id),
  formVersionId: uuid("form_version_id").references(() => formVersions.id),
  workOrderId: uuid("work_order_id").references(() => workOrders.id),
  enumeratorId: uuid("enumerator_id").notNull().references(() => users.id),
  installerId: uuid("installer_id").references(() => installers.id),
  townId: uuid("town_id").references(() => towns.id),
  meterSizeId: uuid("meter_size_id").references(() => meterSizes.id),
  meterClassId: uuid("meter_class_id").references(() => meterClasses.id),
  meterTypeId: uuid("meter_type_id").references(() => meterTypes.id),
  status: jobStatus("status").notNull().default("draft"),
  responseCode: text("response_code"),
  draftedOn: timestamp("drafted_on", { withTimezone: true }),
  submittedOn: timestamp("submitted_on", { withTimezone: true }),
  draftName: text("draft_name"),
  lastModifiedBy: uuid("last_modified_by").references(() => users.id),
  approvalLevel: integer("approval_level"),
  rejectionMessage: text("rejection_message"),
  rejectionCount: integer("rejection_count").notNull().default(0),
  editCount: integer("edit_count").notNull().default(0),
  submitIp: text("submit_ip"),
  jobDate: date("job_date"),
  installation: installationType("installation"),
  premise: premiseType("premise"),
  companyName: text("company_name"),
  cardNumber: text("card_number"),
  jobNumber: text("job_number"),
  houseNumber: text("house_number"),
  street: text("street"),
  unitNumber: text("unit_number"),
  lotNumber: text("lot_number"),
  otherReason: text("other_reason"),
  newMeterNumber: text("new_meter_number"),
  smartDeviceNumber: text("smart_device_number"),
  smartDeviceReading: bigint("smart_device_reading", { mode: "number" }),
  oldMeterNumber: text("old_meter_number"),
  oldMeterNotOnList: boolean("old_meter_not_on_list").notNull().default(false),
  oldMeterListNote: text("old_meter_list_note"),
  oldMeterReading: bigint("old_meter_reading", { mode: "number" }),
  connectionNumber: text("connection_number"),
  connectionNotOnList: boolean("connection_not_on_list").notNull().default(false),
  connectionListNote: text("connection_list_note"),
  connectionAnsweredAt: timestamp("connection_answered_at", { withTimezone: true }),
  accountNumber: text("account_number"),
  answers: jsonb("answers").$type<Record<string, unknown>>().notNull().default({}),
  legacyRaw: jsonb("legacy_raw"),
  idempotencyKey: text("idempotency_key"),
  exportedAt: timestamp("exported_at", { withTimezone: true }),
  invoicedAt: timestamp("invoiced_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("jobs_response_code").on(table.responseCode),
  uniqueIndex("jobs_idempotency").on(table.enumeratorId, table.idempotencyKey),
  uniqueIndex("jobs_new_meter_uq").on(table.contractId, table.newMeterNumber).where(sql`${table.deletedAt} IS NULL AND ${table.newMeterNumber} IS NOT NULL`),
  uniqueIndex("jobs_smart_device_uq").on(table.contractId, table.smartDeviceNumber).where(sql`${table.deletedAt} IS NULL AND ${table.smartDeviceNumber} IS NOT NULL`),
  index("jobs_contract_status").on(table.contractId, table.status),
]);

export const jobFaults = pgTable("job_faults", {
  jobId: uuid("job_id").notNull().references(() => jobs.id),
  code: faultCode("code").notNull(),
}, (table) => [
  uniqueIndex("job_faults_pk").on(table.jobId, table.code),
]);

export const jobPhotos = pgTable("job_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").notNull().references(() => jobs.id),
  type: photoType("type").notNull(),
  sequence: integer("sequence").notNull().default(0),
  storageKey: text("storage_key"),
  legacyUrl: text("legacy_url"),
  content: bytea("content"),
  idempotencyKey: text("idempotency_key"),
  capturedAt: timestamp("captured_at", { withTimezone: true }),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  accuracy: doublePrecision("accuracy"),
  altitude: doublePrecision("altitude"),
  ...timestamps,
}, (table) => [
  uniqueIndex("job_photos_idempotency").on(table.idempotencyKey),
]);

export const qualityFlags = pgTable("quality_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").notNull().references(() => jobs.id),
  ruleId: text("rule_id").notNull(),
  severity: flagSeverity("severity").notNull(),
  message: text("message").notNull(),
  ...timestamps,
});

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").references(() => jobs.id),
  actorId: uuid("actor_id").references(() => users.id),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  field: text("field"),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  reason: text("reason"),
  ipAddress: text("ip_address"),
});

export const stockItems = pgTable("stock_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  organisationId: uuid("organisation_id").notNull().references(() => organisations.id),
  contractId: uuid("contract_id").references(() => contracts.id),
  kind: stockKind("kind").notNull(),
  serial: text("serial").notNull(),
  status: stockStatus("status").notNull().default("in_stock"),
  issuedTo: uuid("issued_to").references(() => users.id),
  jobId: uuid("job_id").references(() => jobs.id),
  ...timestamps,
}, (table) => [
  uniqueIndex("stock_items_org_serial").on(table.organisationId, table.kind, table.serial),
]);

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  organisationId: uuid("organisation_id").notNull().references(() => organisations.id),
  stockItemId: uuid("stock_item_id").notNull().references(() => stockItems.id),
  kind: stockKind("kind").notNull(),
  serial: text("serial").notNull(),
  action: stockMovement("action").notNull(),
  actorId: uuid("actor_id").references(() => users.id),
  holderId: uuid("holder_id").references(() => users.id),
  jobId: uuid("job_id").references(() => jobs.id),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("stock_movements_org_at").on(table.organisationId, table.at),
  index("stock_movements_item").on(table.stockItemId),
]);

export const exportRuns = pgTable("export_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").notNull().references(() => contracts.id),
  requestedBy: uuid("requested_by").references(() => users.id),
  status: text("status").notNull().default("queued"),
  filters: jsonb("filters").notNull().default({}),
  fileKey: text("file_key"),
  ...timestamps,
});
