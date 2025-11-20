-- Add internal storage fields to buildings table for resource collection
ALTER TABLE "buildings" ADD COLUMN IF NOT EXISTS "internal_gold" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN IF NOT EXISTS "internal_elixir" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN IF NOT EXISTS "internal_gold_capacity" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN IF NOT EXISTS "internal_elixir_capacity" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN IF NOT EXISTS "last_collected_at" timestamp DEFAULT now() NOT NULL;
