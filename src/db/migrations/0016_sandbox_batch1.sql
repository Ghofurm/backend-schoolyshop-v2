ALTER TABLE "returns" ADD COLUMN "refund_proof_url" varchar(1000);--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "delivered_at" timestamp with time zone;