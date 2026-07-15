import { useState } from "react";
import { deleteScheduleOverride, setScheduleOverride } from "@api";

type UseScheduleOverrideResult = {
  isSaving: boolean;
  error: string | null;
  setDayOverride: (
    workoutId: number,
    dateKey: string,
    workoutDayId: number,
  ) => Promise<void>;
  clearDayOverride: (workoutId: number, dateKey: string) => Promise<void>;
};

export function useScheduleOverride(
  onSuccess: () => void,
): UseScheduleOverrideResult {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setDayOverride = async (
    workoutId: number,
    dateKey: string,
    workoutDayId: number,
  ) => {
    setIsSaving(true);
    setError(null);

    try {
      await setScheduleOverride(workoutId, {
        scheduledDate: dateKey,
        workoutDayId,
      });
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossibile aggiornare il programma",
      );
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const clearDayOverride = async (workoutId: number, dateKey: string) => {
    setIsSaving(true);
    setError(null);

    try {
      await deleteScheduleOverride(workoutId, dateKey);
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Impossibile ripristinare il programma",
      );
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return { isSaving, error, setDayOverride, clearDayOverride };
}
