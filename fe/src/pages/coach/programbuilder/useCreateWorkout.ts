import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ApiError, useQuery } from "@api";
import type { Weekday } from "@api/schemas/workoutday";
import { toast } from "@components/toast";
import type {
  DraftWorkoutDay,
  NewExerciseInput,
  WorkoutSettings,
} from "./types";
import * as workoutForm from "./workoutForm";
import type { WorkoutDraftSeed } from "./workoutForm";

export type WorkoutFormAdapters = {
  loadDraft?: (
    workoutId: number,
    options?: { signal?: AbortSignal },
  ) => Promise<{
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
  successPath: string;
  backHref: string;
};

export function useWorkoutDraft(
  workoutId: number | undefined,
  adapters: WorkoutFormAdapters,
) {
  const adaptersRef = useRef(adapters);
  useEffect(() => {
    adaptersRef.current = adapters;
  });
  const isEditMode = workoutId !== undefined;

  const { data, isPending } = useQuery({
    queryKey: [
      "workout-draft",
      workoutId ?? "new",
      adapters.successPath,
    ],
    queryFn: async ({ signal }) => {
      if (workoutId == null) {
        return null;
      }

      try {
        const loadDraft = adaptersRef.current.loadDraft;
        if (!loadDraft) {
          throw new Error("WorkoutFormAdapters.loadDraft is required to edit a workout");
        }

        return await loadDraft(workoutId, { signal });
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          return null;
        }

        throw err;
      }
    },
    fallback: "Impossibile caricare la scheda",
  });

  return {
    draft: data ?? null,
    isLoading: isEditMode && isPending,
    notFound: isEditMode && !isPending && data === null,
  };
}

export function useWorkoutForm(
  workoutId: number | undefined,
  adapters: WorkoutFormAdapters,
  initialDraft?: WorkoutDraftSeed | null,
) {
  const [, setLocation] = useLocation();
  const adaptersRef = useRef(adapters);
  useEffect(() => {
    adaptersRef.current = adapters;
  });
  const [initialForm] = useState(() => workoutForm.createWorkoutForm(initialDraft));
  const [form, setForm] = useState(initialForm);
  const isEditMode = workoutId !== undefined;

  // A missing adapter is a wiring bug, so it throws before the try instead of becoming a toast.
  const startSave = (name: string, days: DraftWorkoutDay[]): Promise<unknown> => {
    const { saveNew, saveUpdate } = adaptersRef.current;

    if (workoutId !== undefined) {
      if (!saveUpdate) {
        throw new Error("WorkoutFormAdapters.saveUpdate is required to edit a workout");
      }
      return saveUpdate(workoutId, name, form.settings, days);
    }

    if (!saveNew) {
      throw new Error("WorkoutFormAdapters.saveNew is required to create a workout");
    }
    return saveNew(name, form.settings, days);
  };

  const save = async () => {
    const saveCheck = workoutForm.checkBeforeSave(form);

    if (!saveCheck.isValid) {
      setForm(saveCheck.form);
      return;
    }

    const request = startSave(saveCheck.name, saveCheck.days);
    setForm((current) => ({
      ...current,
      isSaving: true,
      nameError: null,
      formError: null,
    }));

    try {
      await request;
      toast.success("Scheda salvata");
      setLocation(adaptersRef.current.successPath);
    } catch (err) {
      setForm((current) => ({ ...current, isSaving: false }));
      toast.error(ApiError.messageFrom(err, "Impossibile salvare la scheda"));
    }
  };

  const addExercise = (input: NewExerciseInput): boolean => {
    const inputError = workoutForm.findExerciseInputError(input);

    if (inputError) {
      setForm((current) => ({ ...current, formError: inputError }));
      return false;
    }

    const exerciseClientId = crypto.randomUUID();
    setForm((current) => workoutForm.addExercise(current, input, exerciseClientId));
    return true;
  };

  const updateExercise = (exerciseClientId: string, input: NewExerciseInput): boolean => {
    const inputError = workoutForm.findExerciseInputError(input);

    if (inputError) {
      setForm((current) => ({ ...current, formError: inputError }));
      return false;
    }

    setForm((current) => workoutForm.updateExercise(current, exerciseClientId, input));
    return true;
  };

  const addDay = () => {
    const dayClientId = crypto.randomUUID();
    setForm((current) => workoutForm.addDay(current, dayClientId));
  };

  return {
    name: form.name,
    setName: (name: string) => setForm((current) => ({ ...current, name })),
    days: form.days,
    activeDay: workoutForm.findActiveDay(form),
    activeDayId: form.activeDayId,
    setActiveDayId: (activeDayId: string) =>
      setForm((current) => ({ ...current, activeDayId })),
    setActiveDayName: (name: string) =>
      setForm((current) => workoutForm.renameActiveDay(current, name)),
    addDay,
    moveActiveDay: (direction: workoutForm.MoveDirection) =>
      setForm((current) => workoutForm.moveActiveDay(current, direction)),
    duplicateActiveDay: () =>
      setForm((current) =>
        workoutForm.duplicateActiveDay(current, () => crypto.randomUUID()),
      ),
    removeDay: (dayClientId: string) =>
      setForm((current) => workoutForm.removeDay(current, dayClientId)),
    toggleWeekday: (weekday: Weekday) =>
      setForm((current) => workoutForm.toggleWeekday(current, weekday)),
    addExercise,
    updateExercise,
    moveExercise: (exerciseClientId: string, direction: workoutForm.MoveDirection) =>
      setForm((current) => workoutForm.moveExercise(current, exerciseClientId, direction)),
    removeExercise: (exerciseClientId: string) =>
      setForm((current) => workoutForm.removeExercise(current, exerciseClientId)),
    settings: form.settings,
    setSettings: (settings: WorkoutSettings) =>
      setForm((current) => ({ ...current, settings })),
    nameError: form.nameError,
    formError: form.formError,
    save,
    applyDraft: (draft: WorkoutDraftSeed) => setForm(workoutForm.createWorkoutForm(draft)),
    isSaving: form.isSaving,
    hasUnsavedChanges: workoutForm.hasUnsavedChanges(form, initialForm),
    isEditMode,
  };
}
