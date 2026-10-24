CREATE TABLE "coach_offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"coach_id" integer NOT NULL,
	"name" text NOT NULL,
	"price_cents" integer NOT NULL,
	"period_unit" text NOT NULL,
	"period_count" integer NOT NULL,
	"is_recurring" boolean DEFAULT true NOT NULL,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coach_offers_price_cents_check" CHECK ("coach_offers"."price_cents" >= 0),
	CONSTRAINT "coach_offers_period_count_check" CHECK ("coach_offers"."period_count" > 0),
	CONSTRAINT "coach_offers_period_unit_check" CHECK ("coach_offers"."period_unit" IN ('month', 'week'))
);
--> statement-breakpoint
CREATE TABLE "client_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"coach_id" integer NOT NULL,
	"athlete_id" integer NOT NULL,
	"offer_id" integer,
	"agreed_price_cents" integer NOT NULL,
	"period_unit" text NOT NULL,
	"period_count" integer NOT NULL,
	"is_recurring" boolean NOT NULL,
	"started_on" date NOT NULL,
	"paid_through" date NOT NULL,
	"billing_day" integer NOT NULL,
	"ended_on" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "client_subscriptions_coach_athlete" UNIQUE("coach_id","athlete_id"),
	CONSTRAINT "client_subscriptions_agreed_price_cents_check" CHECK ("client_subscriptions"."agreed_price_cents" >= 0),
	CONSTRAINT "client_subscriptions_period_count_check" CHECK ("client_subscriptions"."period_count" > 0),
	CONSTRAINT "client_subscriptions_period_unit_check" CHECK ("client_subscriptions"."period_unit" IN ('month', 'week')),
	CONSTRAINT "client_subscriptions_paid_through_check" CHECK ("client_subscriptions"."paid_through" >= "client_subscriptions"."started_on"),
	CONSTRAINT "client_subscriptions_billing_day_check" CHECK ("client_subscriptions"."billing_day" BETWEEN 1 AND 31),
	CONSTRAINT "client_subscriptions_ended_on_check" CHECK ("client_subscriptions"."ended_on" >= "client_subscriptions"."started_on")
);
--> statement-breakpoint
CREATE TABLE "subscription_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscription_id" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"paid_on" date NOT NULL,
	"method" text NOT NULL,
	"periods" integer NOT NULL,
	"covers_from" date NOT NULL,
	"covers_to" date NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_payments_amount_cents_check" CHECK ("subscription_payments"."amount_cents" >= 0),
	CONSTRAINT "subscription_payments_periods_check" CHECK ("subscription_payments"."periods" > 0),
	CONSTRAINT "subscription_payments_method_check" CHECK ("subscription_payments"."method" IN ('cash', 'bank_transfer', 'satispay', 'paypal', 'other')),
	CONSTRAINT "subscription_payments_covers_check" CHECK ("subscription_payments"."covers_to" > "subscription_payments"."covers_from")
);
--> statement-breakpoint
CREATE TABLE "subscription_pauses" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscription_id" integer NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_pauses_dates_check" CHECK ("subscription_pauses"."ends_on" >= "subscription_pauses"."starts_on")
);
--> statement-breakpoint
ALTER TABLE "coach_offers" ADD CONSTRAINT "coach_offers_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_subscriptions" ADD CONSTRAINT "client_subscriptions_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_subscriptions" ADD CONSTRAINT "client_subscriptions_athlete_id_users_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_subscriptions" ADD CONSTRAINT "client_subscriptions_offer_id_coach_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."coach_offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."client_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_pauses" ADD CONSTRAINT "subscription_pauses_subscription_id_client_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."client_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_subscriptions_athlete_id_idx" ON "client_subscriptions" USING btree ("athlete_id");--> statement-breakpoint
CREATE INDEX "subscription_payments_subscription_id_idx" ON "subscription_payments" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "subscription_pauses_subscription_id_idx" ON "subscription_pauses" USING btree ("subscription_id");