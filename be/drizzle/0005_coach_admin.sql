ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'athlete' NOT NULL;
--> statement-breakpoint
UPDATE "users" SET "role" = 'coach';
--> statement-breakpoint
CREATE TABLE "coach_athletes" (
	"id" serial PRIMARY KEY NOT NULL,
	"coach_id" integer NOT NULL,
	"athlete_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coach_athletes_coach_id_athlete_id_unique" UNIQUE("coach_id","athlete_id")
);
--> statement-breakpoint
ALTER TABLE "coach_athletes" ADD CONSTRAINT "coach_athletes_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "coach_athletes" ADD CONSTRAINT "coach_athletes_athlete_id_users_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workouts" ADD COLUMN "created_by_user_id" integer;
--> statement-breakpoint
ALTER TABLE "workouts" ADD COLUMN "source_template_id" integer;
--> statement-breakpoint
ALTER TABLE "workouts" ADD COLUMN "kind" text DEFAULT 'program' NOT NULL;
--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
UPDATE "workouts" SET "created_by_user_id" = "user_id";
--> statement-breakpoint
CREATE TABLE "program_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"workout_id" integer NOT NULL,
	"coach_id" integer NOT NULL,
	"athlete_id" integer NOT NULL,
	"starts_at" date NOT NULL,
	"expires_at" date NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "program_assignments" ADD CONSTRAINT "program_assignments_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "program_assignments" ADD CONSTRAINT "program_assignments_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "program_assignments" ADD CONSTRAINT "program_assignments_athlete_id_users_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
