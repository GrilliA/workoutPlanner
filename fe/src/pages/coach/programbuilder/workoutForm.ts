import type { Weekday } from "@api/schemas/workoutday";
import {
  findWeekdayConflict,
  reindexWorkoutDays,
  sortWeekdays,
} from "./mappers/mapWorkoutDays";
import {
  createDefaultSetPrescriptions,
  createDefaultWorkoutDay,
  DEFAULT_WORKOUT_SETTINGS,
  pickerExerciseFrom,
  type DraftExercise,
  type DraftWorkoutDay,
  type NewExerciseInput,
  type WorkoutSettings,
} from "./types";

const WEEKDAY_NAMES = [
  "lunedì",
  "martedì",
  "mercoledì",
  "giovedì",
  "venerdì",
  "sabato",
  "domenica",
] as const;

export type WorkoutDraftSeed = {
  name: string;
  settings: WorkoutSettings;
  days: DraftWorkoutDay[];
};

export type WorkoutForm = {
  name: string;
  days: DraftWorkoutDay[];
  activeDayId: string;
  settings: WorkoutSettings;
  nameError: string | null;
  formError: string | null;
  isSaving: boolean;
};

export type SaveCheck =
  | { isValid: false; form: WorkoutForm }
  | { isValid: true; name: string; days: DraftWorkoutDay[] };

const updateDay = (
  days: DraftWorkoutDay[],
  dayClientId: string,
  updater: (day: DraftWorkoutDay) => DraftWorkoutDay,
): DraftWorkoutDay[] =>
  days.map((day) => (day.clientId === dayClientId ? updater(day) : day));

const updateActiveDay = (
  form: WorkoutForm,
  updater: (day: DraftWorkoutDay) => DraftWorkoutDay,
): WorkoutForm => ({
  ...form,
  days: updateDay(form.days, form.activeDayId, updater),
});

export function createWorkoutForm(draft?: WorkoutDraftSeed | null): WorkoutForm {
  const hasDays = draft !== null && draft !== undefined && draft.days.length > 0;
  const days = hasDays ? reindexWorkoutDays(draft.days) : [createDefaultWorkoutDay()];

  return {
    name: draft?.name ?? "",
    days,
    activeDayId: days[0].clientId,
    settings: draft?.settings ?? DEFAULT_WORKOUT_SETTINGS,
    nameError: null,
    formError: null,
    isSaving: false,
  };
}

export function findActiveDay(form: WorkoutForm): DraftWorkoutDay {
  const activeDay = form.days.find((day) => day.clientId === form.activeDayId);
  return activeDay ?? form.days[0];
}

export function renameActiveDay(form: WorkoutForm, name: string): WorkoutForm {
  return updateActiveDay(form, (day) => ({ ...day, name }));
}

export function addDay(form: WorkoutForm, dayClientId: string): WorkoutForm {
  const newDay = createDefaultWorkoutDay(form.days.length, dayClientId);

  return {
    ...form,
    days: reindexWorkoutDays([...form.days, newDay]),
    activeDayId: dayClientId,
    formError: null,
  };
}

export function removeDay(form: WorkoutForm, dayClientId: string): WorkoutForm {
  if (form.days.length <= 1) {
    return form;
  }

  const days = reindexWorkoutDays(
    form.days.filter((day) => day.clientId !== dayClientId),
  );
  const removedActiveDay = form.activeDayId === dayClientId;
  const activeDayId = removedActiveDay ? days[0].clientId : form.activeDayId;

  return { ...form, days, activeDayId, formError: null };
}

export function toggleWeekday(form: WorkoutForm, weekday: Weekday): WorkoutForm {
  const activeDay = findActiveDay(form);
  const isSelected = activeDay.weekdays.includes(weekday);
  const conflict = findWeekdayConflict(form.days, activeDay.clientId, weekday);

  if (!isSelected && conflict) {
    return {
      ...form,
      formError: `${conflict.name} è già programmato di ${WEEKDAY_NAMES[weekday]}`,
    };
  }

  const weekdays = isSelected
    ? activeDay.weekdays.filter((value) => value !== weekday)
    : sortWeekdays([...activeDay.weekdays, weekday]);
  const withWeekdays = updateActiveDay(form, (day) => ({ ...day, weekdays }));

  return { ...withWeekdays, formError: null };
}

export function findExerciseInputError(input: NewExerciseInput): string | null {
  if (!input.name.trim()) {
    return "Il nome dell'esercizio è obbligatorio";
  }

  if (input.setPrescriptions.length === 0) {
    return "Aggiungi almeno una serie";
  }

  const hasInvalidSet = input.setPrescriptions.some(
    (entry) =>
      !Number.isInteger(entry.reps) ||
      entry.reps < 1 ||
      !Number.isInteger(entry.restSec) ||
      entry.restSec < 0,
  );

  if (hasInvalidSet) {
    return "Ogni serie deve avere reps e recupero validi";
  }

  return null;
}

export function addExercise(
  form: WorkoutForm,
  input: NewExerciseInput,
  exerciseClientId: string,
): WorkoutForm {
  const exercise: DraftExercise = {
    clientId: exerciseClientId,
    ...pickerExerciseFrom({ ...input, name: input.name.trim() }),
    setPrescriptions: input.setPrescriptions.map((entry) => ({ ...entry })),
  };
  const withExercise = updateActiveDay(form, (day) => ({
    ...day,
    exercises: [...day.exercises, exercise],
  }));

  return { ...withExercise, formError: null };
}

export function removeExercise(form: WorkoutForm, exerciseClientId: string): WorkoutForm {
  return updateActiveDay(form, (day) => ({
    ...day,
    exercises: day.exercises.filter(
      (exercise) => exercise.clientId !== exerciseClientId,
    ),
  }));
}

const withDefaultSets = (
  exercise: DraftExercise,
  defaultRestSec: number,
): DraftExercise => {
  if (exercise.setPrescriptions.length > 0) {
    return exercise;
  }

  return {
    ...exercise,
    setPrescriptions: createDefaultSetPrescriptions(3, 10, defaultRestSec),
  };
};

export function checkBeforeSave(form: WorkoutForm): SaveCheck {
  const name = form.name.trim();

  if (!name) {
    return {
      isValid: false,
      form: { ...form, nameError: "Il nome della scheda è obbligatorio" },
    };
  }

  const unnamedDay = form.days.find((day) => !day.name.trim());

  if (unnamedDay) {
    return {
      isValid: false,
      form: {
        ...form,
        nameError: null,
        activeDayId: unnamedDay.clientId,
        formError: "Ogni giorno di allenamento deve avere un nome",
      },
    };
  }

  const days = form.days.map((day) => ({
    ...day,
    name: day.name.trim(),
    exercises: day.exercises.map((exercise) =>
      withDefaultSets(exercise, form.settings.defaultRestSec),
    ),
  }));

  return { isValid: true, name, days };
}
