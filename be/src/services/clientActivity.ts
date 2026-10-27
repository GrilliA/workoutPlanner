import { addRomeDays } from "./stats";

/** Days of the window, today included. R5 reuses this rule for the drop-out risk. */
export const FREQUENCY_WINDOW_DAYS = 14;

const DAYS_PER_WEEK = 7;

export type TrainingFrequency = {
  completedSessions: number;
  expectedSessions: number | null;
};

/**
 * `completedOn` holds one Rome day per completed session, so two sessions on the same day count 2.
 * A program started inside the window still expects every week of it: the numbers stay raw.
 */
export const trainingFrequency = (input: {
  completedOn: string[];
  workoutDayCount: number | null;
  today: string;
}): TrainingFrequency => {
  const firstDayOfWindow = addRomeDays(input.today, 1 - FREQUENCY_WINDOW_DAYS);
  const completedSessions = input.completedOn.filter(
    (day) => firstDayOfWindow <= day && day <= input.today,
  ).length;
  const workoutDayCount = input.workoutDayCount ?? 0;

  // Expecting 0 sessions would make the ratio meaningless, so a program without days expects nothing.
  if (workoutDayCount === 0) {
    return { completedSessions, expectedSessions: null };
  }

  return {
    completedSessions,
    expectedSessions: (workoutDayCount * FREQUENCY_WINDOW_DAYS) / DAYS_PER_WEEK,
  };
};
