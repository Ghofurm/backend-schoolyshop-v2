ALTER TABLE "categories" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "status" varchar(20) DEFAULT 'Aktif' NOT NULL;--> statement-breakpoint
ALTER TABLE "sellers" ADD COLUMN "business" varchar(160);--> statement-breakpoint
ALTER TABLE "sellers" ADD COLUMN "type" varchar(120);--> statement-breakpoint
ALTER TABLE "sellers" ADD COLUMN "kk" varchar(32);--> statement-breakpoint
ALTER TABLE "sellers" ADD COLUMN "address" varchar(500);--> statement-breakpoint
ALTER TABLE "sellers" ADD COLUMN "whatsapp" varchar(32);--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_name_unique" UNIQUE("name");