CREATE TYPE "public"."editorial_decision" AS ENUM('approve', 'reject', 'request_changes', 'approve_with_notes');--> statement-breakpoint
CREATE TYPE "public"."peer_review_status" AS ENUM('peer_reviewed', 'preprint', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."publication_status" AS ENUM('draft', 'pending_review', 'approved', 'published', 'rejected', 'archived');--> statement-breakpoint
CREATE TYPE "public"."retraction_status" AS ENUM('not_retracted', 'retracted', 'under_review', 'unknown');--> statement-breakpoint
CREATE TABLE "authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"orcid" text,
	"institution" text,
	"profile_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"parent_id" uuid,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "editorial_stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"paper_id" uuid,
	"headline" text NOT NULL,
	"deck" text,
	"description" text,
	"body" jsonb DEFAULT '{}'::jsonb,
	"key_findings" jsonb DEFAULT '{}'::jsonb,
	"limitations" jsonb DEFAULT '{}'::jsonb,
	"editorial_notes" text,
	"status" "publication_status" DEFAULT 'draft',
	"publishing_mode" text DEFAULT 'manual',
	"featured" boolean DEFAULT false,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "editorial_stories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "ingestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"status" text NOT NULL,
	"records_discovered" integer DEFAULT 0,
	"records_imported" integer DEFAULT 0,
	"records_updated" integer DEFAULT 0,
	"errors" text,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "paper_authors" (
	"paper_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"author_order" integer NOT NULL,
	CONSTRAINT "paper_authors_unique" UNIQUE("paper_id","author_id")
);
--> statement-breakpoint
CREATE TABLE "paper_categories" (
	"paper_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "paper_categories_unique" UNIQUE("paper_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "paper_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paper_id" uuid NOT NULL,
	"source_name" text NOT NULL,
	"external_id" text NOT NULL,
	"external_url" text,
	"last_synced_at" timestamp DEFAULT now(),
	"raw_metadata" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "paper_sources_unique" UNIQUE("source_name","external_id")
);
--> statement-breakpoint
CREATE TABLE "research_papers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doi" text,
	"title" text NOT NULL,
	"abstract" text,
	"publication_date" timestamp,
	"journal_name" text,
	"publisher" text,
	"peer_review_status" "peer_review_status" DEFAULT 'unknown',
	"study_type" text,
	"research_population" text,
	"retraction_status" "retraction_status" DEFAULT 'not_retracted',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "source_cursors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"cursor" text,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "source_cursors_source_unique" UNIQUE("source")
);
--> statement-breakpoint
ALTER TABLE "editorial_stories" ADD CONSTRAINT "editorial_stories_paper_id_research_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."research_papers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_authors" ADD CONSTRAINT "paper_authors_paper_id_research_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."research_papers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_authors" ADD CONSTRAINT "paper_authors_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_categories" ADD CONSTRAINT "paper_categories_paper_id_research_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."research_papers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_categories" ADD CONSTRAINT "paper_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_sources" ADD CONSTRAINT "paper_sources_paper_id_research_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."research_papers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "authors_orcid_idx" ON "authors" USING btree ("orcid");--> statement-breakpoint
CREATE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "stories_slug_idx" ON "editorial_stories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "stories_paper_idx" ON "editorial_stories" USING btree ("paper_id");--> statement-breakpoint
CREATE INDEX "stories_status_idx" ON "editorial_stories" USING btree ("status");--> statement-breakpoint
CREATE INDEX "paper_authors_paper_idx" ON "paper_authors" USING btree ("paper_id");--> statement-breakpoint
CREATE INDEX "paper_authors_author_idx" ON "paper_authors" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "sources_paper_idx" ON "paper_sources" USING btree ("paper_id");--> statement-breakpoint
CREATE INDEX "papers_doi_idx" ON "research_papers" USING btree ("doi");--> statement-breakpoint
CREATE INDEX "papers_date_idx" ON "research_papers" USING btree ("publication_date");--> statement-breakpoint
CREATE INDEX "papers_peer_review_idx" ON "research_papers" USING btree ("peer_review_status");