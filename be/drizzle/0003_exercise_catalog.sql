CREATE TABLE "exercise_catalog" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"force" text,
	"level" text,
	"mechanic" text,
	"equipment" text,
	"primary_muscles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"secondary_muscles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"category" text,
	"image_url" text
);
--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "catalog_id" text;
--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_catalog_id_exercise_catalog_id_fk" FOREIGN KEY ("catalog_id") REFERENCES "public"."exercise_catalog"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "exercise_catalog_name_idx" ON "exercise_catalog" USING btree ("name");
--> statement-breakpoint
CREATE INDEX "exercise_catalog_equipment_idx" ON "exercise_catalog" USING btree ("equipment");
--> statement-breakpoint
CREATE INDEX "exercise_catalog_level_idx" ON "exercise_catalog" USING btree ("level");
