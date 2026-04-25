CREATE TYPE "public"."audit_actor_type" AS ENUM('bar_account', 'manager', 'staff', 'system');--> statement-breakpoint
CREATE TYPE "public"."bar_account_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."inventory_count_status" AS ENUM('draft', 'submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."inventory_unit_type" AS ENUM('bottle', 'case', 'keg', 'can', 'each', 'liter', 'milliliter', 'ounce', 'pound', 'gram');--> statement-breakpoint
CREATE TYPE "public"."manager_role" AS ENUM('manager', 'admin_manager');--> statement-breakpoint
CREATE TYPE "public"."product_category" AS ENUM('liquor', 'beer', 'wine', 'mixer', 'food', 'other');--> statement-breakpoint
CREATE TYPE "public"."purchase_order_status" AS ENUM('draft', 'submitted', 'partially_received', 'received', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."stock_adjustment_type" AS ENUM('manual_correction', 'receiving', 'transfer', 'count_reconciliation', 'damage', 'return', 'other');--> statement-breakpoint
CREATE TYPE "public"."usage_reason" AS ENUM('pour', 'event', 'comp', 'recipe', 'manual_entry', 'other');--> statement-breakpoint
CREATE TYPE "public"."waste_reason" AS ENUM('spill', 'breakage', 'expired', 'overpour', 'comped', 'other');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bar_account_id" uuid NOT NULL,
	"actor_type" "audit_actor_type" NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"metadata_json" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bar_account_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bar_account_id" uuid NOT NULL,
	"default_inventory_location_id" uuid,
	"inventory_count_frequency" text,
	"low_stock_alerts_enabled" boolean DEFAULT true NOT NULL,
	"variance_alerts_enabled" boolean DEFAULT true NOT NULL,
	"settings_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bar_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"legal_name" text,
	"slug" text,
	"contact_email" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" "bar_account_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_count_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_count_id" uuid NOT NULL,
	"bar_account_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"inventory_location_id" uuid NOT NULL,
	"counted_quantity" numeric(12, 3) NOT NULL,
	"expected_quantity" numeric(12, 3),
	"variance_quantity" numeric(12, 3),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_counts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bar_account_id" uuid NOT NULL,
	"status" "inventory_count_status" DEFAULT 'draft' NOT NULL,
	"started_by_manager_id" uuid,
	"assigned_to_staff_id" uuid,
	"submitted_by_staff_id" uuid,
	"approved_by_manager_id" uuid,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bar_account_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"inventory_location_id" uuid NOT NULL,
	"quantity_on_hand" numeric(12, 3) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bar_account_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "managers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bar_account_id" uuid NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"access_code_hash" text NOT NULL,
	"role" "manager_role" DEFAULT 'manager' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bar_account_id" uuid NOT NULL,
	"supplier_id" uuid,
	"name" text NOT NULL,
	"brand" text,
	"category" "product_category" DEFAULT 'other' NOT NULL,
	"sku" text,
	"barcode" text,
	"size_ml" integer,
	"unit_type" "inventory_unit_type" DEFAULT 'each' NOT NULL,
	"cost_per_unit" numeric(12, 2),
	"selling_price" numeric(12, 2),
	"par_level" numeric(12, 3),
	"reorder_point" numeric(12, 3),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"bar_account_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity_ordered" numeric(12, 3) NOT NULL,
	"quantity_received" numeric(12, 3) DEFAULT '0',
	"unit_cost" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bar_account_id" uuid NOT NULL,
	"supplier_id" uuid,
	"created_by_manager_id" uuid,
	"order_number" text,
	"status" "purchase_order_status" DEFAULT 'draft' NOT NULL,
	"ordered_at" timestamp with time zone,
	"received_at" timestamp with time zone,
	"total_cost" numeric(12, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staff_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bar_account_id" uuid NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"role" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bar_account_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"inventory_location_id" uuid NOT NULL,
	"manager_id" uuid,
	"adjustment_type" "stock_adjustment_type" DEFAULT 'manual_correction' NOT NULL,
	"quantity_delta" numeric(12, 3) NOT NULL,
	"reason" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bar_account_id" uuid NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"email" text,
	"phone" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bar_account_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"inventory_location_id" uuid,
	"staff_member_id" uuid,
	"manager_id" uuid,
	"quantity_used" numeric(12, 3) NOT NULL,
	"reason" "usage_reason" DEFAULT 'manual_entry' NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "waste_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bar_account_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"inventory_location_id" uuid,
	"staff_member_id" uuid,
	"manager_id" uuid,
	"quantity_wasted" numeric(12, 3) NOT NULL,
	"reason" "waste_reason" DEFAULT 'other' NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_bar_account_id_bar_accounts_id_fk" FOREIGN KEY ("bar_account_id") REFERENCES "public"."bar_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bar_account_settings" ADD CONSTRAINT "bar_account_settings_bar_account_id_bar_accounts_id_fk" FOREIGN KEY ("bar_account_id") REFERENCES "public"."bar_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bar_account_settings" ADD CONSTRAINT "bar_account_settings_default_inventory_location_id_inventory_locations_id_fk" FOREIGN KEY ("default_inventory_location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bar_accounts" ADD CONSTRAINT "bar_accounts_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_count_lines" ADD CONSTRAINT "inventory_count_lines_inventory_count_id_inventory_counts_id_fk" FOREIGN KEY ("inventory_count_id") REFERENCES "public"."inventory_counts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_count_lines" ADD CONSTRAINT "inventory_count_lines_bar_account_id_bar_accounts_id_fk" FOREIGN KEY ("bar_account_id") REFERENCES "public"."bar_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_count_lines" ADD CONSTRAINT "inventory_count_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_count_lines" ADD CONSTRAINT "inventory_count_lines_inventory_location_id_inventory_locations_id_fk" FOREIGN KEY ("inventory_location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_bar_account_id_bar_accounts_id_fk" FOREIGN KEY ("bar_account_id") REFERENCES "public"."bar_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_started_by_manager_id_managers_id_fk" FOREIGN KEY ("started_by_manager_id") REFERENCES "public"."managers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_assigned_to_staff_id_staff_members_id_fk" FOREIGN KEY ("assigned_to_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_submitted_by_staff_id_staff_members_id_fk" FOREIGN KEY ("submitted_by_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_approved_by_manager_id_managers_id_fk" FOREIGN KEY ("approved_by_manager_id") REFERENCES "public"."managers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_bar_account_id_bar_accounts_id_fk" FOREIGN KEY ("bar_account_id") REFERENCES "public"."bar_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_inventory_location_id_inventory_locations_id_fk" FOREIGN KEY ("inventory_location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_locations" ADD CONSTRAINT "inventory_locations_bar_account_id_bar_accounts_id_fk" FOREIGN KEY ("bar_account_id") REFERENCES "public"."bar_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "managers" ADD CONSTRAINT "managers_bar_account_id_bar_accounts_id_fk" FOREIGN KEY ("bar_account_id") REFERENCES "public"."bar_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "managers" ADD CONSTRAINT "managers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_bar_account_id_bar_accounts_id_fk" FOREIGN KEY ("bar_account_id") REFERENCES "public"."bar_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_bar_account_id_bar_accounts_id_fk" FOREIGN KEY ("bar_account_id") REFERENCES "public"."bar_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_bar_account_id_bar_accounts_id_fk" FOREIGN KEY ("bar_account_id") REFERENCES "public"."bar_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_manager_id_managers_id_fk" FOREIGN KEY ("created_by_manager_id") REFERENCES "public"."managers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_bar_account_id_bar_accounts_id_fk" FOREIGN KEY ("bar_account_id") REFERENCES "public"."bar_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_bar_account_id_bar_accounts_id_fk" FOREIGN KEY ("bar_account_id") REFERENCES "public"."bar_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_inventory_location_id_inventory_locations_id_fk" FOREIGN KEY ("inventory_location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_manager_id_managers_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."managers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_bar_account_id_bar_accounts_id_fk" FOREIGN KEY ("bar_account_id") REFERENCES "public"."bar_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_bar_account_id_bar_accounts_id_fk" FOREIGN KEY ("bar_account_id") REFERENCES "public"."bar_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_inventory_location_id_inventory_locations_id_fk" FOREIGN KEY ("inventory_location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_staff_member_id_staff_members_id_fk" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_manager_id_managers_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."managers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "waste_logs" ADD CONSTRAINT "waste_logs_bar_account_id_bar_accounts_id_fk" FOREIGN KEY ("bar_account_id") REFERENCES "public"."bar_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "waste_logs" ADD CONSTRAINT "waste_logs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "waste_logs" ADD CONSTRAINT "waste_logs_inventory_location_id_inventory_locations_id_fk" FOREIGN KEY ("inventory_location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "waste_logs" ADD CONSTRAINT "waste_logs_staff_member_id_staff_members_id_fk" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "waste_logs" ADD CONSTRAINT "waste_logs_manager_id_managers_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."managers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_bar_account_id_idx" ON "audit_logs" USING btree ("bar_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_bar_account_created_at_idx" ON "audit_logs" USING btree ("bar_account_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bar_account_settings_bar_account_id_idx" ON "bar_account_settings" USING btree ("bar_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bar_account_settings_default_inventory_location_id_idx" ON "bar_account_settings" USING btree ("default_inventory_location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bar_accounts_owner_user_id_idx" ON "bar_accounts" USING btree ("owner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bar_accounts_slug_idx" ON "bar_accounts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_count_lines_count_id_idx" ON "inventory_count_lines" USING btree ("inventory_count_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_count_lines_bar_account_id_idx" ON "inventory_count_lines" USING btree ("bar_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_count_lines_count_product_location_idx" ON "inventory_count_lines" USING btree ("inventory_count_id","product_id","inventory_location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_counts_bar_account_id_idx" ON "inventory_counts" USING btree ("bar_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_counts_bar_account_status_idx" ON "inventory_counts" USING btree ("bar_account_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_counts_bar_account_submitted_at_idx" ON "inventory_counts" USING btree ("bar_account_id","submitted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_items_bar_account_id_idx" ON "inventory_items" USING btree ("bar_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_items_product_location_idx" ON "inventory_items" USING btree ("product_id","inventory_location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_items_product_id_idx" ON "inventory_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_items_inventory_location_id_idx" ON "inventory_items" USING btree ("inventory_location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_locations_bar_account_id_idx" ON "inventory_locations" USING btree ("bar_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_locations_bar_account_name_idx" ON "inventory_locations" USING btree ("bar_account_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "managers_bar_account_id_idx" ON "managers" USING btree ("bar_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "managers_bar_account_active_idx" ON "managers" USING btree ("bar_account_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "managers_user_id_idx" ON "managers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_bar_account_id_idx" ON "products" USING btree ("bar_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_bar_account_name_idx" ON "products" USING btree ("bar_account_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_bar_account_category_idx" ON "products" USING btree ("bar_account_id","category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_supplier_id_idx" ON "products" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_order_lines_purchase_order_id_idx" ON "purchase_order_lines" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_order_lines_bar_account_id_idx" ON "purchase_order_lines" USING btree ("bar_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_order_lines_product_id_idx" ON "purchase_order_lines" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_orders_bar_account_id_idx" ON "purchase_orders" USING btree ("bar_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_orders_bar_account_status_idx" ON "purchase_orders" USING btree ("bar_account_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_orders_supplier_id_idx" ON "purchase_orders" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_members_bar_account_id_idx" ON "staff_members" USING btree ("bar_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_members_bar_account_active_idx" ON "staff_members" USING btree ("bar_account_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_members_user_id_idx" ON "staff_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_adjustments_bar_account_id_idx" ON "stock_adjustments" USING btree ("bar_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_adjustments_product_id_idx" ON "stock_adjustments" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_adjustments_inventory_location_id_idx" ON "stock_adjustments" USING btree ("inventory_location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "suppliers_bar_account_id_idx" ON "suppliers" USING btree ("bar_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "suppliers_bar_account_name_idx" ON "suppliers" USING btree ("bar_account_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_logs_bar_account_id_idx" ON "usage_logs" USING btree ("bar_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_logs_bar_account_occurred_at_idx" ON "usage_logs" USING btree ("bar_account_id","occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_logs_product_id_idx" ON "usage_logs" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_logs_staff_member_id_idx" ON "usage_logs" USING btree ("staff_member_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waste_logs_bar_account_id_idx" ON "waste_logs" USING btree ("bar_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waste_logs_bar_account_occurred_at_idx" ON "waste_logs" USING btree ("bar_account_id","occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waste_logs_product_id_idx" ON "waste_logs" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waste_logs_staff_member_id_idx" ON "waste_logs" USING btree ("staff_member_id");