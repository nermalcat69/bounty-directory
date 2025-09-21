-- Create fetch_metadata table for persistent tracking
CREATE TABLE IF NOT EXISTS "fetch_metadata" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create unique index on key for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS "fetch_metadata_key_idx" ON "fetch_metadata" ("key");

-- Create index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS "fetch_metadata_expires_at_idx" ON "fetch_metadata" ("expires_at");