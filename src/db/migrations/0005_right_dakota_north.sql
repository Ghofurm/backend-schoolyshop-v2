CREATE TABLE "addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"label" varchar(40) NOT NULL,
	"recipient_name" varchar(120) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"address" varchar(500),
	"area_id" varchar(64) NOT NULL,
	"district" varchar(120) NOT NULL,
	"city" varchar(120) NOT NULL,
	"province" varchar(120) NOT NULL,
	"postal_code" varchar(10) NOT NULL,
	"note" varchar(500),
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "addresses_user_id_idx" ON "addresses" USING btree ("user_id");