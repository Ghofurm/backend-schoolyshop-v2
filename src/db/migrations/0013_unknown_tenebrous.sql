ALTER TABLE "order_items" ADD COLUMN "weight" integer DEFAULT 1000 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "weight" integer DEFAULT 1000 NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "provider" varchar(20) DEFAULT 'local' NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "biteship_order_id" varchar(80);--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "biteship_tracking_id" varchar(80);--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "label_url" varchar(1000);--> statement-breakpoint
CREATE INDEX "shipments_biteship_order_idx" ON "shipments" USING btree ("biteship_order_id");