CREATE TABLE "meal_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"coach_id" integer NOT NULL,
	"athlete_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "meal_plans_coach_athlete" UNIQUE("coach_id","athlete_id")
);
--> statement-breakpoint
CREATE TABLE "meal_plan_meals" (
	"id" serial PRIMARY KEY NOT NULL,
	"meal_plan_id" integer NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"time_of_day" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "meal_plan_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"meal_id" integer NOT NULL,
	"position" integer NOT NULL,
	"food" text NOT NULL,
	"quantity" text
);
--> statement-breakpoint
CREATE TABLE "meal_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"athlete_id" integer NOT NULL,
	"meal_plan_id" integer NOT NULL,
	"meal_id" integer,
	"meal_name" text NOT NULL,
	"date" date NOT NULL,
	"status" text NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "meal_logs_athlete_date_meal" UNIQUE("athlete_id","date","meal_id"),
	CONSTRAINT "meal_logs_status_check" CHECK ("meal_logs"."status" IN ('done', 'other'))
);
--> statement-breakpoint
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_coach_id_athlete_id_fk" FOREIGN KEY ("coach_id","athlete_id") REFERENCES "public"."coach_athletes"("coach_id","athlete_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plan_meals" ADD CONSTRAINT "meal_plan_meals_meal_plan_id_meal_plans_id_fk" FOREIGN KEY ("meal_plan_id") REFERENCES "public"."meal_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plan_items" ADD CONSTRAINT "meal_plan_items_meal_id_meal_plan_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meal_plan_meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_athlete_id_users_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_meal_plan_id_meal_plans_id_fk" FOREIGN KEY ("meal_plan_id") REFERENCES "public"."meal_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_meal_id_meal_plan_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meal_plan_meals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meal_plans_athlete_id_idx" ON "meal_plans" USING btree ("athlete_id");--> statement-breakpoint
CREATE INDEX "meal_plan_meals_meal_plan_id_idx" ON "meal_plan_meals" USING btree ("meal_plan_id");--> statement-breakpoint
CREATE INDEX "meal_plan_items_meal_id_idx" ON "meal_plan_items" USING btree ("meal_id");--> statement-breakpoint
CREATE INDEX "meal_logs_meal_plan_id_date_idx" ON "meal_logs" USING btree ("meal_plan_id","date");--> statement-breakpoint
CREATE INDEX "meal_logs_meal_id_idx" ON "meal_logs" USING btree ("meal_id");