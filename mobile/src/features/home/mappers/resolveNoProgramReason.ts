import type { Workout } from "../../../api";

export type NoProgramReason =
  | "no-coach"
  | "coach-pending"
  | "coach-program-inactive";

/** Why this athlete has nothing trainable right now. Call only in that case. */
export const resolveNoProgramReason = ({
  hasLinkedCoach,
  workouts,
  userId,
}: {
  hasLinkedCoach: boolean;
  workouts: readonly Pick<Workout, "createdByUserId">[];
  userId: number | undefined;
}): NoProgramReason => {
  if (!hasLinkedCoach) {
    return "no-coach";
  }

  const hasCoachProgram = workouts.some(
    (workout) =>
      workout.createdByUserId != null && workout.createdByUserId !== userId,
  );

  return hasCoachProgram ? "coach-program-inactive" : "coach-pending";
};
