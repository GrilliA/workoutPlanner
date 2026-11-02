ALTER TABLE "client_subscriptions" ADD COLUMN "revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD COLUMN "previous_paid_through" date;--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD COLUMN "previous_billing_day" integer;--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD COLUMN "revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_pauses" ADD COLUMN "previous_paid_through" date;--> statement-breakpoint
ALTER TABLE "subscription_pauses" ADD COLUMN "previous_billing_day" integer;--> statement-breakpoint
ALTER TABLE "subscription_pauses" ADD COLUMN "revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_previous_billing_day_check" CHECK ("subscription_payments"."previous_billing_day" BETWEEN 1 AND 31);--> statement-breakpoint
ALTER TABLE "subscription_pauses" ADD CONSTRAINT "subscription_pauses_previous_billing_day_check" CHECK ("subscription_pauses"."previous_billing_day" BETWEEN 1 AND 31);