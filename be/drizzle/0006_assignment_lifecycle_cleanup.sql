-- Cleanup legacy athlete self-service programs and sync is_active with assignments.

-- 1) Delete athlete programs that were never coach-assigned (legacy self-owned).
DELETE FROM workouts w
WHERE w.kind = 'program'
  AND EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = w.user_id AND u.role = 'athlete'
  )
  AND NOT EXISTS (
    SELECT 1 FROM program_assignments pa
    WHERE pa.workout_id = w.id
  );
--> statement-breakpoint

-- 2) Deactivate all programs first.
UPDATE workouts w
SET is_active = false
WHERE w.kind = 'program';
--> statement-breakpoint

-- 3) Activate workouts with an in-window non-revoked assignment (Rome calendar).
UPDATE workouts w
SET is_active = true
WHERE w.id IN (
  SELECT pa.workout_id
  FROM program_assignments pa
  WHERE pa.status <> 'revoked'
    AND pa.starts_at <= (now() AT TIME ZONE 'Europe/Rome')::date
    AND pa.expires_at >= (now() AT TIME ZONE 'Europe/Rome')::date
);
--> statement-breakpoint

-- 4) Normalize assignment status rows to match dates (non-revoked).
UPDATE program_assignments pa
SET status = CASE
  WHEN pa.starts_at > (now() AT TIME ZONE 'Europe/Rome')::date THEN 'scheduled'
  WHEN pa.expires_at < (now() AT TIME ZONE 'Europe/Rome')::date THEN 'expired'
  ELSE 'active'
END,
updated_at = now()
WHERE pa.status <> 'revoked';
