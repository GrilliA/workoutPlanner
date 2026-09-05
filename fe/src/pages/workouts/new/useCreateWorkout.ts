import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ApiError } from "@api";
import type { Weekday } from "@api/schemas/workoutday";
import { toast } from "@components/toast";
import {
  loadWorkoutDraft,
  saveWorkoutWithDays,
  updateWorkoutWithDays,
} from "./api";
import {
  findWeekdayConflict,
  reindexWorkoutDays,
  sortWeekdays,
} from "./mappers/mapWorkoutDays";
import {
  createDefaultWorkoutDay,
  createDefaultSetPrescriptions,
  DEFAULT_WORKOUT_SETTINGS,
  pickerExerciseFrom,
  type CreateWorkoutStatus,
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

const createClientId = (): string => crypto.randomUUID();

const toDraftExercise = (input: NewExerciseInput): DraftExercise => ({
  clientId: createClientId(),
  ...pickerExerciseFrom({ ...input, name: input.name.trim() }),
  setPrescriptions: input.setPrescriptions.map((entry) => ({ ...entry })),
});

const updateDay = (
  days: DraftWorkoutDay[],
  dayClientId: string,
  updater: (day: DraftWorkoutDay) => DraftWorkoutDay,
): DraftWorkoutDay[] =>
  days.map((day) => (day.clientId === dayClientId ? updater(day) : day));

export type WorkoutFormAdapters = {
  loadDraft?: (workoutId: number) => Promise<{
    name: string;
    settings: WorkoutSettings;
    days: DraftWorkoutDay[];
  }>;
  saveNew?: (
    name: string,
    settings: WorkoutSettings,
    days: DraftWorkoutDay[],
  ) => Promise<unknown>;
  saveUpdate?: (
    workoutId: number,
    name: string,
    settings: WorkoutSettings,
    days: DraftWorkoutDay[],
  ) => Promise<unknown>;
  successPath?: string;
  backHref?: string;
};

export type WorkoutDraftSeed = {
  name: string;
  settings: WorkoutSettings;
  days: DraftWorkoutDay[];
};

export function useWorkoutForm(
  workoutId?: number,
  adapters: WorkoutFormAdapters = {},
) {
  const [, setLocation] = useLocation();
  const adaptersRef = useRef(adapters);
  useEffect(() => {
    adaptersRef.current = adapters;
  });
  const initialDay = createDefaultWorkoutDay();
  const [name, setName] = useState("");
  const [days, setDays] = useState<DraftWorkoutDay[]>([initialDay]);
  const [activeDayId, setActiveDayId] = useState(initialDay.clientId);
  const [settings, setSettings] = useState<WorkoutSettings>(DEFAULT_WORKOUT_SETTINGS);
  const [status, setStatus] = useState<CreateWorkoutStatus>(
    workoutId ? "loading" : "idle",
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [notFound, setNotFound] = useState(false);
  const isEditMode = workoutId !== undefined;

  const applyDraft = (draft: WorkoutDraftSeed) => {
    const nextDays =
      draft.days.length > 0
        ? draft.days.map((day, index) => ({
            ...day,
            sortOrder: index,
            weekdays: day.weekdays as Weekday[],
          }))
        : [createDefaultWorkoutDay()];

    setName(draft.name);
    setSettings(draft.settings);
    setDays(nextDays);
    setActiveDayId(nextDays[0]?.clientId ?? "");
    setNameError(null);
    setFormError(null);
    setStatus("idle");
  };

  useEffect(() => {
    if (!workoutId) {
      return;
    }

    let cancelled = false;
    const loadDraft = adaptersRef.current.loadDraft ?? loadWorkoutDraft;

    const load = async () => {
      try {
        const draft = await loadDraft(workoutId);

        if (cancelled) {
          return;
        }

        applyDraft(draft);
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 404) {
            setNotFound(true);
            setStatus("idle");
            return;
          }

          setError(
            err instanceof ApiError
              ? err
              : new ApiError(400, "Impossibile caricare la scheda"),
          );
          setStatus("idle");
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [workoutId]);

  const activeDay =
    days.find((day) => day.clientId === activeDayId) ?? days[0] ?? null;

  const setActiveDayName = (value: string) => {
    setDays((current) =>
      updateDay(current, activeDayId, (day) => ({
        ...day,
        name: value,
      })),
    );
  };

  const addDay = () => {
    setDays((current) => {
      const next = reindexWorkoutDays([
        ...current,
        createDefaultWorkoutDay(current.length),
      ]);
      const created = next[next.length - 1];
      setActiveDayId(created.clientId);
      return next;
    });
    setFormError(null);
  };

  const removeDay = (dayClientId: string) => {
    setDays((current) => {
      if (current.length <= 1) {
        return current;
      }

      const next = reindexWorkoutDays(
        current.filter((day) => day.clientId !== dayClientId),
      );

      setActiveDayId((selected) =>
        selected === dayClientId ? next[0].clientId : selected,
      );

      return next;
    });
    setFormError(null);
  };

  const toggleWeekday = (weekday: Weekday) => {
    setDays((current) => {
      const day = current.find((item) => item.clientId === activeDayId);

      if (!day) {
        return current;
      }

      const conflict = findWeekdayConflict(current, activeDayId, weekday);
      const isSelected = day.weekdays.includes(weekday);

      if (!isSelected && conflict) {
        setFormError(
          `${conflict.name} è già programmato di ${WEEKDAY_NAMES[weekday]}`,
        );
        return current;
      }

      setFormError(null);

      return updateDay(current, activeDayId, (item) => ({
        ...item,
        weekdays: isSelected
          ? item.weekdays.filter((value) => value !== weekday)
          : sortWeekdays([...item.weekdays, weekday]),
      }));
    });
  };

  const addExercise = (input: NewExerciseInput) => {
    const trimmedName = input.name.trim();

    if (!trimmedName) {
      setFormError("Il nome dell'esercizio è obbligatorio");
      return false;
    }

    if (input.setPrescriptions.length === 0) {
      setFormError("Aggiungi almeno una serie");
      return false;
    }

    const invalidSet = input.setPrescriptions.find(
      (entry) =>
        !Number.isInteger(entry.reps) ||
        entry.reps < 1 ||
        !Number.isInteger(entry.restSec) ||
        entry.restSec < 0,
    );

    if (invalidSet) {
      setFormError("Ogni serie deve avere reps e recupero validi");
      return false;
    }

    setFormError(null);
    setDays((current) =>
      updateDay(current, activeDayId, (day) => ({
        ...day,
        exercises: [...day.exercises, toDraftExercise({ ...input, name: trimmedName })],
      })),
    );
    return true;
  };

  const removeExercise = (exerciseClientId: string) => {
    setDays((current) =>
      updateDay(current, activeDayId, (day) => ({
        ...day,
        exercises: day.exercises.filter(
          (exercise) => exercise.clientId !== exerciseClientId,
        ),
      })),
    );
  };

  const save = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setStatus("error");
      setNameError("Il nome della scheda è obbligatorio");
      return;
    }

    const invalidDay = days.find((day) => !day.name.trim());

    if (invalidDay) {
      setStatus("error");
      setActiveDayId(invalidDay.clientId);
      setFormError("Ogni giorno di allenamento deve avere un nome");
      return;
    }

    setStatus("saving");
    setNameError(null);
    setFormError(null);

    const normalizedDays = days.map((day) => ({
      ...day,
      name: day.name.trim(),
      exercises: day.exercises.map((exercise) => ({
        ...exercise,
        setPrescriptions:
          exercise.setPrescriptions.length > 0
            ? exercise.setPrescriptions
            : createDefaultSetPrescriptions(3, 10, settings.defaultRestSec),
      })),
    }));

    try {
      if (workoutId) {
        const update = adaptersRef.current.saveUpdate ?? updateWorkoutWithDays;
        await update(workoutId, trimmedName, settings, normalizedDays);
      } else {
        const create = adaptersRef.current.saveNew ?? saveWorkoutWithDays;
        await create(trimmedName, settings, normalizedDays);
      }

      toast.success("Scheda salvata");
      setLocation(adaptersRef.current.successPath ?? "/dashboard");
    } catch (err) {
      setStatus("idle");
      toast.error(
        ApiError.messageFrom(err, "Impossibile salvare la scheda"),
      );
    }
  };

  if (error) {
    throw error;
  }

  return {
    name,
    setName,
    days,
    activeDay,
    activeDayId,
    setActiveDayId,
    setActiveDayName,
    addDay,
    removeDay,
    toggleWeekday,
    addExercise,
    removeExercise,
    settings,
    setSettings,
    status,
    nameError,
    formError,
    save,
    applyDraft,
    isSaving: status === "saving",
    isLoading: status === "loading",
    isEditMode,
    notFound,
  };
}

export const useCreateWorkout = () => useWorkoutForm();
