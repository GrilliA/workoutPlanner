ALTER TABLE "exercises" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "exercise_sets" ADD COLUMN "reps_max" integer;--> statement-breakpoint
ALTER TABLE "exercise_sets" ADD COLUMN "load_value" real;--> statement-breakpoint
ALTER TABLE "exercise_sets" ADD COLUMN "load_unit" text;--> statement-breakpoint
ALTER TABLE "exercise_sets" ADD COLUMN "rir" integer;