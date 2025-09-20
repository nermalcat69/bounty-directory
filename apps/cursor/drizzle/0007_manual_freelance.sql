-- Create freelance-related enums if they don't exist
DO $$ BEGIN
    CREATE TYPE "public"."budget_range" AS ENUM('Under $500', '$500-$1000', '$1000-$2500', '$2500-$5000', '$5000-$10000', '$10000+');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."project_type" AS ENUM('Web Development', 'Mobile App', 'Desktop App', 'API Development', 'Database Design', 'UI/UX Design', 'DevOps', 'Data Analysis', 'Machine Learning', 'Other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."urgency" AS ENUM('Low', 'Medium', 'High', 'Urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create freelance table
CREATE TABLE IF NOT EXISTS "freelance" (
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

-- Add foreign key constraints
ALTER TABLE "freelance" ADD CONSTRAINT "freelance_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;

-- Note: owner_id references auth_user.id (text), not users.id (uuid)
-- This will be handled in the application logic through syncUserToMainTable