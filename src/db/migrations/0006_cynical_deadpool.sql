CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer,
	"product_slug" varchar(180) NOT NULL,
	"product_name" varchar(200) NOT NULL,
	"product_image" varchar(500),
	"variant_id" integer,
	"variant_sku" varchar(100),
	"variant_size" varchar(20),
	"seller_id" integer,
	"seller_name" varchar(160) NOT NULL,
	"seller_role" varchar(20) NOT NULL,
	"unit_price" integer NOT NULL,
	"price_adjustment" integer DEFAULT 0 NOT NULL,
	"qty" integer NOT NULL,
	"subtotal" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"status" varchar(30) DEFAULT 'Menunggu Pembayaran' NOT NULL,
	"payment_status" varchar(20) DEFAULT 'unpaid' NOT NULL,
	"payment_method" varchar(80),
	"subtotal" integer NOT NULL,
	"shipping_cost" integer NOT NULL,
	"total" integer NOT NULL,
	"buyer_name" varchar(120) NOT NULL,
	"buyer_email" varchar(255) NOT NULL,
	"buyer_phone" varchar(32) NOT NULL,
	"shipping_label" varchar(40),
	"recipient_name" varchar(120) NOT NULL,
	"shipping_phone" varchar(32) NOT NULL,
	"shipping_address" varchar(500),
	"shipping_area_id" varchar(64) NOT NULL,
	"shipping_district" varchar(120) NOT NULL,
	"shipping_city" varchar(120) NOT NULL,
	"shipping_province" varchar(120) NOT NULL,
	"shipping_postal_code" varchar(10) NOT NULL,
	"shipping_note" varchar(500),
	"courier_code" varchar(60) NOT NULL,
	"courier_name" varchar(60) NOT NULL,
	"courier_service" varchar(80) NOT NULL,
	"courier_eta" varchar(120) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(60) NOT NULL,
	"courier" varchar(60) NOT NULL,
	"service" varchar(80) NOT NULL,
	"description" varchar(200) NOT NULL,
	"price" integer NOT NULL,
	"eta" varchar(120) NOT NULL,
	"badge" varchar(40),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipping_rates_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_user_id_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_status_expires_idx" ON "orders" USING btree ("status","expires_at");