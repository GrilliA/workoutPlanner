import type { AthleteHome } from "../../../api";
import type {
  HomeProgram,
  SelectedWorkout,
  WorkoutChoiceSection,
  WorkoutSelection,
} from "../types";

const WEEKDAY_NAMES = [
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
  "Domenica",
] as const;

export const formatExerciseCount = (count: number): string => {
  if (count === 1) {
    return "1 esercizio";
  }
  return `${count} esercizi`;
};

const isSameSelection = (
  first: WorkoutSelection,
  second: WorkoutSelection,
): boolean =>
  first.workoutId === second.workoutId &&
  first.workoutDayId === second.workoutDayId;

const selectionExists = (
  programs: HomeProgram[],
  selection: WorkoutSelection,
): boolean => {
  const program = programs.find((item) => item.workoutId === selection.workoutId);
  if (!program) {
    return false;
  }
  return program.days.some((day) => day.id === selection.workoutDayId);
};

/** Il giorno in calendario oggi, se c'è. */
const todaySelection = (home: AthleteHome): WorkoutSelection | null => {
  if (!home.today) {
    return null;
  }
  return {
    workoutId: home.today.workoutId,
    workoutDayId: home.today.workoutDayId,
  };
};

/**
 * La scelta dell'atleta vince finché esiste ancora nelle schede
 * (un ricaricamento può averla tolta); altrimenti il giorno di oggi.
 */
export const resolveSelection = (
  home: AthleteHome,
  chosen: WorkoutSelection | null,
): WorkoutSelection | null => {
  if (chosen && selectionExists(home.programs, chosen)) {
    return chosen;
  }
  return todaySelection(home);
};

export const describeSelection = (
  home: AthleteHome,
  selection: WorkoutSelection,
): SelectedWorkout | null => {
  const program = home.programs.find(
    (item) => item.workoutId === selection.workoutId,
  );
  const day = program?.days.find((item) => item.id === selection.workoutDayId);
  if (!program || !day) {
    return null;
  }

  const today = todaySelection(home);
  const isToday = today !== null && isSameSelection(today, selection);
  return {
    programName: program.name,
    dayName: day.name,
    exerciseCount: day.exerciseCount,
    isToday,
  };
};

/** La scheda di cui la Home mostra la settimana: quella di oggi o la prima. */
export const weekWorkoutId = (home: AthleteHome): number | null => {
  if (home.today) {
    return home.today.workoutId;
  }
  return home.programs[0]?.workoutId ?? null;
};

export const hasAnyWorkoutDay = (programs: HomeProgram[]): boolean =>
  programs.some((program) => program.days.length > 0);

const describeDay = (weekdays: number[], exerciseCount: number): string => {
  const exercises = formatExerciseCount(exerciseCount);
  if (weekdays.length === 0) {
    return exercises;
  }
  const dayNames = weekdays.map((weekday) => WEEKDAY_NAMES[weekday]).join(", ");
  return `${dayNames} · ${exercises}`;
};

/** Righe del bottom sheet: una sezione per scheda, schede senza giorni escluse. */
export const buildWorkoutChoices = (
  programs: HomeProgram[],
): WorkoutChoiceSection[] =>
  programs
    .filter((program) => program.days.length > 0)
    .map((program) => ({
      workoutId: program.workoutId,
      title: program.name,
      rows: program.days.map((day) => ({
        workoutDayId: day.id,
        name: day.name,
        meta: describeDay(day.weekdays, day.exerciseCount),
      })),
    }));
