import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ApiError } from "@api";
import type { Weekday } from "@api/schemas/workoutday";
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
  name: input.name.trim(),
  setPrescriptions: input.setPrescriptions.map((entry) => ({ ...entry })),
});

const updateDay = (
  days: DraftWorkoutDay[],
  dayClientId: string,
  updater: (day: DraftWorkoutDay) => DraftWorkoutDay,
): DraftWorkoutDay[] =>
  days.map((day) => (day.clientId === dayClientId ? updater(day) : day));

export function useWorkoutForm(workoutId?: number) {
  const [, setLocation] = useLocation();
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

  useEffect(() => {
    if (!workoutId) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setStatus("loading");
      setFormError(null);

      try {
        const draft = await loadWorkoutDraft(workoutId);

        if (cancelled) {
          return;
        }

        setName(draft.name);
        setSettings(draft.settings);
        setDays(draft.days);
        setActiveDayId(draft.days[0]?.clientId ?? "");
        setStatus("idle");
      } catch {
        if (cancelled) {
          return;
        }

        setStatus("error");
        setFormError("Impossibile caricare la scheda");
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
        await updateWorkoutWithDays(
          workoutId,
          trimmedName,
          settings,
          normalizedDays,
        );
      } else {
        await saveWorkoutWithDays(trimmedName, settings, normalizedDays);
      }

      setLocation("/workouts");
    } catch (err) {
      setStatus("error");
      setFormError(
        err instanceof ApiError ? err.message : "Impossibile salvare la scheda",
      );
    }
  };

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
    isSaving: status === "saving",
    isLoading: status === "loading",
    isEditMode: workoutId !== undefined,
  };
}

export const useCreateWorkout = () => useWorkoutForm();
