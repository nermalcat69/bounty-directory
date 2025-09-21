-- Add user_avatar_url to issues table
ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "user_avatar_url" text;

-- Enhance notifications table with audit fields and constraints
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "delivered" boolean DEFAULT false NOT NULL;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "attempts" integer DEFAULT 0 NOT NULL;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "response_data" text;

-- Add constraints for notifications table (only if they don't exist)
DO $$ 
BEGIN
    -- Add unique constraint for deduplication
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_alert_issue'
    ) THEN
        ALTER TABLE "notifications" ADD CONSTRAINT "unique_alert_issue" UNIQUE("alert_id","issue_id");
    END IF;
    
    -- Add indexes for performance
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'notifications_status_idx'
    ) THEN
        CREATE INDEX "notifications_status_idx" ON "notifications" USING btree ("status");
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'notifications_created_at_idx'
    ) THEN
        CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");
    END IF;
END $$;