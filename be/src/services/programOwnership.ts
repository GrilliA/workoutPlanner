/** Coach-assigned programs are owned by the athlete but authored by the coach. */
export const isCoachAuthoredProgram = (workout: {
  userId: number;
  createdByUserId: number | null;
}): boolean =>
  workout.createdByUserId != null && workout.createdByUserId !== workout.userId;

/** Athlete may create/edit only self-authored programs. */
export const isAthleteEditableProgram = (
  workout: { userId: number; createdByUserId: number | null },
  athleteId: number,
): boolean =>
  workout.userId === athleteId && !isCoachAuthoredProgram(workout);
