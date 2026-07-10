import { useCallback, useState } from "react";
import { useLocation } from "wouter";
import { ApiError } from "@api";
import { saveWorkoutWithExercises } from "./api";
import {
  DEFAULT_WORKOUT_SETTINGS,
  type CreateWorkoutStatus,
  type DraftExercise,
  type NewExerciseInput,
  type WorkoutSettings,
} from "./types";

const createClientId = (): string => crypto.randomUUID();

const toDraftExercise = (input: NewExerciseInput): DraftExercise => ({
  clientId: createClientId(),
  name: input.name.trim(),
  sets: input.sets,
  reps: input.reps,
});

export function useCreateWorkout() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [settings, setSettings] = useState<WorkoutSettings>(DEFAULT_WORKOUT_SETTINGS);
  const [status, setStatus] = useState<CreateWorkoutStatus>("idle");
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const addExercise = useCallback((input: NewExerciseInput) => {
    const trimmedName = input.name.trim();

    if (!trimmedName) {
      setFormError("Il nome dell'esercizio è obbligatorio");
      return false;
    }

    if (!Number.isInteger(input.sets) || input.sets < 1) {
      setFormError("Le serie devono essere almeno 1");
      return false;
    }

    if (!Number.isInteger(input.reps) || input.reps < 1) {
      setFormError("Le reps devono essere almeno 1");
      return false;
    }

    setFormError(null);
    setExercises((current) => [...current, toDraftExercise({ ...input, name: trimmedName })]);
    return true;
  }, []);

  const removeExercise = useCallback((clientId: string) => {
    setExercises((current) => current.filter((exercise) => exercise.clientId !== clientId));
  }, []);

  const save = useCallback(async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setStatus("error");
      setNameError("Il nome della scheda è obbligatorio");
      return;
    }

    setStatus("saving");
    setNameError(null);
    setFormError(null);

    try {
      await saveWorkoutWithExercises(trimmedName, settings, exercises);
      setLocation("/");
    } catch (err) {
      setStatus("error");
      setFormError(
        err instanceof ApiError ? err.message : "Impossibile salvare la scheda",
      );
    }
  }, [name, settings, exercises, setLocation]);

  return {
    name,
    setName,
    exercises,
    addExercise,
    removeExercise,
    settings,
    setSettings,
    status,
    nameError,
    formError,
    save,
    isSaving: status === "saving",
  };
}
