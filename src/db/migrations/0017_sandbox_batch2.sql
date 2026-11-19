ALTER TABLE "payments" ADD COLUMN "refund_required_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "label_error" varchar(500);