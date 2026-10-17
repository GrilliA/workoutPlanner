CREATE TABLE "waitlist_signups" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"ref" text,
	"consented_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"welcome_sent_at" timestamp,
	CONSTRAINT "waitlist_signups_email_unique" UNIQUE("email"),
	CONSTRAINT "waitlist_signups_role_check" CHECK ("role" IN ('coach', 'athlete'))
);
