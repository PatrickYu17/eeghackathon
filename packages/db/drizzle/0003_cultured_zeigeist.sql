CREATE TABLE IF NOT EXISTS "ai_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bar_account_id" uuid NOT NULL,
	"bar_night_id" uuid NOT NULL,
	"generated_by_manager_id" uuid,
	"provider" text DEFAULT 'teracast' NOT NULL,
	"model" text NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"title" text NOT NULL,
	"executive_summary" text,
	"report_json" jsonb,
	"markdown" text,
	"source_data_json" jsonb,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_reports" ADD CONSTRAINT "ai_reports_bar_account_id_bar_accounts_id_fk" FOREIGN KEY ("bar_account_id") REFERENCES "public"."bar_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_reports" ADD CONSTRAINT "ai_reports_bar_night_id_bar_nights_id_fk" FOREIGN KEY ("bar_night_id") REFERENCES "public"."bar_nights"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_reports" ADD CONSTRAINT "ai_reports_generated_by_manager_id_managers_id_fk" FOREIGN KEY ("generated_by_manager_id") REFERENCES "public"."managers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_reports_bar_account_id_idx" ON "ai_reports" USING btree ("bar_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_reports_bar_night_id_idx" ON "ai_reports" USING btree ("bar_night_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_reports_bar_account_created_at_idx" ON "ai_reports" USING btree ("bar_account_id","created_at");