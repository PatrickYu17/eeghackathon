DO $$ BEGIN
 CREATE TYPE "public"."alert_severity" AS ENUM('info', 'warning', 'critical');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."alert_status" AS ENUM('open', 'acknowledged', 'resolved', 'dismissed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."alert_type" AS ENUM('low_stock', 'overpour', 'keg_check', 'reorder', 'variance', 'waste', 'sales_drop', 'system', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."app_session_actor_type" AS ENUM('manager', 'staff');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."bar_night_status" AS ENUM('open', 'closed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."inventory_category_type" AS ENUM('spirit', 'liquor', 'beer', 'wine', 'mixer', 'keg', 'food', 'custom', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."pos_estimate_source" AS ENUM('manual', 'mock', 'pos');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."staff_shift_status" AS ENUM('active', 'ended');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bar_account_id" uuid NOT NULL,
	"bar_night_id" uuid,
	"product_id" uuid,
	"category_id" uuid,
	"acknowledged_by_manager_id" uuid,
	"type" "alert_type" DEFAULT 'other' NOT NULL,
	"severity" "alert_severity" DEFAULT 'info' NOT NULL,
	"status" "alert_status" DEFAULT 'open' NOT NULL,
	"title" text NOT NULL,
	"message" text,
	"metadata_json" jsonb,
	"triggered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bar_account_id" uuid NOT NULL,
	"actor_type" "app_session_actor_type" NOT NULL,
	"manager_id" uuid,
	"staff_member_id" uuid,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bar_nights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bar_account_id" uuid NOT NULL,
	"opened_by_manager_id" uuid,
	"closed_by_manager_id" uuid,
	"business_date" date NOT NULL,
	"status" "bar_night_status" DEFAULT 'open' NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bar_account_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "inventory_category_type" DEFAULT 'other' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pos_estimates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bar_account_id" uuid NOT NULL,
	"bar_night_id" uuid NOT NULL,
	"staff_shift_id" uuid,
	"category_id" uuid,
	"product_id" uuid,
	"entered_by_manager_id" uuid,
	"entered_by_staff_id" uuid,
	"drink_count" numeric(12, 3) NOT NULL,
	"source" "pos_estimate_source" DEFAULT 'manual' NOT NULL,
	"gross_sales" numeric(12, 2),
	"net_sales" numeric(12, 2),
	"cash_sales" numeric(12, 2),
	"card_sales" numeric(12, 2),
	"comps" numeric(12, 2),
	"voids" numeric(12, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staff_shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bar_account_id" uuid NOT NULL,
	"bar_night_id" uuid NOT NULL,
	"staff_member_id" uuid NOT NULL,
	"opened_by_manager_id" uuid,
	"closed_by_manager_id" uuid,
	"status" "staff_shift_status" DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bar_accounts" ADD COLUMN IF NOT EXISTS "staff_access_code_hash" text;--> statement-breakpoint
ALTER TABLE "bar_accounts" ADD COLUMN IF NOT EXISTS "staff_access_code_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bar_accounts" ADD COLUMN IF NOT EXISTS "onboarding_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bar_accounts" ADD COLUMN IF NOT EXISTS "location" text;--> statement-breakpoint
ALTER TABLE "bar_accounts" ADD COLUMN IF NOT EXISTS "bar_size" text;--> statement-breakpoint
ALTER TABLE "managers" ADD COLUMN IF NOT EXISTS "access_code_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "managers" ADD COLUMN IF NOT EXISTS "failed_login_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "managers" ADD COLUMN IF NOT EXISTS "locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "category_id" uuid;--> statement-breakpoint
ALTER TABLE "staff_members" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD COLUMN IF NOT EXISTS "bar_night_id" uuid;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD COLUMN IF NOT EXISTS "staff_shift_id" uuid;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD COLUMN IF NOT EXISTS "category_id" uuid;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD COLUMN IF NOT EXISTS "reversed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD COLUMN IF NOT EXISTS "reversed_by_manager_id" uuid;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD COLUMN IF NOT EXISTS "reversed_by_staff_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_bar_account_id_bar_accounts_id_fk" FOREIGN KEY ("bar_account_id") REFERENCES "public"."bar_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_bar_night_id_bar_nights_id_fk" FOREIGN KEY ("bar_night_id") REFERENCES "public"."bar_nights"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_category_id_inventory_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."inventory_categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_acknowledged_by_manager_id_managers_id_fk" FOREIGN KEY ("acknowledged_by_manager_id") REFERENCES "public"."managers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "app_sessions" ADD CONSTRAINT "app_sessions_bar_account_id_bar_accounts_id_fk" FOREIGN KEY ("bar_account_id") REFERENCES "public"."bar_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "app_sessions" ADD CONSTRAINT "app_sessions_manager_id_managers_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."managers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "app_sessions" ADD CONSTRAINT "app_sessions_staff_member_id_staff_members_id_fk" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bar_nights" ADD CONSTRAINT "bar_nights_bar_account_id_bar_accounts_id_fk" FOREIGN KEY ("bar_account_id") REFERENCES "public"."bar_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bar_nights" ADD CONSTRAINT "bar_nights_opened_by_manager_id_managers_id_fk" FOREIGN KEY ("opened_by_manager_id") REFERENCES "public"."managers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bar_nights" ADD CONSTRAINT "bar_nights_closed_by_manager_id_managers_id_fk" FOREIGN KEY ("closed_by_manager_id") REFERENCES "public"."managers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_categories" ADD CONSTRAINT "inventory_categories_bar_account_id_bar_accounts_id_fk" FOREIGN KEY ("bar_account_id") REFERENCES "public"."bar_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_estimates" ADD CONSTRAINT "pos_estimates_bar_account_id_bar_accounts_id_fk" FOREIGN KEY ("bar_account_id") REFERENCES "public"."bar_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_estimates" ADD CONSTRAINT "pos_estimates_bar_night_id_bar_nights_id_fk" FOREIGN KEY ("bar_night_id") REFERENCES "public"."bar_nights"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_estimates" ADD CONSTRAINT "pos_estimates_staff_shift_id_staff_shifts_id_fk" FOREIGN KEY ("staff_shift_id") REFERENCES "public"."staff_shifts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_estimates" ADD CONSTRAINT "pos_estimates_category_id_inventory_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."inventory_categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_estimates" ADD CONSTRAINT "pos_estimates_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_estimates" ADD CONSTRAINT "pos_estimates_entered_by_manager_id_managers_id_fk" FOREIGN KEY ("entered_by_manager_id") REFERENCES "public"."managers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_estimates" ADD CONSTRAINT "pos_estimates_entered_by_staff_id_staff_members_id_fk" FOREIGN KEY ("entered_by_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_bar_account_id_bar_accounts_id_fk" FOREIGN KEY ("bar_account_id") REFERENCES "public"."bar_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_bar_night_id_bar_nights_id_fk" FOREIGN KEY ("bar_night_id") REFERENCES "public"."bar_nights"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_staff_member_id_staff_members_id_fk" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_opened_by_manager_id_managers_id_fk" FOREIGN KEY ("opened_by_manager_id") REFERENCES "public"."managers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_closed_by_manager_id_managers_id_fk" FOREIGN KEY ("closed_by_manager_id") REFERENCES "public"."managers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_bar_account_id_idx" ON "alerts" USING btree ("bar_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_bar_account_status_idx" ON "alerts" USING btree ("bar_account_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_bar_account_triggered_at_idx" ON "alerts" USING btree ("bar_account_id","triggered_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_product_id_idx" ON "alerts" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_category_id_idx" ON "alerts" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "app_sessions_bar_account_id_idx" ON "app_sessions" USING btree ("bar_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "app_sessions_token_hash_idx" ON "app_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "app_sessions_manager_id_idx" ON "app_sessions" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "app_sessions_staff_member_id_idx" ON "app_sessions" USING btree ("staff_member_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "app_sessions_expires_at_idx" ON "app_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bar_nights_bar_account_id_idx" ON "bar_nights" USING btree ("bar_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bar_nights_bar_account_business_date_idx" ON "bar_nights" USING btree ("bar_account_id","business_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bar_nights_bar_account_status_idx" ON "bar_nights" USING btree ("bar_account_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_categories_bar_account_id_idx" ON "inventory_categories" USING btree ("bar_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_categories_bar_account_type_idx" ON "inventory_categories" USING btree ("bar_account_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_categories_bar_account_name_idx" ON "inventory_categories" USING btree ("bar_account_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pos_estimates_bar_account_id_idx" ON "pos_estimates" USING btree ("bar_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pos_estimates_bar_night_id_idx" ON "pos_estimates" USING btree ("bar_night_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pos_estimates_staff_shift_id_idx" ON "pos_estimates" USING btree ("staff_shift_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pos_estimates_category_id_idx" ON "pos_estimates" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pos_estimates_product_id_idx" ON "pos_estimates" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_shifts_bar_account_id_idx" ON "staff_shifts" USING btree ("bar_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_shifts_bar_night_id_idx" ON "staff_shifts" USING btree ("bar_night_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_shifts_staff_member_id_idx" ON "staff_shifts" USING btree ("staff_member_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_shifts_bar_account_status_idx" ON "staff_shifts" USING btree ("bar_account_id","status");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_category_id_inventory_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."inventory_categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_bar_night_id_bar_nights_id_fk" FOREIGN KEY ("bar_night_id") REFERENCES "public"."bar_nights"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_staff_shift_id_staff_shifts_id_fk" FOREIGN KEY ("staff_shift_id") REFERENCES "public"."staff_shifts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_category_id_inventory_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."inventory_categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_reversed_by_manager_id_managers_id_fk" FOREIGN KEY ("reversed_by_manager_id") REFERENCES "public"."managers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_reversed_by_staff_id_staff_members_id_fk" FOREIGN KEY ("reversed_by_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_category_id_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "staff_members_bar_account_name_idx" ON "staff_members" USING btree ("bar_account_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_logs_bar_night_id_idx" ON "usage_logs" USING btree ("bar_night_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_logs_staff_shift_id_idx" ON "usage_logs" USING btree ("staff_shift_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_logs_category_id_idx" ON "usage_logs" USING btree ("category_id");
