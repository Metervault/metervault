CREATE TYPE "public"."contract_role" AS ENUM('technician', 'supervisor', 'admin', 'client_viewer');--> statement-breakpoint
CREATE TYPE "public"."fault_code" AS ENUM('rm', 'rp', 'rn', 'rc', 'ro', 'rv');--> statement-breakpoint
CREATE TYPE "public"."flag_severity" AS ENUM('block', 'warn', 'info');--> statement-breakpoint
CREATE TYPE "public"."form_status" AS ENUM('draft', 'published', 'retired');--> statement-breakpoint
CREATE TYPE "public"."installation_type" AS ENUM('meter_only', 'white_and_blue_box', 'non_straight');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('draft', 'submitted', 'in_review', 'approved', 'rejected', 'resubmitted');--> statement-breakpoint
CREATE TYPE "public"."org_role" AS ENUM('admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."photo_type" AS ENUM('meter_number', 'new_meter', 'old_meter', 'water_point', 'ciu_card', 'other');--> statement-breakpoint
CREATE TYPE "public"."premise_type" AS ENUM('business', 'domestic');--> statement-breakpoint
CREATE TYPE "public"."stock_kind" AS ENUM('meter', 'smart_device');--> statement-breakpoint
CREATE TYPE "public"."stock_status" AS ENUM('in_stock', 'issued', 'installed', 'returned');--> statement-breakpoint
CREATE TYPE "public"."work_order_status" AS ENUM('unassigned', 'assigned', 'in_progress', 'completed', 'exception');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid,
	"actor_id" uuid,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"field" text,
	"old_value" jsonb,
	"new_value" jsonb,
	"reason" text,
	"ip_address" text
);
--> statement-breakpoint
CREATE TABLE "contract_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"role" "contract_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"municipality_name" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"deployment_name" text NOT NULL,
	"company_name" text NOT NULL,
	"export_filename_pattern" text NOT NULL,
	"export_sheet_name" text DEFAULT 'Main' NOT NULL,
	"status_export_value" text NOT NULL,
	"approval_levels" integer DEFAULT 1 NOT NULL,
	"list_phrases" jsonb NOT NULL,
	"timezone" text DEFAULT 'Africa/Johannesburg' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "export_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"requested_by" uuid,
	"status" text DEFAULT 'queued' NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"file_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"key" text NOT NULL,
	"version" integer NOT NULL,
	"status" "form_status" DEFAULT 'draft' NOT NULL,
	"schema" jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "installers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"user_id" uuid,
	"display_name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_faults" (
	"job_id" uuid NOT NULL,
	"code" "fault_code" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"type" "photo_type" NOT NULL,
	"sequence" integer DEFAULT 0 NOT NULL,
	"storage_key" text,
	"legacy_url" text,
	"content" "bytea",
	"idempotency_key" text,
	"captured_at" timestamp with time zone,
	"latitude" double precision,
	"longitude" double precision,
	"accuracy" double precision,
	"altitude" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"form_version_id" uuid NOT NULL,
	"work_order_id" uuid,
	"enumerator_id" uuid NOT NULL,
	"installer_id" uuid,
	"town_id" uuid,
	"meter_size_id" uuid,
	"meter_class_id" uuid,
	"meter_type_id" uuid,
	"status" "job_status" DEFAULT 'draft' NOT NULL,
	"response_code" text,
	"drafted_on" timestamp with time zone,
	"submitted_on" timestamp with time zone,
	"draft_name" text,
	"last_modified_by" uuid,
	"approval_level" integer,
	"rejection_message" text,
	"rejection_count" integer DEFAULT 0 NOT NULL,
	"edit_count" integer DEFAULT 0 NOT NULL,
	"submit_ip" text,
	"job_date" date,
	"installation" "installation_type",
	"premise" "premise_type",
	"company_name" text,
	"card_number" text,
	"job_number" text,
	"house_number" text,
	"street" text,
	"unit_number" text,
	"lot_number" text,
	"other_reason" text,
	"new_meter_number" text,
	"smart_device_number" text,
	"smart_device_reading" integer,
	"old_meter_number" text,
	"old_meter_not_on_list" boolean DEFAULT false NOT NULL,
	"old_meter_list_note" text,
	"old_meter_reading" integer,
	"connection_number" text,
	"connection_not_on_list" boolean DEFAULT false NOT NULL,
	"connection_list_note" text,
	"connection_answered_at" timestamp with time zone,
	"account_number" text,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"legacy_raw" jsonb,
	"idempotency_key" text,
	"exported_at" timestamp with time zone,
	"invoiced_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meter_classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"code" text NOT NULL,
	"export_string" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meter_sizes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"code" text NOT NULL,
	"export_string" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meter_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"code" text NOT NULL,
	"export_string" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"legal_name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organisations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "quality_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"rule_id" text NOT NULL,
	"severity" "flag_severity" NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "stock_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"kind" "stock_kind" NOT NULL,
	"serial" text NOT NULL,
	"status" "stock_status" DEFAULT 'in_stock' NOT NULL,
	"issued_to" uuid,
	"job_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "towns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"name" text NOT NULL,
	"normalised_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"org_role" "org_role" DEFAULT 'member' NOT NULL,
	"name" text NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"town_id" uuid,
	"assigned_to" uuid,
	"status" "work_order_status" DEFAULT 'unassigned' NOT NULL,
	"external_ref" text,
	"house_number" text,
	"street" text,
	"unit_number" text,
	"lot_number" text,
	"old_meter_number" text,
	"connection_number" text,
	"account_number" text,
	"latitude" double precision,
	"longitude" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_grants" ADD CONSTRAINT "contract_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_grants" ADD CONSTRAINT "contract_grants_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_runs" ADD CONSTRAINT "export_runs_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_runs" ADD CONSTRAINT "export_runs_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installers" ADD CONSTRAINT "installers_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installers" ADD CONSTRAINT "installers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_faults" ADD CONSTRAINT "job_faults_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_photos" ADD CONSTRAINT "job_photos_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_form_version_id_form_versions_id_fk" FOREIGN KEY ("form_version_id") REFERENCES "public"."form_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_enumerator_id_users_id_fk" FOREIGN KEY ("enumerator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_installer_id_installers_id_fk" FOREIGN KEY ("installer_id") REFERENCES "public"."installers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_town_id_towns_id_fk" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_meter_size_id_meter_sizes_id_fk" FOREIGN KEY ("meter_size_id") REFERENCES "public"."meter_sizes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_meter_class_id_meter_classes_id_fk" FOREIGN KEY ("meter_class_id") REFERENCES "public"."meter_classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_meter_type_id_meter_types_id_fk" FOREIGN KEY ("meter_type_id") REFERENCES "public"."meter_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_last_modified_by_users_id_fk" FOREIGN KEY ("last_modified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_classes" ADD CONSTRAINT "meter_classes_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_sizes" ADD CONSTRAINT "meter_sizes_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_types" ADD CONSTRAINT "meter_types_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_flags" ADD CONSTRAINT "quality_flags_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_issued_to_users_id_fk" FOREIGN KEY ("issued_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "towns" ADD CONSTRAINT "towns_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_town_id_towns_id_fk" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contract_grants_user_contract" ON "contract_grants" USING btree ("user_id","contract_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contracts_org_code" ON "contracts" USING btree ("organisation_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "form_versions_contract_key_version" ON "form_versions" USING btree ("contract_id","key","version");--> statement-breakpoint
CREATE UNIQUE INDEX "job_faults_pk" ON "job_faults" USING btree ("job_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "job_photos_idempotency" ON "job_photos" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_response_code" ON "jobs" USING btree ("response_code");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_idempotency" ON "jobs" USING btree ("enumerator_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_new_meter_uq" ON "jobs" USING btree ("contract_id","new_meter_number") WHERE "jobs"."deleted_at" IS NULL AND "jobs"."new_meter_number" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_smart_device_uq" ON "jobs" USING btree ("contract_id","smart_device_number") WHERE "jobs"."deleted_at" IS NULL AND "jobs"."smart_device_number" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "jobs_contract_status" ON "jobs" USING btree ("contract_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_items_contract_serial" ON "stock_items" USING btree ("contract_id","kind","serial");--> statement-breakpoint
CREATE UNIQUE INDEX "towns_contract_name" ON "towns" USING btree ("contract_id","normalised_name");--> statement-breakpoint
CREATE UNIQUE INDEX "users_org_username" ON "users" USING btree ("organisation_id","username");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email" ON "users" USING btree ("email");