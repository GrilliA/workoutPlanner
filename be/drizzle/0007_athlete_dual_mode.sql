CREATE TABLE IF NOT EXISTS "coach_invite_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"coach_id" integer NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coach_invite_codes" ADD CONSTRAINT "coach_invite_codes_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "coach_invite_codes_coach_id_unique" ON "coach_invite_codes" ("coach_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "coach_invite_codes_code_unique" ON "coach_invite_codes" ("code");
--> statement-breakpoint
DELETE FROM "coach_athletes" ca
USING "coach_athletes" newer
WHERE ca.athlete_id = newer.athlete_id
  AND ca.id > newer.id;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "coach_athletes_athlete_id_unique" ON "coach_athletes" ("athlete_id");
