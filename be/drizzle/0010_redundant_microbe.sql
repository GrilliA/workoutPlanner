ALTER TABLE "exercise_catalog" ADD COLUMN "name_it" text;--> statement-breakpoint
ALTER TABLE "exercise_catalog" ADD COLUMN "aliases" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "exercise_catalog" ADD COLUMN "image_url_end" text;