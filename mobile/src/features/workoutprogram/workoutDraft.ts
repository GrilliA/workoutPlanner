import type {
  CatalogExercise,
  Exercise,
  WorkoutDay,
  WorkoutDetail,
  WorkoutProgramInput,
  WorkoutSettings,
  Weekday,
} from "../../api/schemas";
import {
  FREQUENCY_OPTIONS,
  REST_SEC_OPTIONS,
  WORKOUT_TYPE_OPTIONS,
} from "../../api/schemas/workout";
import {
  catalogImageUrlsFromId,
  deriveImageUrlEnd,
} from "../../api/catalogMedia";
import type { ParsedScheda } from "../../schedatxt/parseSchedaTxt";
import { exerciseHeading } from "./exerciseDisplay";
import {
  prescriptionsFromServer,
  prescriptionsFromUniform,
  toSetPrescriptions,
  validatePrescriptionDrafts,
  DEFAULT_REST_SEC,
  type DraftPrescription,
} from "./prescriptionDraft";

export type WorkoutDraftExercise = {
  key: string;
  id?: number;
  catalogId: string | null;
  name: string;
  nameIt: string | null;
  nameEn: string | null;
  imageUrl: string | null;
  imageUrlEnd: string | null;
  prescriptions: DraftPrescription[];
};

export type WorkoutDraftDay = {
  key: string;
  id?: number;
  name: string;
  weekdays: number[];
  exercises: WorkoutDraftExercise[];
};

export type WorkoutDraft = {
  name: string;
  defaultRestSec: WorkoutSettings["defaultRestSec"];
  workoutType: WorkoutSettings["workoutType"];
  days: WorkoutDraftDay[];
};

/** Monday = 0 … Sunday = 6 (Europe/Rome, same as BE). */
export const WEEKDAY_LABELS_SHORT = [
  "Lun",
  "Mar",
  "Mer",
  "Gio",
  "Ven",
  "Sab",
  "Dom",
] as const;

