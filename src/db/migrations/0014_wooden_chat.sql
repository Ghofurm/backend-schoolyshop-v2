ALTER TABLE "payments" ADD COLUMN "provider" varchar(20) DEFAULT 'local' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "external_order_id" varchar(100);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "external_id" varchar(100);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "biller_code" varchar(20);--> statement-breakpoint
CREATE UNIQUE INDEX "payments_external_order_unique" ON "payments" USING btree ("external_order_id");