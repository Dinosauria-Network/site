DROP INDEX "stories_paper_idx";--> statement-breakpoint
ALTER TABLE "research_papers" ADD COLUMN "editorial_score" real;--> statement-breakpoint
ALTER TABLE "editorial_stories" ADD CONSTRAINT "stories_paper_unique" UNIQUE("paper_id");