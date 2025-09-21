ALTER TABLE "notifications" DROP CONSTRAINT "notifications_issue_id_issues_id_fk";
--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "title" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "html_url" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "user_login" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "issues_repo_idx" ON "issues" USING btree ("repo");--> statement-breakpoint
CREATE INDEX "issues_created_at_idx" ON "issues" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN "number";--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN "raw";--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN "first_seen";--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN "last_notified";--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN "comments";--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN "state";--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN "assignee";--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN "language";