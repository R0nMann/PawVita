CREATE SCHEMA "pawvita";
--> statement-breakpoint
CREATE TYPE "pawvita"."account_status" AS ENUM('pending', 'active', 'suspended');--> statement-breakpoint
CREATE TYPE "pawvita"."advisory_category" AS ENUM('outbreak', 'vaccination', 'weather', 'treatment', 'general');--> statement-breakpoint
CREATE TYPE "pawvita"."advisory_severity" AS ENUM('info', 'low', 'moderate', 'high');--> statement-breakpoint
CREATE TYPE "pawvita"."ai_module" AS ENUM('vision', 'clinical', 'outbreak', 'combined');--> statement-breakpoint
CREATE TYPE "pawvita"."ai_review_decision" AS ENUM('accepted', 'rejected', 'modified');--> statement-breakpoint
CREATE TYPE "pawvita"."ai_status" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "pawvita"."animal_sex" AS ENUM('male', 'female', 'unknown');--> statement-breakpoint
CREATE TYPE "pawvita"."animal_status" AS ENUM('healthy', 'sick', 'under_treatment', 'recovering', 'dead', 'sold');--> statement-breakpoint
CREATE TYPE "pawvita"."attachment_kind" AS ENUM('photo', 'voice', 'document', 'lab_report');--> statement-breakpoint
CREATE TYPE "pawvita"."case_event_type" AS ENUM('created', 'status_changed', 'assigned', 'note', 'advice', 'assessment_updated', 'treatment_added', 'lab_requested', 'lab_status_changed', 'lab_result', 'vaccination_recorded', 'visit_scheduled', 'attachment_added', 'ai_assessment', 'ai_reviewed');--> statement-breakpoint
CREATE TYPE "pawvita"."case_outcome" AS ENUM('recovered', 'died', 'culled', 'false_alarm', 'other');--> statement-breakpoint
CREATE TYPE "pawvita"."case_status" AS ENUM('active', 'under_review', 'lab_pending', 'treated', 'resolved');--> statement-breakpoint
CREATE TYPE "pawvita"."lab_priority" AS ENUM('routine', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "pawvita"."lab_result" AS ENUM('positive', 'negative', 'inconclusive');--> statement-breakpoint
CREATE TYPE "pawvita"."lab_status" AS ENUM('requested', 'collected', 'received', 'processing', 'completed', 'rejected');--> statement-breakpoint
CREATE TYPE "pawvita"."notification_type" AS ENUM('case_reported', 'case_status', 'case_assigned', 'advice', 'treatment', 'lab_request', 'lab_result', 'vaccination_reminder', 'visit', 'account', 'system');--> statement-breakpoint
CREATE TYPE "pawvita"."organization_type" AS ENUM('hospital', 'lab', 'department', 'other');--> statement-breakpoint
CREATE TYPE "pawvita"."region_level" AS ENUM('country', 'state', 'district', 'block', 'village');--> statement-breakpoint
CREATE TYPE "pawvita"."risk_level" AS ENUM('low', 'moderate', 'high');--> statement-breakpoint
CREATE TYPE "pawvita"."species" AS ENUM('cattle', 'buffalo', 'goat', 'sheep', 'pig', 'poultry', 'horse', 'camel', 'other');--> statement-breakpoint
CREATE TYPE "pawvita"."user_role" AS ENUM('farmer', 'field_worker', 'vet', 'ward_staff', 'lab_tech', 'official', 'admin');--> statement-breakpoint
CREATE TYPE "pawvita"."visit_status" AS ENUM('scheduled', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "pawvita"."visit_type" AS ENUM('investigation', 'follow_up', 'vaccination', 'other');--> statement-breakpoint
CREATE SEQUENCE "pawvita"."case_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "pawvita"."lab_request_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "pawvita"."admissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"animal_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"ward" text NOT NULL,
	"reason" text,
	"case_id" uuid,
	"admitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"admitted_by_id" uuid NOT NULL,
	"discharged_at" timestamp with time zone,
	"discharged_by_id" uuid,
	"discharge_notes" text
);
--> statement-breakpoint
ALTER TABLE "pawvita"."admissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pawvita"."advisories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"translations" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"severity" "pawvita"."advisory_severity" DEFAULT 'info' NOT NULL,
	"category" "pawvita"."advisory_category" DEFAULT 'general' NOT NULL,
	"region_id" uuid,
	"disease_code" text,
	"species" "pawvita"."species"[],
	"published_by_id" uuid NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pawvita"."advisories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pawvita"."ai_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"module" "pawvita"."ai_module" NOT NULL,
	"status" "pawvita"."ai_status" DEFAULT 'pending' NOT NULL,
	"model_name" text,
	"model_version" text,
	"predictions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risk_level" "pawvita"."risk_level",
	"confidence" double precision,
	"summary" text,
	"raw" jsonb,
	"error" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"reviewed_by_id" uuid,
	"review_decision" "pawvita"."ai_review_decision",
	"review_notes" text,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "pawvita"."ai_assessments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pawvita"."animals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"herd_id" uuid NOT NULL,
	"tag_number" text,
	"name" text,
	"species" "pawvita"."species" NOT NULL,
	"breed" text,
	"sex" "pawvita"."animal_sex" DEFAULT 'unknown' NOT NULL,
	"birth_date" date,
	"status" "pawvita"."animal_status" DEFAULT 'healthy' NOT NULL,
	"died_at" timestamp with time zone,
	"notes" text,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "animals_tagNumber_unique" UNIQUE("tag_number")
);
--> statement-breakpoint
ALTER TABLE "pawvita"."animals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pawvita"."attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "pawvita"."attachment_kind" NOT NULL,
	"storage_key" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"original_name" text,
	"case_id" uuid,
	"lab_request_id" uuid,
	"animal_id" uuid,
	"uploaded_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attachments_storageKey_unique" UNIQUE("storage_key"),
	CONSTRAINT "attachments_owner" CHECK ("pawvita"."attachments"."case_id" is not null or "pawvita"."attachments"."lab_request_id" is not null or "pawvita"."attachments"."animal_id" is not null)
);
--> statement-breakpoint
ALTER TABLE "pawvita"."attachments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pawvita"."case_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"type" "pawvita"."case_event_type" NOT NULL,
	"actor_id" uuid,
	"from_status" "pawvita"."case_status",
	"to_status" "pawvita"."case_status",
	"body" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"visible_to_reporter" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pawvita"."case_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pawvita"."case_symptoms" (
	"case_id" uuid NOT NULL,
	"symptom_code" text NOT NULL,
	CONSTRAINT "case_symptoms_case_id_symptom_code_pk" PRIMARY KEY("case_id","symptom_code")
);
--> statement-breakpoint
ALTER TABLE "pawvita"."case_symptoms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pawvita"."cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_number" text NOT NULL,
	"herd_id" uuid NOT NULL,
	"animal_id" uuid,
	"reported_by_id" uuid NOT NULL,
	"status" "pawvita"."case_status" DEFAULT 'active' NOT NULL,
	"risk_level" "pawvita"."risk_level",
	"suspected_disease_code" text,
	"confirmed_disease_code" text,
	"outcome" "pawvita"."case_outcome",
	"description" text,
	"animals_affected" integer DEFAULT 1 NOT NULL,
	"animals_dead" integer DEFAULT 0 NOT NULL,
	"onset_date" date,
	"prior_treatment_notes" text,
	"prior_vaccination_notes" text,
	"lat" double precision,
	"lng" double precision,
	"location_accuracy_m" double precision,
	"region_id" uuid NOT NULL,
	"state_id" uuid,
	"district_id" uuid,
	"block_id" uuid,
	"village_id" uuid,
	"assigned_vet_id" uuid,
	"assigned_org_id" uuid,
	"captured_offline" boolean DEFAULT false NOT NULL,
	"reported_at" timestamp with time zone NOT NULL,
	"first_response_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cases_caseNumber_unique" UNIQUE("case_number"),
	CONSTRAINT "cases_animals_affected_positive" CHECK ("pawvita"."cases"."animals_affected" >= 1),
	CONSTRAINT "cases_animals_dead_non_negative" CHECK ("pawvita"."cases"."animals_dead" >= 0)
);
--> statement-breakpoint
ALTER TABLE "pawvita"."cases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pawvita"."diseases" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"notifiable" boolean DEFAULT false NOT NULL,
	"species" "pawvita"."species"[] DEFAULT '{}' NOT NULL,
	"translations" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pawvita"."diseases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pawvita"."field_visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid,
	"herd_id" uuid NOT NULL,
	"vet_id" uuid NOT NULL,
	"type" "pawvita"."visit_type" DEFAULT 'follow_up' NOT NULL,
	"status" "pawvita"."visit_status" DEFAULT 'scheduled' NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"purpose" text,
	"notes" text,
	"completed_at" timestamp with time zone,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pawvita"."field_visits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pawvita"."herds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"region_id" uuid NOT NULL,
	"state_id" uuid,
	"district_id" uuid,
	"block_id" uuid,
	"village_id" uuid,
	"lat" double precision,
	"lng" double precision,
	"address" text,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pawvita"."herds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pawvita"."lab_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_number" text NOT NULL,
	"case_id" uuid NOT NULL,
	"animal_id" uuid,
	"requested_by_id" uuid NOT NULL,
	"lab_org_id" uuid,
	"sample_type" text NOT NULL,
	"tests" text[] DEFAULT '{}' NOT NULL,
	"priority" "pawvita"."lab_priority" DEFAULT 'normal' NOT NULL,
	"status" "pawvita"."lab_status" DEFAULT 'requested' NOT NULL,
	"notes" text,
	"collected_at" timestamp with time zone,
	"received_at" timestamp with time zone,
	"processing_started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"result" "pawvita"."lab_result",
	"result_disease_code" text,
	"result_summary" text,
	"result_details" text,
	"rejection_reason" text,
	"processed_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lab_requests_requestNumber_unique" UNIQUE("request_number")
);
--> statement-breakpoint
ALTER TABLE "pawvita"."lab_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pawvita"."mortality_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"herd_id" uuid NOT NULL,
	"animal_id" uuid,
	"count" integer DEFAULT 1 NOT NULL,
	"died_on" date NOT NULL,
	"suspected_cause" text,
	"case_id" uuid,
	"reported_by_id" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mortality_count_positive" CHECK ("pawvita"."mortality_records"."count" >= 1)
);
--> statement-breakpoint
ALTER TABLE "pawvita"."mortality_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pawvita"."notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "pawvita"."notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dedupe_key" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pawvita"."notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pawvita"."organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "pawvita"."organization_type" NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"region_id" uuid,
	"address" text,
	"phone" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "pawvita"."organizations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pawvita"."regions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"level" "pawvita"."region_level" NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"lat" double precision,
	"lng" double precision,
	"state_id" uuid,
	"district_id" uuid,
	"block_id" uuid,
	"village_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "regions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "pawvita"."regions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pawvita"."symptoms" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"icon" text,
	"translations" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pawvita"."symptoms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pawvita"."treatments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid,
	"animal_id" uuid,
	"medicine" text NOT NULL,
	"dosage" text,
	"route" text,
	"frequency" text,
	"duration_days" integer,
	"start_date" date DEFAULT now() NOT NULL,
	"withdrawal_period_days" integer,
	"instructions" text,
	"notes" text,
	"prescribed_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "treatments_subject" CHECK ("pawvita"."treatments"."case_id" is not null or "pawvita"."treatments"."animal_id" is not null)
);
--> statement-breakpoint
ALTER TABLE "pawvita"."treatments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pawvita"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid,
	"role" "pawvita"."user_role" NOT NULL,
	"status" "pawvita"."account_status" DEFAULT 'pending' NOT NULL,
	"full_name" text NOT NULL,
	"phone" text,
	"email" text,
	"username" text,
	"organization_id" uuid,
	"region_id" uuid,
	"preferred_language" text DEFAULT 'en' NOT NULL,
	"created_by_id" uuid,
	"approved_by_id" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_authUserId_unique" UNIQUE("auth_user_id"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "pawvita"."users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pawvita"."vaccinations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"animal_id" uuid NOT NULL,
	"vaccine_code" text NOT NULL,
	"administered_on" date NOT NULL,
	"next_due_on" date,
	"dose_number" integer,
	"batch_number" text,
	"administered_by_id" uuid,
	"recorded_by_id" uuid NOT NULL,
	"case_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pawvita"."vaccinations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pawvita"."vaccines" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"disease_codes" text[] DEFAULT '{}' NOT NULL,
	"species" "pawvita"."species"[] DEFAULT '{}' NOT NULL,
	"booster_interval_days" integer
);
--> statement-breakpoint
ALTER TABLE "pawvita"."vaccines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pawvita"."admissions" ADD CONSTRAINT "admissions_animal_id_animals_id_fk" FOREIGN KEY ("animal_id") REFERENCES "pawvita"."animals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."admissions" ADD CONSTRAINT "admissions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "pawvita"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."admissions" ADD CONSTRAINT "admissions_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "pawvita"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."admissions" ADD CONSTRAINT "admissions_admitted_by_id_users_id_fk" FOREIGN KEY ("admitted_by_id") REFERENCES "pawvita"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."admissions" ADD CONSTRAINT "admissions_discharged_by_id_users_id_fk" FOREIGN KEY ("discharged_by_id") REFERENCES "pawvita"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."advisories" ADD CONSTRAINT "advisories_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "pawvita"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."advisories" ADD CONSTRAINT "advisories_disease_code_diseases_code_fk" FOREIGN KEY ("disease_code") REFERENCES "pawvita"."diseases"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."advisories" ADD CONSTRAINT "advisories_published_by_id_users_id_fk" FOREIGN KEY ("published_by_id") REFERENCES "pawvita"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."ai_assessments" ADD CONSTRAINT "ai_assessments_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "pawvita"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."ai_assessments" ADD CONSTRAINT "ai_assessments_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "pawvita"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."animals" ADD CONSTRAINT "animals_herd_id_herds_id_fk" FOREIGN KEY ("herd_id") REFERENCES "pawvita"."herds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."animals" ADD CONSTRAINT "animals_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "pawvita"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."attachments" ADD CONSTRAINT "attachments_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "pawvita"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."attachments" ADD CONSTRAINT "attachments_lab_request_id_lab_requests_id_fk" FOREIGN KEY ("lab_request_id") REFERENCES "pawvita"."lab_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."attachments" ADD CONSTRAINT "attachments_animal_id_animals_id_fk" FOREIGN KEY ("animal_id") REFERENCES "pawvita"."animals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."attachments" ADD CONSTRAINT "attachments_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "pawvita"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."case_events" ADD CONSTRAINT "case_events_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "pawvita"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."case_events" ADD CONSTRAINT "case_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "pawvita"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."case_symptoms" ADD CONSTRAINT "case_symptoms_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "pawvita"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."case_symptoms" ADD CONSTRAINT "case_symptoms_symptom_code_symptoms_code_fk" FOREIGN KEY ("symptom_code") REFERENCES "pawvita"."symptoms"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."cases" ADD CONSTRAINT "cases_herd_id_herds_id_fk" FOREIGN KEY ("herd_id") REFERENCES "pawvita"."herds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."cases" ADD CONSTRAINT "cases_animal_id_animals_id_fk" FOREIGN KEY ("animal_id") REFERENCES "pawvita"."animals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."cases" ADD CONSTRAINT "cases_reported_by_id_users_id_fk" FOREIGN KEY ("reported_by_id") REFERENCES "pawvita"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."cases" ADD CONSTRAINT "cases_suspected_disease_code_diseases_code_fk" FOREIGN KEY ("suspected_disease_code") REFERENCES "pawvita"."diseases"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."cases" ADD CONSTRAINT "cases_confirmed_disease_code_diseases_code_fk" FOREIGN KEY ("confirmed_disease_code") REFERENCES "pawvita"."diseases"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."cases" ADD CONSTRAINT "cases_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "pawvita"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."cases" ADD CONSTRAINT "cases_state_id_regions_id_fk" FOREIGN KEY ("state_id") REFERENCES "pawvita"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."cases" ADD CONSTRAINT "cases_district_id_regions_id_fk" FOREIGN KEY ("district_id") REFERENCES "pawvita"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."cases" ADD CONSTRAINT "cases_block_id_regions_id_fk" FOREIGN KEY ("block_id") REFERENCES "pawvita"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."cases" ADD CONSTRAINT "cases_village_id_regions_id_fk" FOREIGN KEY ("village_id") REFERENCES "pawvita"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."cases" ADD CONSTRAINT "cases_assigned_vet_id_users_id_fk" FOREIGN KEY ("assigned_vet_id") REFERENCES "pawvita"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."cases" ADD CONSTRAINT "cases_assigned_org_id_organizations_id_fk" FOREIGN KEY ("assigned_org_id") REFERENCES "pawvita"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."field_visits" ADD CONSTRAINT "field_visits_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "pawvita"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."field_visits" ADD CONSTRAINT "field_visits_herd_id_herds_id_fk" FOREIGN KEY ("herd_id") REFERENCES "pawvita"."herds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."field_visits" ADD CONSTRAINT "field_visits_vet_id_users_id_fk" FOREIGN KEY ("vet_id") REFERENCES "pawvita"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."field_visits" ADD CONSTRAINT "field_visits_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "pawvita"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."herds" ADD CONSTRAINT "herds_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "pawvita"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."herds" ADD CONSTRAINT "herds_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "pawvita"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."herds" ADD CONSTRAINT "herds_state_id_regions_id_fk" FOREIGN KEY ("state_id") REFERENCES "pawvita"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."herds" ADD CONSTRAINT "herds_district_id_regions_id_fk" FOREIGN KEY ("district_id") REFERENCES "pawvita"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."herds" ADD CONSTRAINT "herds_block_id_regions_id_fk" FOREIGN KEY ("block_id") REFERENCES "pawvita"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."herds" ADD CONSTRAINT "herds_village_id_regions_id_fk" FOREIGN KEY ("village_id") REFERENCES "pawvita"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."herds" ADD CONSTRAINT "herds_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "pawvita"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."lab_requests" ADD CONSTRAINT "lab_requests_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "pawvita"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."lab_requests" ADD CONSTRAINT "lab_requests_animal_id_animals_id_fk" FOREIGN KEY ("animal_id") REFERENCES "pawvita"."animals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."lab_requests" ADD CONSTRAINT "lab_requests_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "pawvita"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."lab_requests" ADD CONSTRAINT "lab_requests_lab_org_id_organizations_id_fk" FOREIGN KEY ("lab_org_id") REFERENCES "pawvita"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."lab_requests" ADD CONSTRAINT "lab_requests_result_disease_code_diseases_code_fk" FOREIGN KEY ("result_disease_code") REFERENCES "pawvita"."diseases"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."lab_requests" ADD CONSTRAINT "lab_requests_processed_by_id_users_id_fk" FOREIGN KEY ("processed_by_id") REFERENCES "pawvita"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."mortality_records" ADD CONSTRAINT "mortality_records_herd_id_herds_id_fk" FOREIGN KEY ("herd_id") REFERENCES "pawvita"."herds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."mortality_records" ADD CONSTRAINT "mortality_records_animal_id_animals_id_fk" FOREIGN KEY ("animal_id") REFERENCES "pawvita"."animals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."mortality_records" ADD CONSTRAINT "mortality_records_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "pawvita"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."mortality_records" ADD CONSTRAINT "mortality_records_reported_by_id_users_id_fk" FOREIGN KEY ("reported_by_id") REFERENCES "pawvita"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "pawvita"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."organizations" ADD CONSTRAINT "organizations_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "pawvita"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."regions" ADD CONSTRAINT "regions_parent_id_regions_id_fk" FOREIGN KEY ("parent_id") REFERENCES "pawvita"."regions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."regions" ADD CONSTRAINT "regions_state_id_regions_id_fk" FOREIGN KEY ("state_id") REFERENCES "pawvita"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."regions" ADD CONSTRAINT "regions_district_id_regions_id_fk" FOREIGN KEY ("district_id") REFERENCES "pawvita"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."regions" ADD CONSTRAINT "regions_block_id_regions_id_fk" FOREIGN KEY ("block_id") REFERENCES "pawvita"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."regions" ADD CONSTRAINT "regions_village_id_regions_id_fk" FOREIGN KEY ("village_id") REFERENCES "pawvita"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."treatments" ADD CONSTRAINT "treatments_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "pawvita"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."treatments" ADD CONSTRAINT "treatments_animal_id_animals_id_fk" FOREIGN KEY ("animal_id") REFERENCES "pawvita"."animals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."treatments" ADD CONSTRAINT "treatments_prescribed_by_id_users_id_fk" FOREIGN KEY ("prescribed_by_id") REFERENCES "pawvita"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "pawvita"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."users" ADD CONSTRAINT "users_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "pawvita"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."users" ADD CONSTRAINT "users_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "pawvita"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."users" ADD CONSTRAINT "users_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "pawvita"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."vaccinations" ADD CONSTRAINT "vaccinations_animal_id_animals_id_fk" FOREIGN KEY ("animal_id") REFERENCES "pawvita"."animals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."vaccinations" ADD CONSTRAINT "vaccinations_vaccine_code_vaccines_code_fk" FOREIGN KEY ("vaccine_code") REFERENCES "pawvita"."vaccines"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."vaccinations" ADD CONSTRAINT "vaccinations_administered_by_id_users_id_fk" FOREIGN KEY ("administered_by_id") REFERENCES "pawvita"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."vaccinations" ADD CONSTRAINT "vaccinations_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "pawvita"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pawvita"."vaccinations" ADD CONSTRAINT "vaccinations_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "pawvita"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admissions_organization_id_discharged_at_index" ON "pawvita"."admissions" USING btree ("organization_id","discharged_at");--> statement-breakpoint
CREATE UNIQUE INDEX "admissions_one_open_per_animal" ON "pawvita"."admissions" USING btree ("animal_id") WHERE "pawvita"."admissions"."discharged_at" is null;--> statement-breakpoint
CREATE INDEX "advisories_region_id_index" ON "pawvita"."advisories" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "advisories_published_at_index" ON "pawvita"."advisories" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "ai_assessments_case_id_index" ON "pawvita"."ai_assessments" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "animals_herd_id_index" ON "pawvita"."animals" USING btree ("herd_id");--> statement-breakpoint
CREATE INDEX "animals_species_index" ON "pawvita"."animals" USING btree ("species");--> statement-breakpoint
CREATE INDEX "attachments_case_id_index" ON "pawvita"."attachments" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "attachments_lab_request_id_index" ON "pawvita"."attachments" USING btree ("lab_request_id");--> statement-breakpoint
CREATE INDEX "attachments_animal_id_index" ON "pawvita"."attachments" USING btree ("animal_id");--> statement-breakpoint
CREATE INDEX "case_events_case_id_created_at_index" ON "pawvita"."case_events" USING btree ("case_id","created_at");--> statement-breakpoint
CREATE INDEX "cases_status_index" ON "pawvita"."cases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cases_herd_id_index" ON "pawvita"."cases" USING btree ("herd_id");--> statement-breakpoint
CREATE INDEX "cases_animal_id_index" ON "pawvita"."cases" USING btree ("animal_id");--> statement-breakpoint
CREATE INDEX "cases_reported_by_id_index" ON "pawvita"."cases" USING btree ("reported_by_id");--> statement-breakpoint
CREATE INDEX "cases_assigned_vet_id_index" ON "pawvita"."cases" USING btree ("assigned_vet_id");--> statement-breakpoint
CREATE INDEX "cases_assigned_org_id_index" ON "pawvita"."cases" USING btree ("assigned_org_id");--> statement-breakpoint
CREATE INDEX "cases_district_id_created_at_index" ON "pawvita"."cases" USING btree ("district_id","created_at");--> statement-breakpoint
CREATE INDEX "cases_block_id_index" ON "pawvita"."cases" USING btree ("block_id");--> statement-breakpoint
CREATE INDEX "cases_village_id_index" ON "pawvita"."cases" USING btree ("village_id");--> statement-breakpoint
CREATE INDEX "cases_created_at_index" ON "pawvita"."cases" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "cases_updated_at_index" ON "pawvita"."cases" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "field_visits_vet_id_scheduled_at_index" ON "pawvita"."field_visits" USING btree ("vet_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "field_visits_case_id_index" ON "pawvita"."field_visits" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "field_visits_herd_id_index" ON "pawvita"."field_visits" USING btree ("herd_id");--> statement-breakpoint
CREATE INDEX "herds_owner_id_index" ON "pawvita"."herds" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "herds_district_id_index" ON "pawvita"."herds" USING btree ("district_id");--> statement-breakpoint
CREATE INDEX "herds_block_id_index" ON "pawvita"."herds" USING btree ("block_id");--> statement-breakpoint
CREATE INDEX "herds_village_id_index" ON "pawvita"."herds" USING btree ("village_id");--> statement-breakpoint
CREATE INDEX "lab_requests_lab_org_id_status_index" ON "pawvita"."lab_requests" USING btree ("lab_org_id","status");--> statement-breakpoint
CREATE INDEX "lab_requests_case_id_index" ON "pawvita"."lab_requests" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "lab_requests_requested_by_id_index" ON "pawvita"."lab_requests" USING btree ("requested_by_id");--> statement-breakpoint
CREATE INDEX "mortality_records_herd_id_index" ON "pawvita"."mortality_records" USING btree ("herd_id");--> statement-breakpoint
CREATE INDEX "mortality_records_died_on_index" ON "pawvita"."mortality_records" USING btree ("died_on");--> statement-breakpoint
CREATE INDEX "notifications_user_id_created_at_index" ON "pawvita"."notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_user_dedupe" ON "pawvita"."notifications" USING btree ("user_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "organizations_type_index" ON "pawvita"."organizations" USING btree ("type");--> statement-breakpoint
CREATE INDEX "regions_parent_id_index" ON "pawvita"."regions" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "regions_level_index" ON "pawvita"."regions" USING btree ("level");--> statement-breakpoint
CREATE INDEX "treatments_case_id_index" ON "pawvita"."treatments" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "treatments_animal_id_index" ON "pawvita"."treatments" USING btree ("animal_id");--> statement-breakpoint
CREATE INDEX "users_role_status_index" ON "pawvita"."users" USING btree ("role","status");--> statement-breakpoint
CREATE INDEX "users_region_id_index" ON "pawvita"."users" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "users_organization_id_index" ON "pawvita"."users" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "vaccinations_animal_id_vaccine_code_administered_on_index" ON "pawvita"."vaccinations" USING btree ("animal_id","vaccine_code","administered_on");--> statement-breakpoint
CREATE INDEX "vaccinations_next_due_on_index" ON "pawvita"."vaccinations" USING btree ("next_due_on");