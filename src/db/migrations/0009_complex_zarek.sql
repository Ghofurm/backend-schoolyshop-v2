CREATE TABLE "shipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"courier_code" varchar(60) NOT NULL,
	"courier" varchar(60) NOT NULL,
	"service" varchar(80) NOT NULL,
	"tracking_number" varchar(60) NOT NULL,
	"status" varchar(20) DEFAULT 'Dikirim' NOT NULL,
	"recipient_name" varchar(120) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"address" varchar(500),
	"area_id" varchar(64) NOT NULL,
	"district" varchar(120) NOT NULL,
	"city" varchar(120) NOT NULL,
	"province" varchar(120) NOT NULL,
	"postal_code" varchar(10) NOT NULL,
	"note" varchar(500),
	"shipped_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipments_order_id_unique" UNIQUE("order_id"),
	CONSTRAINT "shipments_tracking_number_unique" UNIQUE("tracking_number")
);
--> statement-breakpoint
CREATE TABLE "tracking_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipment_id" integer NOT NULL,
	"status" varchar(50) NOT NULL,
	"location" varchar(200) NOT NULL,
	"description" varchar(500) NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shipments_status_idx" ON "shipments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "shipments_courier_idx" ON "shipments" USING btree ("courier");--> statement-breakpoint
CREATE INDEX "tracking_events_shipment_id_idx" ON "tracking_events" USING btree ("shipment_id");