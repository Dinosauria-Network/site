CREATE TABLE "editorial_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"decision" "editorial_decision",
	"comments" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paper_id" uuid,
	"original_url" text NOT NULL,
	"storage_path" text,
	"caption" text,
	"attribution" text,
	"license_name" text,
	"license_url" text,
	"copyright_holder" text,
	"reuse_status" text DEFAULT 'pending_verification' NOT NULL,
	"verified_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "publication_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"user_id" uuid,
	"event_type" text NOT NULL,
	"previous_status" "publication_status",
	"new_status" "publication_status",
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "source_registry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_name" text NOT NULL,
	"display_name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp,
	"configuration" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "source_registry_source_name_unique" UNIQUE("source_name")
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"role" text DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "editorial_reviews" ADD CONSTRAINT "editorial_reviews_story_id_editorial_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."editorial_stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_paper_id_research_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."research_papers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_events" ADD CONSTRAINT "publication_events_story_id_editorial_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."editorial_stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "editorial_reviews_story_idx" ON "editorial_reviews" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "editorial_reviews_reviewer_idx" ON "editorial_reviews" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "media_assets_paper_idx" ON "media_assets" USING btree ("paper_id");--> statement-breakpoint
CREATE INDEX "media_assets_reuse_idx" ON "media_assets" USING btree ("reuse_status");--> statement-breakpoint
CREATE INDEX "publication_events_story_idx" ON "publication_events" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "publication_events_event_idx" ON "publication_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "source_registry_enabled_idx" ON "source_registry" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "user_profiles_role_idx" ON "user_profiles" USING btree ("role");