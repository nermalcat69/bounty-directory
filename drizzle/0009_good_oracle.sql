ALTER TABLE "issues" ADD COLUMN "number" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "raw" text;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "comments" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "state" text NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "assignee" text;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "language" text;