export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const newDraftKey = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random()}`;

const DEFAULT_WORKOUT_TYPE: WorkoutSettings["workoutType"] =
  "Forza + Ipertrofia";

export function newWorkoutDraftDay(
  existingDays: WorkoutDraftDay[],
): WorkoutDraftDay {
  const used = new Set(existingDays.flatMap((day) => day.weekdays));
  const free = [0, 1, 2, 3, 4, 5, 6].find((weekday) => !used.has(weekday));
  return {
    key: newDraftKey("day"),
    name: `Giorno ${existingDays.length + 1}`,
    weekdays: free !== undefined ? [free] : [],
    exercises: [],
  };
}

export function emptyWorkoutDraft(): WorkoutDraft {
  return {
    name: "",
    defaultRestSec: DEFAULT_REST_SEC,
    workoutType: DEFAULT_WORKOUT_TYPE,
    days: [newWorkoutDraftDay([])],
  };
}

function restSecOrDefault(value: number): WorkoutSettings["defaultRestSec"] {
  return (REST_SEC_OPTIONS as readonly number[]).includes(value)
    ? (value as WorkoutSettings["defaultRestSec"])
    : DEFAULT_REST_SEC;
}

function workoutTypeOrDefault(
  value: string,
): WorkoutSettings["workoutType"] {
  return (WORKOUT_TYPE_OPTIONS as readonly string[]).includes(value)
    ? (value as WorkoutSettings["workoutType"])
    : DEFAULT_WORKOUT_TYPE;
}

export function workoutDraftFromServer(
  detail: WorkoutDetail,
  days: WorkoutDay[],
  exercisesByDayId: Map<number, Exercise[]>,
): WorkoutDraft {
  const defaultRestSec = restSecOrDefault(detail.defaultRestSec);

  return {
    name: detail.name,
    defaultRestSec,
    workoutType: workoutTypeOrDefault(detail.workoutType),
    days: [...days]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((day) => ({
        key: newDraftKey("day"),
        id: day.id,
        name: day.name,
        weekdays: [...day.weekdays],
        exercises: (exercisesByDayId.get(day.id) ?? []).map((exercise) => ({
          key: newDraftKey("ex"),
          id: exercise.id,
          catalogId: exercise.catalogId ?? null,
          name: exercise.name,
          nameIt: exercise.nameIt ?? null,
          nameEn: exercise.nameEn ?? null,
          imageUrl: exercise.imageUrl ?? null,
          imageUrlEnd: exercise.imageUrlEnd ?? null,
          prescriptions: prescriptionsFromServer(
            exercise.setPrescriptions,
            defaultRestSec,
          ),
        })),
      })),
  };
}

export function workoutDraftFromSchedaTxt(parsed: ParsedScheda): WorkoutDraft {
  return {
    name: parsed.name,
    defaultRestSec: parsed.settings.defaultRestSec,
    workoutType: parsed.settings.workoutType,
    days: [...parsed.days]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((day) => ({
        key: newDraftKey("day"),
        name: day.name,
        weekdays: [...day.weekdays],
        exercises: day.exercises.map((exercise) => {
          const media = exercise.catalogId
            ? catalogImageUrlsFromId(exercise.catalogId)
            : null;
          return {
            key: newDraftKey("ex"),
            catalogId: exercise.catalogId ?? null,
            name: exercise.name,
            nameIt: null,
            nameEn: null,
            imageUrl: media?.imageUrl ?? null,
            imageUrlEnd: media?.imageUrlEnd ?? null,
            prescriptions: prescriptionsFromServer(
              exercise.setPrescriptions,
              parsed.settings.defaultRestSec,
            ),
          };
        }),
      })),
  };
}

export function workoutDraftExerciseFromCatalog(
  item: CatalogExercise,
  restSec: number,
): WorkoutDraftExercise {
  return {
    key: newDraftKey("ex"),
    catalogId: item.id,
    name: item.nameIt ?? item.name,
    nameIt: item.nameIt ?? null,
    nameEn: item.name,
    imageUrl: item.imageUrl,
    imageUrlEnd: item.imageUrlEnd ?? deriveImageUrlEnd(item.imageUrl),
    prescriptions: prescriptionsFromUniform(3, 10, restSec),
  };
}

export function validateWorkoutDraft(draft: WorkoutDraft): string | null {
  if (draft.name.trim().length === 0) {
    return "Dai un nome alla scheda";
  }

  if (draft.days.length === 0) {
    return "Aggiungi almeno un giorno";
  }

  const assignedWeekdays = new Set<number>();
  for (const day of draft.days) {
    if (day.name.trim().length === 0) {
      return "Ogni giorno deve avere un nome";
    }

    for (const weekday of day.weekdays) {
      if (assignedWeekdays.has(weekday)) {
        return `${WEEKDAY_LABELS_SHORT[weekday] ?? "Giorno"} è assegnato a più giorni`;
      }
      assignedWeekdays.add(weekday);
    }

    for (const exercise of day.exercises) {
      if (exercise.name.trim().length === 0) {
        return "Ogni esercizio deve avere un nome";
      }

      const invalid = validatePrescriptionDrafts(exercise.prescriptions);
      if (invalid) {
        return `${exerciseHeading(exercise)}: ${invalid}`;
      }
    }
  }

  if (draft.days.every((day) => day.exercises.length === 0)) {
    return "Aggiungi almeno un esercizio";
  }

  return null;
}

function frequencyFromDraft(
  draft: WorkoutDraft,
): WorkoutSettings["frequency"] {
  const distinctWeekdays = new Set(
    draft.days.flatMap((day) => day.weekdays),
  ).size;
  const count = distinctWeekdays > 0 ? distinctWeekdays : draft.days.length;
  const clamped = Math.min(5, Math.max(2, count));
  return FREQUENCY_OPTIONS[clamped - 2];
}

export function toWorkoutProgramInput(
  draft: WorkoutDraft,
): WorkoutProgramInput {
  return {
    name: draft.name.trim(),
    defaultRestSec: draft.defaultRestSec,
    workoutType: draft.workoutType,
    frequency: frequencyFromDraft(draft),
    days: draft.days.map((day, index) => ({
      ...(day.id !== undefined ? { id: day.id } : {}),
      name: day.name.trim(),
      sortOrder: index,
      weekdays: day.weekdays as Weekday[],
      exercises: day.exercises.map((exercise) => ({
        ...(exercise.id !== undefined ? { id: exercise.id } : {}),
        name: exercise.name.trim(),
        catalogId: exercise.catalogId,
        setPrescriptions: toSetPrescriptions(exercise.prescriptions),
      })),
    })),
  };
}
