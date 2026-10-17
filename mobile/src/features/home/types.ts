import type { AthleteHome } from "../../api";

export type HomeProgram = AthleteHome["programs"][number];
export type HomeWeekEntry = AthleteHome["week"][number];

export type WeekStripDay = {
  dateKey: string;
  weekdayLabel: string;
  dayNumber: number;
  isToday: boolean;
  workoutDayId: number | null;
  workoutDayName: string | null;
  isRest: boolean;
};

/** Il giorno che "Inizia allenamento" avvia. */
export type WorkoutSelection = {
  workoutId: number;
  workoutDayId: number;
};

/** Cosa mostra la card arancio per la selezione corrente. */
export type SelectedWorkout = {
  programName: string;
  dayName: string;
  exerciseCount: number;
  isToday: boolean;
};

/** Una scheda nel bottom sheet "Cosa vuoi allenare?". */
export type WorkoutChoiceSection = {
  workoutId: number;
  title: string;
  rows: Array<{
    workoutDayId: number;
    name: string;
    meta: string;
  }>;
};
