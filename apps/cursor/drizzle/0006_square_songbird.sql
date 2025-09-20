CREATE TYPE "public"."budget_range" AS ENUM('Under $500', '$500-$1000', '$1000-$2500', '$2500-$5000', '$5000-$10000', '$10000+');--> statement-breakpoint
CREATE TYPE "public"."project_type" AS ENUM('Web Development', 'Mobile App', 'Desktop App', 'API Development', 'Database Design', 'UI/UX Design', 'DevOps', 'Data Analysis', 'Machine Learning', 'Other');--> statement-breakpoint
CREATE TYPE "public"."urgency" AS ENUM('Low', 'Medium', 'High', 'Urgent');--> statement-breakpoint
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
CREATE TABLE "freelance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"company_id" uuid NOT NULL,
	"location" varchar(255),
	"description" text NOT NULL,
	"link" text,
	"workplace" "workplace" NOT NULL,
	"experience" varchar(255),
	"project_type" "project_type" NOT NULL,
	"budget_range" "budget_range" NOT NULL,
	"duration" varchar(100),
	"skills" text,
	"urgency" "urgency" DEFAULT 'Medium',
	"contact_email" varchar(255),
	"plan" "plan" DEFAULT 'standard',
	"active" boolean DEFAULT true,
	"order" integer DEFAULT 0,
	"owner_id" text,
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
DROP TABLE "mcps" CASCADE;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "freelance" ADD CONSTRAINT "freelance_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "freelance" ADD CONSTRAINT "freelance_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "slug";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "hero";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "bio";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "work";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "website";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "social_x_link";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "public";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "follow_email";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "follower_count";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "following_count";--> statement-breakpoint
ALTER TABLE "auth_user" DROP COLUMN "slug";--> statement-breakpoint
ALTER TABLE "auth_user" DROP COLUMN "hero";--> statement-breakpoint
ALTER TABLE "auth_user" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "auth_user" DROP COLUMN "bio";--> statement-breakpoint
ALTER TABLE "auth_user" DROP COLUMN "work";--> statement-breakpoint
ALTER TABLE "auth_user" DROP COLUMN "website";--> statement-breakpoint
ALTER TABLE "auth_user" DROP COLUMN "social_x_link";--> statement-breakpoint
ALTER TABLE "auth_user" DROP COLUMN "public";--> statement-breakpoint
ALTER TABLE "auth_user" DROP COLUMN "follow_email";--> statement-breakpoint
ALTER TABLE "auth_user" DROP COLUMN "follower_count";--> statement-breakpoint
ALTER TABLE "auth_user" DROP COLUMN "following_count";