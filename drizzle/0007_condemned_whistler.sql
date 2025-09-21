CREATE TYPE "public"."budget_range" AS ENUM('Under $500', '$500-$1000', '$1000-$2500', '$2500-$5000', '$5000-$10000', '$10000+');--> statement-breakpoint
CREATE TYPE "public"."project_type" AS ENUM('Web Development', 'Mobile App', 'Desktop App', 'API Development', 'Database Design', 'UI/UX Design', 'DevOps', 'Data Analysis', 'Machine Learning', 'Other');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'past_due', 'incomplete', 'trialing');--> statement-breakpoint
CREATE TYPE "public"."urgency" AS ENUM('Low', 'Medium', 'High', 'Urgent');--> statement-breakpoint
CREATE TABLE "fetch_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fetch_metadata_key_unique" UNIQUE("key")
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
	"owner_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_type" text DEFAULT 'alerts_monthly' NOT NULL,
	"status" "subscription_status" DEFAULT 'incomplete' NOT NULL,
	"polar_subscription_id" text,
	"polar_customer_id" text,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_polar_subscription_id_unique" UNIQUE("polar_subscription_id")
);
--> statement-breakpoint
ALTER TABLE "account" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "avatars" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mcps" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "session" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "verification" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "account" CASCADE;--> statement-breakpoint
DROP TABLE "avatars" CASCADE;--> statement-breakpoint
DROP TABLE "mcps" CASCADE;--> statement-breakpoint
DROP TABLE "session" CASCADE;--> statement-breakpoint
DROP TABLE "verification" CASCADE;--> statement-breakpoint
ALTER TABLE "alerts" ALTER COLUMN "user_id" SET DATA TYPE uuid USING "user_id"::uuid;--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "owner_id" SET DATA TYPE uuid USING "owner_id"::uuid;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "issue_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "alert_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "sent_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "user_id" SET DATA TYPE uuid USING "user_id"::uuid;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE uuid USING "id"::uuid;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "slug" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "status" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "work" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "public" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "votes" ALTER COLUMN "user_id" SET DATA TYPE uuid USING "user_id"::uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "user_avatar_url" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "delivered" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "response_data" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "follow_email" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "follower_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "following_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "freelance" ADD CONSTRAINT "freelance_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "freelance" ADD CONSTRAINT "freelance_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fetch_metadata_key_idx" ON "fetch_metadata" USING btree ("key");--> statement-breakpoint
CREATE INDEX "fetch_metadata_expires_at_idx" ON "fetch_metadata" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "notifications_status_idx" ON "notifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
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
ALTER TABLE "auth_user" DROP COLUMN "following_count";--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "unique_alert_issue" UNIQUE("alert_id","issue_id");