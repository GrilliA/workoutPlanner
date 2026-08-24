CREATE TABLE "workout_occurrences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"workout_id" integer NOT NULL,
	"workout_day_id" integer NOT NULL,
	"assignment_id" integer,
	"scheduled_date" date NOT NULL,
	"source" text NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"session_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD COLUMN "occurrence_id" integer;
--> statement-breakpoint
ALTER TABLE "workout_occurrences" ADD CONSTRAINT "workout_occurrences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workout_occurrences" ADD CONSTRAINT "workout_occurrences_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workout_occurrences" ADD CONSTRAINT "workout_occurrences_workout_day_id_workout_days_id_fk" FOREIGN KEY ("workout_day_id") REFERENCES "public"."workout_days"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workout_occurrences" ADD CONSTRAINT "workout_occurrences_assignment_id_program_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."program_assignments"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_occurrence_id_workout_occurrences_id_fk" FOREIGN KEY ("occurrence_id") REFERENCES "public"."workout_occurrences"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "workout_occurrences_user_workout_date" ON "workout_occurrences" USING btree ("user_id","workout_id","scheduled_date");
--> statement-breakpoint
CREATE INDEX "workout_occurrences_user_date_idx" ON "workout_occurrences" USING btree ("user_id","scheduled_date");
--> statement-breakpoint
CREATE INDEX "workout_occurrences_assignment_idx" ON "workout_occurrences" USING btree ("assignment_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "workout_sessions_occurrence_id_unique" ON "workout_sessions" USING btree ("occurrence_id") WHERE "occurrence_id" is not null;
