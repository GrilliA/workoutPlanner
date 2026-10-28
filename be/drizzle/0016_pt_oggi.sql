CREATE TABLE "coach_inbox_handled" (
	"id" serial PRIMARY KEY NOT NULL,
	"coach_id" integer NOT NULL,
	"athlete_id" integer NOT NULL,
	"handled_at" timestamp DEFAULT now() NOT NULL,
	"severity_at_handle" text NOT NULL,
	CONSTRAINT "coach_inbox_handled_coach_athlete" UNIQUE("coach_id","athlete_id"),
	CONSTRAINT "coach_inbox_handled_severity_at_handle_check" CHECK ("coach_inbox_handled"."severity_at_handle" IN ('high', 'medium', 'low'))
);
--> statement-breakpoint
ALTER TABLE "coach_inbox_handled" ADD CONSTRAINT "coach_inbox_handled_coach_id_athlete_id_fk" FOREIGN KEY ("coach_id","athlete_id") REFERENCES "public"."coach_athletes"("coach_id","athlete_id") ON DELETE cascade ON UPDATE no action;