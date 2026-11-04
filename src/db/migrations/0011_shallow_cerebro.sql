ALTER TABLE "orders" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "verification_decision" varchar(20);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "verification_reason" varchar(500);