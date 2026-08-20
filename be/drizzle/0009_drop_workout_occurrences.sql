DROP INDEX IF EXISTS "workout_sessions_occurrence_id_unique";--> statement-breakpoint
ALTER TABLE "workout_sessions" DROP CONSTRAINT IF EXISTS "workout_sessions_occurrence_id_workout_occurrences_id_fk";--> statement-breakpoint
ALTER TABLE "workout_sessions" DROP COLUMN IF EXISTS "occurrence_id";--> statement-breakpoint
DROP TABLE IF EXISTS "workout_occurrences";
