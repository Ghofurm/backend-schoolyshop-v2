CREATE INDEX "order_items_seller_id_idx" ON "order_items" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "orders_payment_created_idx" ON "orders" USING btree ("payment_status","created_at");--> statement-breakpoint
CREATE INDEX "returns_status_decision_idx" ON "returns" USING btree ("status","decision_at");