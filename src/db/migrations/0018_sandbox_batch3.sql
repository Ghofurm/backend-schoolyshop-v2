ALTER TABLE "payments" ADD COLUMN "refund_amount" integer;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "courier_link" varchar(1000);--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "actual_shipping_cost" integer;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "shipping_cost_difference" integer;