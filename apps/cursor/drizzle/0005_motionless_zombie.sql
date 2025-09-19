CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"repo" text,
	"query" text,
	"delivery_method" text NOT NULL,
	"destination" text NOT NULL,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" text PRIMARY KEY NOT NULL,
	"repo" text NOT NULL,
	"number" integer NOT NULL,
	"title" text,
	"body" text,
	"html_url" text,
	"user_login" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"labels" text,
	"raw" text,
	"first_seen" timestamp DEFAULT now(),
	"last_notified" timestamp,
	"comments" integer DEFAULT 0,
	"state" text DEFAULT 'open',
	"assignee" text,
	"language" text
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" text,
	"alert_id" uuid,
	"sent_at" timestamp DEFAULT now(),
	"delivery_method" text NOT NULL,
	"status" text DEFAULT 'pending',
	"error_message" text
);
--> statement-breakpoint
DROP TABLE "followers" CASCADE;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "follow_email";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "follower_count";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "following_count";